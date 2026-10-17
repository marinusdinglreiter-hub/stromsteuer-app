import {
  istEinreichbar,
  pausenUpdate,
  pruefeLieferstelle,
  pruefeVollstaendigkeit,
} from "@stromsteuer/antrag";
import { prisma } from "@stromsteuer/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { berechneAntrag, ladeAntrag } from "../antrag-service";
import { logAudit, tryLogAudit } from "../audit";
import { STROMSTEUER_REGELSATZ_EUR_PRO_MWH } from "../calc/rates";
import { sendMail } from "../email/client";
import { renderVollmachtAktiv } from "../email/portal-templates";
import { datensatzFuer } from "../forms/datenblatt";
import { portalMailInput, sendeErinnerungen } from "../portal-service";
import { decryptSecret } from "../secrets";
import {
  renderStatusApproved,
  renderStatusPaid,
  renderStatusRejected,
  renderStatusSubmitted,
} from "../email/status-templates";
import { env } from "../env";
import {
  deleteBelege,
  deleteGenerated,
  getBelegDownloadUrl,
  getGeneratedDownloadUrl,
} from "../storage/supabase";
import { adminProcedure, router } from "../trpc";

const APP_STATUSES = [
  "DRAFT",
  "SIGNED",
  "PENDING_REVIEW",
  "SUBMITTED",
  "APPROVED",
  "PAID",
  "REJECTED",
  "EXPIRED",
] as const;

export const adminRouter = router({
  /** Liste aller Antraege fuer das Backoffice (optional gefiltert). */
  list: adminProcedure
    .input(
      z
        .object({
          status: z.enum(APP_STATUSES).optional(),
        })
        .optional(),
    )
    .query(({ input }) => {
      return prisma.antrag.findMany({
        where: input?.status ? { status: input.status } : undefined,
        orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          status: true,
          antragsjahr: true,
          bruttoErstattung: true,
          preisEur: true,
          hzaAmount: true,
          submittedAt: true,
          kanzleimandatSignedAt: true,
          hzaDecisionAt: true,
          payoutAt: true,
          nutzenergieAnDritteWeitergegeben: true,
          mandant: { select: { firmenname: true, email: true } },
        },
      });
    }),

  /** Anzahl der Antraege je Status, fuer die Filterleiste im Eingang. */
  counts: adminProcedure.query(async () => {
    const rows = await prisma.antrag.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const counts = Object.fromEntries(APP_STATUSES.map((s) => [s, 0])) as Record<
      (typeof APP_STATUSES)[number],
      number
    >;
    for (const row of rows) counts[row.status] = row._count._all;
    return counts;
  }),

  /**
   * Voller Datensatz inkl. Mandant, Lieferstellen, Vollstaendigkeit und
   * Signed-URLs auf Kanzlei-Paket und beide Vertraege.
   */
  get: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const antrag = await ladeAntrag(input.id);

      const signedUrl = async (key: string | null, label: string) => {
        if (!key) return null;
        try {
          return await getGeneratedDownloadUrl(key, 60 * 60);
        } catch (err) {
          console.warn(`[admin.get] ${label} signed-url fehlgeschlagen:`, err);
          return null;
        }
      };
      const [kanzleiPaketUrl, aufbereitungPdfUrl, kanzleimandatPdfUrl] = await Promise.all([
        signedUrl(antrag.kanzleiPaketKey, "paket"),
        signedUrl(antrag.aufbereitungPdfKey, "aufbereitung"),
        signedUrl(antrag.kanzleimandatPdfKey, "kanzleimandat"),
      ]);
      // Belege mit Link (1 h) und Pruefhinweisen je Lieferstelle.
      const belegUrl = async (key: string) => {
        try {
          return await getBelegDownloadUrl(key, 60 * 60);
        } catch (err) {
          console.warn("[admin.get] beleg signed-url fehlgeschlagen:", err);
          return null;
        }
      };
      const lieferstellen = await Promise.all(
        antrag.lieferstellen.map(async (l) => ({
          ...l,
          hinweise: pruefeLieferstelle(l, {
            antragsjahr: antrag.antragsjahr,
            regelsatzEurProMwh: STROMSTEUER_REGELSATZ_EUR_PRO_MWH,
          }),
          belege: await Promise.all(
            l.belege.map(async (b) => ({
              ...b,
              stromsteuerEur: b.stromsteuerEur === null ? null : Number(b.stromsteuerEur),
              url: await belegUrl(b.storageKey),
            })),
          ),
          // Belege aus der Zeit vor dem Beleg-Modell: nur die Datei
          ohneWerte: await Promise.all(
            l.belegFileKeys
              .filter((key) => !l.belege.some((b) => b.storageKey === key))
              .map(async (key) => ({ key, url: await belegUrl(key) })),
          ),
        })),
      );
      return {
        ...antrag,
        lieferstellen,
        berechnung: berechneAntrag(antrag),
        fehlend: pruefeVollstaendigkeit(antrag, "einreichung"),
        kanzleiPaketUrl,
        aufbereitungPdfUrl,
        kanzleimandatPdfUrl,
      };
    }),

  /**
   * Portal-Eingabeblatt: alle Felder in der Reihenfolge von Formular 1453 mit
   * Herkunft, OCR-Konfidenz und Abhak-Stand, dazu Links auf die Belege.
   */
  portalBlatt: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const antrag = await ladeAntrag(input.id);
      const datensatz = datensatzFuer(antrag);
      const erledigt = await prisma.portalFeld.findMany({ where: { antragId: input.id } });
      const erledigtMap = new Map(erledigt.map((e) => [e.feldKey, e]));

      const belege = await Promise.all(
        antrag.lieferstellen.flatMap((l, i) =>
          l.belege.map(async (b) => {
            let url: string | null = null;
            try {
              url = await getBelegDownloadUrl(b.storageKey, 60 * 60);
            } catch (err) {
              console.warn("[admin.portalBlatt] beleg signed-url fehlgeschlagen:", err);
            }
            return {
              id: b.id,
              lieferstelleNr: i + 1,
              dateiname: b.dateiname,
              url,
              istPdf: b.dateiname.toLowerCase().endsWith(".pdf"),
            };
          }),
        ),
      );

      return {
        antragId: antrag.id,
        firmenname: antrag.mandant?.firmenname ?? null,
        antragsjahr: antrag.antragsjahr,
        status: antrag.status,
        eingangsnummer: antrag.eingangsnummer,
        vollmachtStatus: antrag.mandant?.portalZugang?.vollmachtStatus ?? "OFFEN",
        felder: datensatz.felder.map((f) => ({
          ...f,
          erledigtAt: erledigtMap.get(f.key)?.erledigtAt ?? null,
          erledigtVon: erledigtMap.get(f.key)?.erledigtVon ?? null,
        })),
        fehlend: pruefeVollstaendigkeit(antrag, "einreichung"),
        belege,
      };
    }),

  /** Ein Feld im Portal-Eingabeblatt abhaken oder wieder oeffnen. */
  setPortalFeld: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        feldKey: z.string().min(1).max(80),
        erledigt: z.boolean(),
        von: z.string().max(120).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const antrag = await ladeAntrag(input.id);
      const gueltig = datensatzFuer(antrag).felder.some((f) => f.key === input.feldKey);
      if (!gueltig) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unbekanntes Feld." });
      }
      await prisma.$transaction(async (tx) => {
        if (input.erledigt) {
          await tx.portalFeld.upsert({
            where: { antragId_feldKey: { antragId: input.id, feldKey: input.feldKey } },
            create: { antragId: input.id, feldKey: input.feldKey, erledigtVon: input.von ?? "Kanzlei" },
            update: {},
          });
        } else {
          await tx.portalFeld.deleteMany({ where: { antragId: input.id, feldKey: input.feldKey } });
        }
        await logAudit(
          {
            antragId: input.id,
            type: "PORTAL_FELD_ERLEDIGT",
            actor: "KANZLEI",
            metadata: { feldKey: input.feldKey, erledigt: input.erledigt },
          },
          tx,
        );
      });
      return { ok: true };
    }),

  /**
   * Portal-Zugang des Mandanten pflegen (Vollmacht im Zoll-Portal). Ohne
   * aktive Vollmacht kann die Kanzlei nicht einreichen. "Aktiv" setzt die
   * Pruefung voraus, dass die Vollmacht auf "Sonstige steuerliche Antraege"
   * lautet und die digitale Bescheidbereitstellung aktiv ist; erst dann
   * schaltet die Kundenseite auf fertig und die Bestaetigungsmail geht raus.
   */
  setPortalVollmacht: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        vollmachtStatus: z.enum([
          "OFFEN",
          "ERTEILT",
          "CODE_EINGELOEST",
          "AKTIV",
          "ABGELAUFEN",
          "SCOPE_FALSCH",
        ]),
        elsterStatus: z.enum(["UNBEKANNT", "VORHANDEN", "BEIM_STB", "FEHLT", "BEANTRAGT"]).optional(),
        beteiligtenNummer: z.string().max(40).optional(),
        geprueftVon: z.string().max(120).optional(),
        /** Pflicht fuer "aktiv": Dienstleistung ist "Sonstige steuerliche Antraege" */
        scopeGeprueft: z.boolean().optional(),
        /** Pflicht fuer "aktiv": digitale Bescheidbereitstellung ist aktiv */
        bescheidZustellungAktiv: z.boolean().optional(),
        /** Fuer die Bestaetigungsmail an den Kunden */
        brand: z
          .object({ name: z.string().min(1), shortName: z.string().min(1), kanzleiName: z.string().min(1) })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const antrag = await prisma.antrag.findUnique({
        where: { id: input.id },
        select: { mandantId: true, mandant: { select: { portalZugang: true } } },
      });
      if (!antrag?.mandantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Antrag hat noch keinen Mandanten." });
      }
      const alt = antrag.mandant?.portalZugang ?? null;
      const aktiv = input.vollmachtStatus === "AKTIV";
      if (aktiv && !(input.scopeGeprueft && input.bescheidZustellungAktiv)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Vor „aktiv“ bitte prüfen: Dienstleistung „Sonstige steuerliche Anträge“ und digitale Bescheidbereitstellung.",
        });
      }

      const jetzt = new Date();
      const pause = input.elsterStatus
        ? pausenUpdate(
            alt?.elsterStatus ?? "UNBEKANNT",
            input.elsterStatus,
            jetzt,
            alt?.pausiertSeit ?? null,
            alt?.pausierteTage ?? 0,
          )
        : {};
      // Der Zugangscode wird nur bis zum Einloesen gebraucht.
      const codeWeg = input.vollmachtStatus === "CODE_EINGELOEST" || aktiv;
      const data = {
        vollmachtStatus: input.vollmachtStatus,
        ...(input.elsterStatus ? { elsterStatus: input.elsterStatus } : {}),
        ...pause,
        ...(input.beteiligtenNummer ? { beteiligtenNummer: input.beteiligtenNummer } : {}),
        ...(codeWeg ? { zugangscodeEnc: null } : {}),
        ...(input.vollmachtStatus === "CODE_EINGELOEST" && !alt?.zugangscodeEingeloestAt
          ? { zugangscodeEingeloestAt: jetzt }
          : {}),
        ...(aktiv
          ? {
              scopeGeprueftAt: jetzt,
              scopeGeprueftVon: input.geprueftVon ?? "Kanzlei",
              bescheidZustellungAktiv: true,
            }
          : {}),
      };
      const zugang = await prisma.portalZugang.upsert({
        where: { mandantId: antrag.mandantId },
        create: { mandantId: antrag.mandantId, ...data },
        update: data,
      });
      await tryLogAudit({
        antragId: input.id,
        type: "STATUS_CHANGED",
        actor: "KANZLEI",
        metadata: {
          portalVollmacht: input.vollmachtStatus,
          ...(input.elsterStatus ? { elster: input.elsterStatus } : {}),
        },
      });

      // Wird aktiv: Kunde erfaehrt es (inkl. Hinweis auf die Bescheid-Zustellung).
      if (aktiv && alt?.vollmachtStatus !== "AKTIV" && input.brand) {
        const { input: mailInput, email } = await portalMailInput(input.id, input.brand);
        if (email) {
          const mail = renderVollmachtAktiv(mailInput);
          try {
            await sendMail({
              to: email,
              subject: mail.subject,
              html: mail.html,
              text: mail.text,
              replyTo: env().KANZLEI_EMAIL_INBOX,
            });
          } catch (err) {
            console.warn("[admin.setPortalVollmacht] Mail fehlgeschlagen:", err);
          }
        }
      }
      return zugang;
    }),

  /**
   * Zugangscode fuer die Kanzlei sichtbar machen (nur bis zum Einloesen
   * gespeichert, verschluesselt). Jeder Abruf steht im Audit-Log.
   */
  zugangscodeAnzeigen: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const secret = env().PORTAL_CODE_SECRET;
      if (!secret) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "PORTAL_CODE_SECRET ist nicht gesetzt." });
      }
      const antrag = await ladeAntrag(input.id);
      const zugang = antrag.mandant?.portalZugang;
      if (!zugang?.zugangscodeEnc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kein Zugangscode gespeichert." });
      }
      let code: string;
      try {
        code = decryptSecret(zugang.zugangscodeEnc, secret);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Der Code lässt sich nicht entschlüsseln (Schlüssel geändert?). Bitte beim Kunden neu anfordern.",
        });
      }
      await tryLogAudit({
        antragId: input.id,
        type: "PORTAL_ZUGANG_GEAENDERT",
        actor: "KANZLEI",
        metadata: { aktion: "zugangscode-angezeigt" },
      });
      return { code, beteiligtenNummer: zugang.beteiligtenNummer, eingegangenAt: zugang.zugangscodeEingegangenAt };
    }),

  /** Code ist im Portal eingeloest: Code loeschen, Status auf "eingeloest" setzen. */
  zugangscodeEingeloest: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const antrag = await ladeAntrag(input.id);
      if (!antrag.mandantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Antrag hat noch keinen Mandanten." });
      }
      const mandantId = antrag.mandantId;
      await prisma.$transaction(async (tx) => {
        await tx.portalZugang.upsert({
          where: { mandantId },
          create: { mandantId, vollmachtStatus: "CODE_EINGELOEST", zugangscodeEingeloestAt: new Date() },
          update: { vollmachtStatus: "CODE_EINGELOEST", zugangscodeEnc: null, zugangscodeEingeloestAt: new Date() },
        });
        await logAudit({ antragId: input.id, type: "PORTAL_CODE_EINGELOEST", actor: "KANZLEI" }, tx);
      });
      return { ok: true };
    }),

  /** Taeglicher Lauf (Cron): verschickt faellige Erinnerungen zum Portal-Zugang. */
  portalErinnerungen: adminProcedure
    .input(z.object({ name: z.string().min(1), shortName: z.string().min(1), kanzleiName: z.string().min(1) }))
    .mutation(({ input }) => sendeErinnerungen(input)),

  /**
   * Status-Update durch die Kanzlei. Setzt entsprechende Timestamps + ggf.
   * `hzaAmount` und triggert die passende Kunden-Mail.
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        nextStatus: z.enum(["SUBMITTED", "APPROVED", "PAID", "REJECTED"]),
        hzaAmount: z.number().min(0).max(100_000_000).optional(),
        /** Eingangsnummer des Zoll-Portals; Pflicht beim Wechsel auf SUBMITTED */
        eingangsnummer: z.string().trim().min(3).max(60).optional(),
        brandName: z.string().min(1).max(200),
        brandShortName: z.string().min(1).max(80),
      }),
    )
    .mutation(async ({ input }) => {
      const e = env();
      const app = await ladeAntrag(input.id);
      if (input.nextStatus === "SUBMITTED" && !istEinreichbar(app, "einreichung")) {
        const fehlend = pruefeVollstaendigkeit(app, "einreichung");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Nicht einreichbar: ${fehlend.map((f) => f.label).join(", ")}.`,
        });
      }

      if (input.nextStatus === "SUBMITTED" && !input.eingangsnummer && !app.eingangsnummer) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bitte die Eingangsnummer aus dem Zoll-Portal eintragen.",
        });
      }

      const now = new Date();
      const data: Record<string, unknown> = {
        status: input.nextStatus,
      };
      if (input.nextStatus === "SUBMITTED") {
        data.submittedAt = app.submittedAt ?? now;
        if (input.eingangsnummer) data.eingangsnummer = input.eingangsnummer;
      }
      if (input.nextStatus === "APPROVED" || input.nextStatus === "REJECTED") {
        data.hzaDecisionAt = now;
        if (input.hzaAmount !== undefined) {
          data.hzaAmount = input.hzaAmount;
        }
      }
      if (input.nextStatus === "PAID") {
        data.payoutAt = now;
        if (input.hzaAmount !== undefined) {
          data.hzaAmount = input.hzaAmount;
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.antrag.update({
          where: { id: input.id },
          data,
        });
        await logAudit(
          {
            antragId: input.id,
            type: input.nextStatus === "SUBMITTED" ? "PORTAL_EINGEREICHT" : "STATUS_CHANGED",
            actor: "KANZLEI",
            metadata: {
              from: app.status,
              to: input.nextStatus,
              hzaAmount: input.hzaAmount ?? null,
              ...(input.nextStatus === "SUBMITTED"
                ? { eingangsnummer: input.eingangsnummer ?? app.eingangsnummer }
                : {}),
            },
          },
          tx,
        );
        return u;
      });

      // Kunden-Mail nach Status-Wechsel.
      const kundenEmail = app.mandant?.email;
      if (kundenEmail) {
        const baseInput = {
          brand: { name: input.brandName, shortName: input.brandShortName },
          firmenname: app.mandant?.firmenname ?? "Antragsteller",
          antragsjahr: updated.antragsjahr ?? new Date().getFullYear() - 1,
          statusUrl: `${e.APP_BASE_URL}/status/${updated.sessionToken}`,
          hzaAmount:
            updated.hzaAmount !== null
              ? Number(updated.hzaAmount)
              : input.hzaAmount,
        };
        const tpl =
          input.nextStatus === "SUBMITTED"
            ? renderStatusSubmitted(baseInput)
            : input.nextStatus === "APPROVED"
              ? renderStatusApproved(baseInput)
              : input.nextStatus === "PAID"
                ? renderStatusPaid(baseInput)
                : renderStatusRejected(baseInput);
        const subject =
          input.nextStatus === "SUBMITTED"
            ? "Antrag beim Hauptzollamt eingereicht"
            : input.nextStatus === "APPROVED"
              ? "Bescheid: Antrag bewilligt"
              : input.nextStatus === "PAID"
                ? "Erstattung ausgezahlt"
                : "Bescheid: Antrag abgelehnt";
        try {
          await sendMail({
            to: kundenEmail,
            subject,
            html: tpl.html,
            text: tpl.text,
            replyTo: e.KANZLEI_EMAIL_INBOX,
          });
        } catch (err) {
          console.warn("[admin.updateStatus] Mail-Versand fehlgeschlagen:", err);
        }
      }

      return updated;
    }),

  /**
   * Loescht abgelaufene Drafts und ihre Anhaenge. Wird vom Cron getriggert,
   * kann aber auch manuell aus dem Backoffice gerufen werden.
   */
  expireDrafts: adminProcedure.mutation(async () => {
    const e = env();
    const cutoff = new Date(Date.now() - e.DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000);
    const expired = await prisma.antrag.findMany({
      where: {
        status: { in: ["DRAFT", "SIGNED"] },
        createdAt: { lt: cutoff },
      },
      include: { lieferstellen: true },
    });

    let belegeRemoved = 0;
    let generatedRemoved = 0;
    for (const app of expired) {
      const belegeKeys = app.lieferstellen.flatMap((l) => l.belegFileKeys);
      if (belegeKeys.length > 0) {
        try {
          await deleteBelege(belegeKeys);
          belegeRemoved += belegeKeys.length;
        } catch (err) {
          console.warn(`[expireDrafts] Belege-Loeschung ${app.id}:`, err);
        }
      }
      const generatedKeys = [
        app.aufbereitungSignaturePngKey,
        app.aufbereitungPdfKey,
        app.kanzleimandatSignaturePngKey,
        app.kanzleimandatPdfKey,
        app.kanzleiPaketKey,
      ].filter((k): k is string => k !== null);
      if (generatedKeys.length > 0) {
        try {
          await deleteGenerated(generatedKeys);
          generatedRemoved += generatedKeys.length;
        } catch (err) {
          console.warn(`[expireDrafts] Generated-Loeschung ${app.id}:`, err);
        }
      }
      await prisma.antrag.update({
        where: { id: app.id },
        data: { status: "EXPIRED" },
      });
      await tryLogAudit({
        antragId: app.id,
        type: "DRAFT_EXPIRED",
        actor: "SYSTEM",
        metadata: {
          previousStatus: app.status,
          belegeRemoved: app.lieferstellen.flatMap((l) => l.belegFileKeys).length,
        },
      });
    }
    return {
      applicationsExpired: expired.length,
      belegeRemoved,
      generatedRemoved,
      cutoff: cutoff.toISOString(),
    };
  }),
});
