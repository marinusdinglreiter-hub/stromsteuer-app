/**
 * Integrationstest gegen eine echte Datenbank (Portal-Onboarding, Folgejahre,
 * Kontakthistorie). Laeuft nur mit `RUN_DB_TESTS=1` und einer erreichbaren
 * DATABASE_URL, sonst wird er uebersprungen (CI hat keine Datenbank):
 *
 *   RUN_DB_TESTS=1 PORTAL_CODE_SECRET=test-geheimnis-123456 pnpm --filter @stromsteuer/api test
 *
 * Der Test legt seine eigenen Testdaten an (Mandant "INTEGRATIONSTEST") und fasst keine
 * anderen Kunden an. Mails sind gemockt. Aufraeumen: Mandant loeschen, Antraege auf
 * EXPIRED setzen (Audit-Eintraege sind unveraenderlich, die Antraege bleiben deshalb stehen).
 */
import { randomBytes } from "node:crypto";

import { prisma } from "@stromsteuer/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const gesendet: { to: string; subject: string }[] = [];
vi.mock("./email/client", () => ({
  sendMail: vi.fn(async (m: { to: string; subject: string }) => {
    gesendet.push({ to: m.to, subject: m.subject });
    return { ok: true, id: "test" };
  }),
}));

import { sendeFolgejahrErinnerungen, starteFolgejahr } from "./folgejahr-service";
import { sendeErinnerungen } from "./portal-service";
import { appRouter } from "./router";

const LAEUFT = process.env.RUN_DB_TESTS === "1";
const BRAND = { name: "Test", shortName: "Test", kanzleiName: "[KANZLEI]" };
const TAG = 86_400_000;

const admin = () =>
  appRouter.createCaller({ sessionToken: null, application: null, ip: null, userAgent: "test", isAdmin: true });
const kunde = () =>
  appRouter.createCaller({ sessionToken: null, application: null, ip: null, userAgent: "test", isAdmin: false });

describe.skipIf(!LAEUFT)("Datenbank-Integration", () => {
  let mandantId: string;
  let antragId: string;
  let token: string;
  const alleAntraege: string[] = [];

  beforeAll(async () => {
    if (!process.env.PORTAL_CODE_SECRET) process.env.PORTAL_CODE_SECRET = "test-geheimnis-123456";
    const mandant = await prisma.mandant.create({
      data: { firmenname: "INTEGRATIONSTEST GmbH", email: "integration@example.invalid", vorname: "Test", nachname: "Person" },
    });
    mandantId = mandant.id;
    token = randomBytes(24).toString("base64url");
    const antrag = await prisma.antrag.create({
      data: {
        sessionToken: token,
        expiresAt: new Date(Date.now() + 30 * TAG),
        mandantId,
        antragsjahr: 2025,
        status: "PENDING_REVIEW",
        aufbereitungSignedAt: new Date(),
        kanzleimandatSignedAt: new Date(Date.now() - 11 * TAG),
        lieferstellen: { create: { firmenname: "Werk", adresse: "Teststr. 1", kwhEigenbetrieblich: 200_000, belegFileKeys: [] } },
      },
    });
    antragId = antrag.id;
    alleAntraege.push(antragId);
  });

  afterAll(async () => {
    if (!mandantId) return;
    await prisma.antrag.updateMany({ where: { id: { in: alleAntraege } }, data: { status: "EXPIRED" } });
    await prisma.antrag.updateMany({ where: { mandantId }, data: { status: "EXPIRED" } });
    await prisma.mandant.delete({ where: { id: mandantId } });
  });

  it("Zugangscode: verschluesselt, nicht im Audit-Log, Kanzlei loest ein", async () => {
    const k = kunde();
    expect(await k.portal.get({ token })).toMatchObject({ phase: "ELSTER_OFFEN", portalProzent: 0 });

    expect((await k.portal.setElster({ token, status: "FEHLT" })).phase).toBe("WARTET_AUF_POST");
    expect((await prisma.portalZugang.findUniqueOrThrow({ where: { mandantId } })).pausiertSeit).not.toBeNull();
    expect((await k.portal.setElster({ token, status: "VORHANDEN" })).phase).toBe("PORTAL_OFFEN");

    await k.portal.setSchritt({ token, schritt: 1, erledigt: true });
    await k.portal.setSchritt({ token, schritt: 2, erledigt: true });
    expect((await k.portal.setSchritt({ token, schritt: 3, erledigt: true })).phase).toBe("PORTAL_REGISTRIERT");

    await expect(k.portal.codeEinreichen({ token, code: "ab", beteiligtenNummer: "123456" })).rejects.toThrow();
    expect(await k.portal.codeEinreichen({ token, code: "ZC-GEHEIM-1", beteiligtenNummer: "BN-4711" })).toMatchObject({
      phase: "VOLLMACHT_ERTEILT",
      codeEingegangen: true,
    });
    const z = await prisma.portalZugang.findUniqueOrThrow({ where: { mandantId } });
    expect(z.zugangscodeEnc).toBeTruthy();
    expect(z.zugangscodeEnc).not.toContain("GEHEIM");
    const audit = JSON.stringify(await prisma.auditEvent.findMany({ where: { antragId } }));
    expect(audit).not.toContain("ZC-GEHEIM");
    expect(audit).not.toContain("BN-4711");

    const c = admin();
    expect(await c.admin.zugangscodeAnzeigen({ id: antragId })).toMatchObject({ code: "ZC-GEHEIM-1", beteiligtenNummer: "BN-4711" });
    await c.admin.zugangscodeEingeloest({ id: antragId });
    expect(await prisma.portalZugang.findUniqueOrThrow({ where: { mandantId } })).toMatchObject({
      vollmachtStatus: "CODE_EINGELOEST",
      zugangscodeEnc: null,
    });
    await expect(c.admin.zugangscodeAnzeigen({ id: antragId })).rejects.toThrow(/Kein Zugangscode/);
  }, 60_000);

  it("aktiv: Pruefung nur bei der ersten Aktivierung, Nachweis bleibt bei Korrekturen", async () => {
    const c = admin();
    await expect(c.admin.setPortalVollmacht({ id: antragId, vollmachtStatus: "AKTIV" })).rejects.toThrow(/prüfen/);

    gesendet.length = 0;
    await c.admin.setPortalVollmacht({
      id: antragId,
      vollmachtStatus: "AKTIV",
      scopeGeprueft: true,
      bescheidZustellungAktiv: true,
      geprueftVon: "Mitarbeiter A",
      brand: BRAND,
    });
    expect(gesendet.map((m) => m.subject)).toEqual(["Vollmacht ist aktiv"]);
    const erst = await prisma.portalZugang.findUniqueOrThrow({ where: { mandantId } });
    expect(erst).toMatchObject({ vollmachtStatus: "AKTIV", scopeGeprueftVon: "Mitarbeiter A", bescheidZustellungAktiv: true });

    // Korrektur der Beteiligten-Nummer: keine neue Pruefung noetig, Nachweis und Mail bleiben
    gesendet.length = 0;
    await c.admin.setPortalVollmacht({
      id: antragId,
      vollmachtStatus: "AKTIV",
      beteiligtenNummer: "BN-0815",
      geprueftVon: "Mitarbeiterin B",
      brand: BRAND,
    });
    const danach = await prisma.portalZugang.findUniqueOrThrow({ where: { mandantId } });
    expect(danach.beteiligtenNummer).toBe("BN-0815");
    expect(danach.scopeGeprueftVon).toBe("Mitarbeiter A");
    expect(danach.scopeGeprueftAt).toEqual(erst.scopeGeprueftAt);
    expect(gesendet).toEqual([]);
  }, 60_000);

  it("Erinnerungen: Tag 11 -> Stufe 3, nur einmal, nicht nach eingereichtem Code", async () => {
    const setze = (data: Parameters<typeof prisma.portalZugang.update>[0]["data"]) =>
      prisma.portalZugang.update({ where: { mandantId }, data });
    await setze({ vollmachtStatus: "OFFEN", elsterStatus: "VORHANDEN", eskalationsstufe: 0, pausiertSeit: null, pausierteTage: 0 });

    gesendet.length = 0;
    const r1 = await sendeErinnerungen(BRAND, new Date(), [antragId]);
    expect(r1).toMatchObject({ gesendet: 1, anrufFaellig: 1 });
    expect(gesendet[0]!.subject).toContain("Frist 31. Dezember");
    expect((await sendeErinnerungen(BRAND, new Date(), [antragId])).gesendet).toBe(0);

    // Kunde hat den Code eingereicht: keine weitere Erinnerung, auch wenn Stufe 4 faellig waere
    await setze({ vollmachtStatus: "ERTEILT", eskalationsstufe: 0 });
    await prisma.antrag.update({ where: { id: antragId }, data: { kanzleimandatSignedAt: new Date(Date.now() - 20 * TAG) } });
    expect((await sendeErinnerungen(BRAND, new Date(), [antragId])).gesendet).toBe(0);

    // Wartezustand Post pausiert
    await setze({ vollmachtStatus: "OFFEN", elsterStatus: "BEANTRAGT", pausiertSeit: new Date(Date.now() - 20 * TAG) });
    expect((await sendeErinnerungen(BRAND, new Date(), [antragId])).gesendet).toBe(0);

    const mails = await prisma.kontakt.findMany({ where: { mandantId, automatisch: true, kanal: "EMAIL" } });
    expect(mails.some((k) => k.betreff.startsWith("Frist 31. Dezember"))).toBe(true);

    await prisma.antrag.update({ where: { id: antragId }, data: { status: "SUBMITTED", submittedAt: new Date() } });
  }, 60_000);

  it("Folgejahr: gleichzeitige Starts legen genau einen Antrag an, Kopie ohne Mengen", async () => {
    const januar = new Date("2027-01-15T10:00:00Z");
    const kontext = { ip: null, userAgent: "test" };
    const ergebnisse = await Promise.allSettled([
      starteFolgejahr(token, kontext, januar),
      starteFolgejahr(token, kontext, januar),
      starteFolgejahr(token, kontext, januar),
    ]);
    const ok = ergebnisse.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    expect(ergebnisse.filter((r) => r.status === "rejected")).toHaveLength(2);

    const neu = (ok[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof starteFolgejahr>>>).value;
    alleAntraege.push(neu.antragId);
    const antrag = await prisma.antrag.findUniqueOrThrow({ where: { id: neu.antragId }, include: { lieferstellen: true } });
    expect(antrag).toMatchObject({ mandantId, antragsjahr: 2026, istFolgejahr: true, status: "DRAFT", kanzleimandatSignedAt: null });
    expect(antrag.lieferstellen[0]).toMatchObject({ adresse: "Teststr. 1", kwhEigenbetrieblich: 0 });
    expect(await prisma.antrag.count({ where: { mandantId, antragsjahr: 2026, status: { not: "EXPIRED" } } })).toBe(1);

    // Januar-Erinnerung: gibt es schon einen Antrag fuers neue Jahr, wird nichts mehr verschickt
    gesendet.length = 0;
    await sendeFolgejahrErinnerungen(BRAND, januar);
    expect(gesendet.filter((m) => m.to === "integration@example.invalid")).toEqual([]);
  }, 60_000);

  it("Kontakthistorie: von Hand erfassen und lesen", async () => {
    const c = admin();
    await expect(c.admin.kontaktErfassen({ id: antragId, kanal: "TELEFON", richtung: "EINGEHEND", betreff: "x" })).rejects.toThrow();
    await c.admin.kontaktErfassen({ id: antragId, kanal: "TELEFON", richtung: "EINGEHEND", betreff: "Rückruf wegen Portal", text: "StB hat Zertifikat" });
    const liste = await c.admin.kontakte({ id: antragId });
    expect(liste.some((k) => k.betreff === "Rückruf wegen Portal" && !k.automatisch && k.erstelltVon === "Kanzlei")).toBe(true);
  }, 30_000);
});
