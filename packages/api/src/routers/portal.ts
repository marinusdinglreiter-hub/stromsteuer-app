/**
 * Kundenseite des Portal-Onboardings (TODO 2.1). Erreichbar ueber den
 * Magic-Link /status/<token>, kein Login. Der Token ist der sessionToken des
 * Antrags; jede Prozedur prueft ihn und dass beide Vertraege signiert sind.
 */
import {
  ANZAHL_SCHRITTE,
  datenFortschritt,
  pausenUpdate,
  portalFortschritt,
  portalPhase,
  stichtagsPruefung,
} from "@stromsteuer/antrag";
import { prisma, type Antrag, type PortalZugang } from "@stromsteuer/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { logAudit } from "../audit";
import { sendMail } from "../email/client";
import { env } from "../env";
import { encryptSecret } from "../secrets";
import { publicProcedure, router } from "../trpc";

const token = z.string().min(10).max(200);

type Kontext = {
  antrag: Antrag & { mandant: { id: string; firmenname: string; portalZugang: PortalZugang | null } | null };
  mandantId: string;
};

/** Antrag per Magic-Link-Token laden; nur nach Unterschrift ist das Onboarding offen. */
async function ladeKontext(sessionToken: string): Promise<Kontext> {
  const antrag = await prisma.antrag.findUnique({
    where: { sessionToken },
    include: { mandant: { select: { id: true, firmenname: true, portalZugang: true } } },
  });
  if (!antrag) throw new TRPCError({ code: "NOT_FOUND", message: "Antrag nicht gefunden." });
  if (!antrag.mandant || !antrag.kanzleimandatSignedAt || !antrag.aufbereitungSignedAt) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Der Portal-Zugang wird freigeschaltet, sobald beide Verträge unterschrieben sind.",
    });
  }
  return { antrag, mandantId: antrag.mandant.id };
}

function ansicht(k: Kontext) {
  const zugang = k.antrag.mandant?.portalZugang ?? null;
  const jahr = k.antrag.antragsjahr ?? new Date().getFullYear() - 1;
  const e = env();
  return {
    firmenname: k.antrag.mandant?.firmenname ?? "",
    antragsjahr: jahr,
    phase: portalPhase(zugang),
    datenProzent: datenFortschritt(true),
    portalProzent: portalFortschritt(zugang),
    elsterStatus: zugang?.elsterStatus ?? "UNBEKANNT",
    vollmachtStatus: zugang?.vollmachtStatus ?? "OFFEN",
    schritteErledigt: [...(zugang?.schritteErledigt ?? [])].sort((a, b) => a - b),
    codeEingegangen: Boolean(zugang?.zugangscodeEingegangenAt) && !zugang?.zugangscodeEingeloestAt,
    rueckrufAngefordert: Boolean(zugang?.rueckrufAngefordertAt),
    /** Nur wenn ein Schluessel konfiguriert ist, kann die App den Code entgegennehmen. */
    codeFormularVerfuegbar: Boolean(e.PORTAL_CODE_SECRET),
    terminUrl: e.TERMIN_URL ?? null,
    stichtag: stichtagsPruefung(jahr, new Date(), zugang?.elsterStatus ?? "UNBEKANNT"),
  };
}

async function benachrichtigeKanzlei(betreff: string, text: string): Promise<void> {
  try {
    await sendMail({
      to: env().KANZLEI_EMAIL_INBOX,
      subject: betreff,
      html: `<p>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`,
      text,
    });
  } catch (err) {
    console.warn("[portal] Benachrichtigung an die Kanzlei fehlgeschlagen:", err);
  }
}

export const portalRouter = router({
  /** Zustand fuer die Status-Seite; null, solange die Vertraege nicht signiert sind. */
  get: publicProcedure.input(z.object({ token })).query(async ({ input }) => {
    try {
      return ansicht(await ladeKontext(input.token));
    } catch (err) {
      if (err instanceof TRPCError && err.code === "PRECONDITION_FAILED") return null;
      throw err;
    }
  }),

  /** Erste Frage im Flow: ELSTER-Zertifikat im Haus, beim Steuerberater oder nicht vorhanden. */
  setElster: publicProcedure
    .input(z.object({ token, status: z.enum(["VORHANDEN", "BEIM_STB", "FEHLT", "BEANTRAGT"]) }))
    .mutation(async ({ input }) => {
      const k = await ladeKontext(input.token);
      const alt = k.antrag.mandant?.portalZugang;
      const jetzt = new Date();
      const pause = pausenUpdate(
        alt?.elsterStatus ?? "UNBEKANNT",
        input.status,
        jetzt,
        alt?.pausiertSeit ?? null,
        alt?.pausierteTage ?? 0,
      );
      await prisma.$transaction(async (tx) => {
        await tx.portalZugang.upsert({
          where: { mandantId: k.mandantId },
          create: { mandantId: k.mandantId, elsterStatus: input.status, ...pause },
          update: { elsterStatus: input.status, ...pause },
        });
        await logAudit(
          {
            antragId: k.antrag.id,
            type: "PORTAL_ZUGANG_GEAENDERT",
            actor: "CUSTOMER",
            metadata: { elsterStatus: input.status },
          },
          tx,
        );
      });
      return ansicht(await ladeKontext(input.token));
    }),

  /** Schritt der Anleitung abhaken (Selbstauskunft). Schritte 1 bis 3 ergeben "im Portal registriert". */
  setSchritt: publicProcedure
    .input(z.object({ token, schritt: z.number().int().min(1).max(ANZAHL_SCHRITTE), erledigt: z.boolean() }))
    .mutation(async ({ input }) => {
      const k = await ladeKontext(input.token);
      const alt = new Set(k.antrag.mandant?.portalZugang?.schritteErledigt ?? []);
      if (input.erledigt) alt.add(input.schritt);
      else alt.delete(input.schritt);
      const schritte = [...alt].sort((a, b) => a - b);
      const registriert = [1, 2, 3].every((s) => alt.has(s));
      await prisma.portalZugang.upsert({
        where: { mandantId: k.mandantId },
        create: {
          mandantId: k.mandantId,
          schritteErledigt: schritte,
          portalKontoStatus: registriert ? "REGISTRIERT" : "OFFEN",
        },
        update: { schritteErledigt: schritte, portalKontoStatus: registriert ? "REGISTRIERT" : "OFFEN" },
      });
      return ansicht(await ladeKontext(input.token));
    }),

  /**
   * Zugangscode und Beteiligten-Nummer entgegennehmen. Der Code wird
   * verschluesselt abgelegt und nach dem Einloesen durch die Kanzlei
   * geloescht; er taucht weder im Audit-Log noch in Mails auf.
   */
  codeEinreichen: publicProcedure
    .input(
      z.object({
        token,
        code: z.string().trim().min(4, "Der Zugangscode ist zu kurz.").max(64),
        beteiligtenNummer: z.string().trim().min(3, "Bitte die Beteiligten-Nummer eintragen.").max(40),
      }),
    )
    .mutation(async ({ input }) => {
      const secret = env().PORTAL_CODE_SECRET;
      if (!secret) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Die Eingabe des Zugangscodes ist hier noch nicht freigeschaltet. Bitte schicken Sie ihn der Kanzlei.",
        });
      }
      const k = await ladeKontext(input.token);
      const aktuell = k.antrag.mandant?.portalZugang?.vollmachtStatus ?? "OFFEN";
      if (aktuell === "CODE_EINGELOEST" || aktuell === "AKTIV") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Die Vollmacht ist bereits eingelöst." });
      }

      const jetzt = new Date();
      const schritte = [
        ...new Set([...(k.antrag.mandant?.portalZugang?.schritteErledigt ?? []), 1, 2, 3, 4, 5]),
      ].sort((a, b) => a - b);
      const daten = {
        zugangscodeEnc: encryptSecret(input.code, secret),
        zugangscodeEingegangenAt: jetzt,
        beteiligtenNummer: input.beteiligtenNummer,
        vollmachtStatus: "ERTEILT" as const,
        portalKontoStatus: "REGISTRIERT" as const,
        schritteErledigt: schritte,
      };
      await prisma.$transaction(async (tx) => {
        await tx.portalZugang.upsert({
          where: { mandantId: k.mandantId },
          create: { mandantId: k.mandantId, ...daten },
          update: daten,
        });
        await logAudit(
          {
            antragId: k.antrag.id,
            type: "PORTAL_CODE_EINGEGANGEN",
            actor: "CUSTOMER",
            // Bewusst ohne Code und ohne Beteiligten-Nummer.
            metadata: { vollmachtStatus: "ERTEILT" },
          },
          tx,
        );
      });
      await benachrichtigeKanzlei(
        `Zugangscode eingegangen: ${k.antrag.mandant?.firmenname ?? ""}`,
        `Der Kunde hat den Zugangscode für das Zoll-Portal eingegeben. Bitte im Backoffice einlösen und die Vollmacht prüfen:\n${env().APP_BASE_URL}/admin/${k.antrag.id}`,
      );
      return ansicht(await ladeKontext(input.token));
    }),

  /** "Ruft mich an": Kunde bittet um Rueckruf; die Kanzlei bekommt eine Mail. */
  rueckrufAnfordern: publicProcedure.input(z.object({ token })).mutation(async ({ input }) => {
    const k = await ladeKontext(input.token);
    const jetzt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.portalZugang.upsert({
        where: { mandantId: k.mandantId },
        create: { mandantId: k.mandantId, rueckrufAngefordertAt: jetzt },
        update: { rueckrufAngefordertAt: jetzt },
      });
      await logAudit({ antragId: k.antrag.id, type: "PORTAL_RUECKRUF", actor: "CUSTOMER" }, tx);
    });
    await benachrichtigeKanzlei(
      `Rückruf gewünscht: ${k.antrag.mandant?.firmenname ?? ""}`,
      `Der Kunde bittet um einen Rückruf zum Portal-Zugang.\n${env().APP_BASE_URL}/admin/${k.antrag.id}`,
    );
    return ansicht(await ladeKontext(input.token));
  }),
});
