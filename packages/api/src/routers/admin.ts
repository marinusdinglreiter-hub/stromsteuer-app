import { prisma } from "@stromsteuer/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

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
      return prisma.application.findMany({
        where: input?.status ? { status: input.status } : undefined,
        orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          status: true,
          firmenname: true,
          antragsjahr: true,
          email: true,
          bruttoErstattung: true,
          honorar: true,
          nettoAuszahlung: true,
          hzaAmount: true,
          submittedAt: true,
          mandatSignedAt: true,
          hzaDecisionAt: true,
          payoutAt: true,
          triageEnergieAnDritte: true,
        },
      });
    }),

  /** Anzahl der Antraege je Status, fuer die Filterleiste im Eingang. */
  counts: adminProcedure.query(async () => {
    const rows = await prisma.application.groupBy({
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

  /** Voller Datensatz inkl. Lieferstellen + Signed-URL aufs Kanzlei-Paket. */
  get: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const app = await prisma.application.findUnique({
        where: { id: input.id },
        include: { lieferstellen: true },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });

      let kanzleiPaketUrl: string | null = null;
      if (app.kanzleiPaketKey) {
        try {
          kanzleiPaketUrl = await getGeneratedDownloadUrl(
            app.kanzleiPaketKey,
            60 * 60, // 1 Stunde
          );
        } catch (err) {
          console.warn("[admin.get] paket signed-url fehlgeschlagen:", err);
        }
      }
      let mandatPdfUrl: string | null = null;
      if (app.mandatPdfKey) {
        try {
          mandatPdfUrl = await getGeneratedDownloadUrl(app.mandatPdfKey, 60 * 60);
        } catch (err) {
          console.warn("[admin.get] mandat signed-url fehlgeschlagen:", err);
        }
      }
      return { ...app, kanzleiPaketUrl, mandatPdfUrl };
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
      const app = await prisma.application.findUnique({
        where: { id: input.id },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });

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
        const u = await tx.application.update({
          where: { id: input.id },
          data,
        });
        await logAudit(
          {
            applicationId: input.id,
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
      if (updated.email) {
        const baseInput = {
          brand: { name: input.brandName, shortName: input.brandShortName },
          firmenname: updated.firmenname ?? "Antragsteller",
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
                : "Antrag abgelehnt — kein Honorar faellig";
        try {
          await sendMail({
            to: updated.email,
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
    const expired = await prisma.application.findMany({
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
        app.signaturePngKey,
        app.mandatPdfKey,
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
      await prisma.application.update({
        where: { id: app.id },
        data: { status: "EXPIRED" },
      });
      await tryLogAudit({
        applicationId: app.id,
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
