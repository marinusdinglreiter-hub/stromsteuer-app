/**
 * Folgejahre (TODO 2.3): Antrag aus dem Vorjahr heraus starten und die
 * Januar-Erinnerung an Bestandskunden.
 */
import { randomBytes } from "node:crypto";

import { istJanuar, pruefeFolgejahr, type FolgejahrErgebnis } from "@stromsteuer/antrag";
import { prisma, type AntragStatus, type Prisma } from "@stromsteuer/db";
import { TRPCError } from "@trpc/server";

import { logAudit, tryLogAudit } from "./audit";
import { sendMail } from "./email/client";
import { renderFolgejahrErinnerung } from "./email/folgejahr-templates";
import { env } from "./env";
import { logMailAnKunde } from "./kontakt-service";
import { datumDe, type BrandInfo } from "./portal-service";

/** Wie lange ein neuer Antrags-Datensatz lebt (gleiche Frist wie beim ersten Antrag). */
const ANTRAG_TTL_DAYS = 30;

const EINGEREICHT: AntragStatus[] = ["SUBMITTED", "APPROVED", "PAID"];

type Db = typeof prisma | Prisma.TransactionClient;

/** Verbrauchsjahre, fuer die der Mandant schon einen nicht abgelaufenen Antrag hat. */
async function vorhandeneJahre(mandantId: string, db: Db = prisma): Promise<number[]> {
  const antraege = await db.antrag.findMany({
    where: { mandantId, status: { not: "EXPIRED" }, antragsjahr: { not: null } },
    select: { antragsjahr: true },
  });
  return antraege.map((a) => a.antragsjahr!).filter((j) => j !== null);
}

/** Darf der Antrag mit diesem Token ein Folgejahr starten? */
export async function folgejahrAngebot(token: string, jetzt: Date = new Date()): Promise<FolgejahrErgebnis> {
  const antrag = await prisma.antrag.findUnique({
    where: { sessionToken: token },
    select: { antragsjahr: true, status: true, mandantId: true },
  });
  if (!antrag) throw new TRPCError({ code: "NOT_FOUND", message: "Antrag nicht gefunden." });
  if (!antrag.mandantId) return { moeglich: false, jahr: null, grund: "vorjahr-nicht-eingereicht" };
  return pruefeFolgejahr({
    vorjahr: { antragsjahr: antrag.antragsjahr, status: antrag.status },
    vorhandeneJahre: await vorhandeneJahre(antrag.mandantId),
    jetzt,
  });
}

/**
 * Legt den Antrag fuer das Folgejahr an. Uebernommen werden Mandant (und damit
 * Stammdaten und Portal-Vollmacht) sowie die Lieferstellen mit Adresse, aber
 * ohne Mengen und Belege. Erklaerungen, Beihilfe-Selbsterklaerung und
 * Unterschriften beginnen leer: Das sind Erklaerungen je Verbrauchsjahr.
 */
export async function starteFolgejahr(
  token: string,
  kontext: { ip: string | null; userAgent: string | null },
  jetzt: Date = new Date(),
): Promise<{ sessionToken: string; antragId: string; jahr: number }> {
  const vorjahr = await prisma.antrag.findUnique({
    where: { sessionToken: token },
    include: { lieferstellen: true },
  });
  if (!vorjahr) throw new TRPCError({ code: "NOT_FOUND", message: "Antrag nicht gefunden." });
  const angebot = await folgejahrAngebot(token, jetzt);
  if (!angebot.moeglich) {
    const text: Record<typeof angebot.grund, string> = {
      "vorjahr-nicht-eingereicht": "Ein Folgejahr ist erst möglich, wenn der Antrag eingereicht wurde.",
      "jahr-nicht-abgeschlossen": "Das nächste Verbrauchsjahr ist noch nicht abgeschlossen.",
      "antrag-existiert": "Für dieses Verbrauchsjahr gibt es bereits einen Antrag.",
      "stichtag-verstrichen": "Für dieses Verbrauchsjahr ist der späteste Start verstrichen. Bitte melden Sie sich bei uns.",
    };
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: text[angebot.grund] });
  }

  const sessionToken = randomBytes(32).toString("base64url");
  const neu = await prisma.$transaction(async (tx) => {
    // Gleichzeitige Starts (Doppelklick, zwei Tabs) hintereinander abarbeiten: Mandanten-Zeile
    // sperren und die vorhandenen Jahre erst danach pruefen. Es gibt keinen Unique-Constraint
    // auf (Mandant, Jahr), weil abgelaufene Entwuerfe dasselbe Jahr haben duerfen.
    if (vorjahr.mandantId) {
      await tx.$queryRaw`SELECT "id" FROM "Mandant" WHERE "id" = ${vorjahr.mandantId} FOR UPDATE`;
      if ((await vorhandeneJahre(vorjahr.mandantId, tx)).includes(angebot.jahr)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Für dieses Verbrauchsjahr gibt es bereits einen Antrag.",
        });
      }
    }
    const antrag = await tx.antrag.create({
      data: {
        sessionToken,
        expiresAt: new Date(jetzt.getTime() + ANTRAG_TTL_DAYS * 24 * 60 * 60 * 1000),
        mandantId: vorjahr.mandantId,
        antragsjahr: angebot.jahr,
        branche: vorjahr.branche,
        geschaetzteKwh: vorjahr.bruttoKwh ?? vorjahr.geschaetzteKwh,
        entlastungsabschnitt: vorjahr.entlastungsabschnitt,
        istFolgejahr: true,
        lieferstellen: {
          create: vorjahr.lieferstellen.map((l) => ({
            firmenname: l.firmenname,
            adresse: l.adresse,
            plz: l.plz,
            hza: l.hza,
            versorger: l.versorger,
            kwhEigenbetrieblich: 0,
            belegFileKeys: [],
          })),
        },
      },
    });
    await logAudit(
      {
        antragId: antrag.id,
        type: "FOLGEJAHR_GESTARTET",
        actor: "CUSTOMER",
        ip: kontext.ip,
        userAgent: kontext.userAgent,
        metadata: { vorjahrAntragId: vorjahr.id, antragsjahr: angebot.jahr, lieferstellen: vorjahr.lieferstellen.length },
      },
      tx,
    );
    return antrag;
  });
  return { sessionToken, antragId: neu.id, jahr: angebot.jahr };
}

export type FolgejahrStatistik = { geprueft: number; gesendet: number; ohneEmail: number; fehlgeschlagen: number };

/**
 * Januar-Erinnerung: Bestandskunden, deren Vorjahres-Antrag eingereicht wurde
 * und fuer die das neue Verbrauchsjahr jetzt antragsfaehig ist, bekommen
 * einmal eine Mail mit dem Start-Link. Ausserhalb des Januars passiert nichts.
 */
export async function sendeFolgejahrErinnerungen(
  brand: BrandInfo,
  jetzt: Date = new Date(),
): Promise<FolgejahrStatistik> {
  const stats: FolgejahrStatistik = { geprueft: 0, gesendet: 0, ohneEmail: 0, fehlgeschlagen: 0 };
  if (!istJanuar(jetzt)) return stats;

  const mandanten = await prisma.mandant.findMany({
    where: { antraege: { some: { status: { in: EINGEREICHT } } } },
    select: {
      id: true,
      email: true,
      vorname: true,
      nachname: true,
      geschaeftsfuehrer: true,
      folgejahrErinnertFuer: true,
      antraege: {
        where: { status: { not: "EXPIRED" } },
        select: { id: true, sessionToken: true, antragsjahr: true, status: true },
        orderBy: { antragsjahr: "desc" },
      },
    },
  });

  for (const m of mandanten) {
    stats.geprueft++;
    const juengster = m.antraege.find((a) => EINGEREICHT.includes(a.status) && a.antragsjahr !== null);
    if (!juengster) continue;
    const angebot = pruefeFolgejahr({
      vorjahr: { antragsjahr: juengster.antragsjahr, status: juengster.status },
      vorhandeneJahre: m.antraege.map((a) => a.antragsjahr).filter((j): j is number => j !== null),
      jetzt,
    });
    if (!angebot.moeglich || m.folgejahrErinnertFuer === angebot.jahr) continue;
    if (!m.email) {
      stats.ohneEmail++;
      continue;
    }

    const mail = renderFolgejahrErinnerung({
      brand: { name: brand.name, shortName: brand.shortName },
      ansprechpartner: [m.vorname, m.nachname].filter(Boolean).join(" ") || m.geschaeftsfuehrer || null,
      kanzleiName: brand.kanzleiName,
      jahr: angebot.jahr,
      statusUrl: `${env().APP_BASE_URL}/status/${juengster.sessionToken}`,
      fristDatum: datumDe(angebot.jahr + 1, 12, 31),
    });
    const res = await sendMail({
      to: m.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: env().KANZLEI_EMAIL_INBOX,
    });
    if (!res.ok) {
      stats.fehlgeschlagen++;
      continue;
    }
    await prisma.mandant.update({ where: { id: m.id }, data: { folgejahrErinnertFuer: angebot.jahr } });
    await logMailAnKunde(m.id, juengster.id, mail.subject);
    await tryLogAudit({
      antragId: juengster.id,
      type: "FOLGEJAHR_ERINNERUNG",
      actor: "SYSTEM",
      metadata: { jahr: angebot.jahr },
    });
    stats.gesendet++;
  }
  return stats;
}
