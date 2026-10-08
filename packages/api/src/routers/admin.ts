import { istEinreichbar, pruefeVollstaendigkeit } from "@stromsteuer/antrag";
import { prisma } from "@stromsteuer/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { berechneAntrag, ladeAntrag } from "../antrag-service";
import { logAudit, tryLogAudit } from "../audit";
import { sendMail } from "../email/client";
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
      return {
        ...antrag,
        berechnung: berechneAntrag(antrag),
        fehlend: pruefeVollstaendigkeit(antrag, "einreichung"),
        kanzleiPaketUrl,
        aufbereitungPdfUrl,
        kanzleimandatPdfUrl,
      };
    }),

  /**
   * Portal-Zugang des Mandanten pflegen (Vollmacht im Zoll-Portal). Ohne
   * aktive Vollmacht kann die Kanzlei nicht einreichen.
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
        beteiligtenNummer: z.string().max(40).optional(),
        geprueftVon: z.string().max(120).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const antrag = await prisma.antrag.findUnique({
        where: { id: input.id },
        select: { mandantId: true },
      });
      if (!antrag?.mandantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Antrag hat noch keinen Mandanten." });
      }
      const aktiv = input.vollmachtStatus === "AKTIV";
      const data = {
        vollmachtStatus: input.vollmachtStatus,
        ...(input.beteiligtenNummer ? { beteiligtenNummer: input.beteiligtenNummer } : {}),
        ...(aktiv ? { scopeGeprueftAt: new Date(), scopeGeprueftVon: input.geprueftVon ?? "Kanzlei" } : {}),
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
        metadata: { portalVollmacht: input.vollmachtStatus },
      });
      return zugang;
    }),

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

      const now = new Date();
      const data: Record<string, unknown> = {
        status: input.nextStatus,
      };
      if (input.nextStatus === "SUBMITTED") {
        data.submittedAt = app.submittedAt ?? now;
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
            type: "STATUS_CHANGED",
            actor: "KANZLEI",
            metadata: {
              from: app.status,
              to: input.nextStatus,
              hzaAmount: input.hzaAmount ?? null,
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
