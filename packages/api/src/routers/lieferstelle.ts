import { prisma } from "@stromsteuer/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  deleteBelege,
  getBelegDownloadUrl,
} from "../storage/supabase";
import { applicationProcedure, router } from "../trpc";

const updateSchema = z.object({
  id: z.string().min(1),
  firmenname: z.string().min(1).max(200).optional(),
  adresse: z.string().min(1).max(300).optional(),
  plz: z
    .string()
    .regex(/^\d{5}$/)
    .optional(),
  jahresKwh: z.number().int().min(0).max(50_000_000).optional(),
  belegFileKeys: z.array(z.string()).optional(),
  ocrConfidence: z.number().min(0).max(1).optional(),
});

export const lieferstelleRouter = router({
  list: applicationProcedure.query(({ ctx }) => {
    return prisma.lieferstelle.findMany({
      where: { applicationId: ctx.application.id },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: applicationProcedure
    .input(
      z
        .object({
          firmenname: z.string().min(1).max(200).optional(),
          adresse: z.string().min(1).max(300).optional(),
          plz: z
            .string()
            .regex(/^\d{5}$/)
            .optional(),
          jahresKwh: z.number().int().min(0).max(50_000_000).optional(),
          belegFileKeys: z.array(z.string()).optional(),
          ocrConfidence: z.number().min(0).max(1).optional(),
        })
        .optional(),
    )
    .mutation(({ ctx, input }) => {
      return prisma.lieferstelle.create({
        data: {
          applicationId: ctx.application.id,
          firmenname: input?.firmenname ?? "",
          adresse: input?.adresse ?? "",
          plz: input?.plz,
          jahresKwh: input?.jahresKwh ?? 0,
          belegFileKeys: input?.belegFileKeys ?? [],
          ocrConfidence: input?.ocrConfidence ?? null,
        },
      });
    }),

  update: applicationProcedure
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.lieferstelle.findUnique({
        where: { id: input.id },
      });
      if (!existing || existing.applicationId !== ctx.application.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const { id, ...data } = input;
      return prisma.lieferstelle.update({ where: { id }, data });
    }),

  delete: applicationProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.lieferstelle.findUnique({
        where: { id: input.id },
      });
      if (!existing || existing.applicationId !== ctx.application.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      // Storage-Aufraeumen besteht best-effort: bei Fehler nicht die DB-Loeschung blocken.
      if (existing.belegFileKeys.length > 0) {
        try {
          await deleteBelege(existing.belegFileKeys);
        } catch (err) {
          console.warn("[lieferstelle.delete] Belege konnten nicht entfernt werden:", err);
        }
      }
      await prisma.lieferstelle.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  getBelegUrl: applicationProcedure
    .input(z.object({ key: z.string().min(1) }))
    .query(({ input }) => {
      return getBelegDownloadUrl(input.key, 900);
    }),
});
