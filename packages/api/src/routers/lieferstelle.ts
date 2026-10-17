import { aggregiereBelege, mengeNachBeleg } from "@stromsteuer/antrag";
import { prisma } from "@stromsteuer/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { logAudit } from "../audit";
import {
  deleteBelege,
  getBelegDownloadUrl,
} from "../storage/supabase";
import { applicationProcedure, router } from "../trpc";

const kwh = z.number().int().min(0).max(50_000_000);

/** Felder, die Kunde oder OCR an einer Lieferstelle setzen duerfen. */
const felder = {
  firmenname: z.string().min(1).max(200).optional(),
  adresse: z.string().min(1).max(300).optional(),
  plz: z
    .string()
    .regex(/^\d{5}$/)
    .optional(),
  /** Formular 1453 Spalte 3 */
  kwhEigenbetrieblich: kwh.optional(),
  /** Spalte 4 */
  kwhNutzenergiePG: kwh.optional(),
  /** Spalte 5 */
  kwhNutzenergieLuF: kwh.optional(),
  versorger: z.string().max(200).optional(),
  zeitraumVon: z.date().optional(),
  zeitraumBis: z.date().optional(),
  stromsteuerGezahltEur: z.number().min(0).max(100_000_000).optional(),
  belegFileKeys: z.array(z.string()).optional(),
  ocrConfidence: z.number().min(0).max(1).optional(),
};

const updateSchema = z.object({ id: z.string().min(1), ...felder });

/** Was aus einer Rechnung gelesen wurde; null = nicht erkannt. */
const belegSchema = z.object({
  /** Gewaehlte Lieferstelle (Upload in einer Karte); ohne = automatisch zuordnen */
  lieferstelleId: z.string().min(1).optional(),
  storageKey: z.string().min(1),
  dateiname: z.string().min(1).max(255),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  extraktion: z.enum(["textract", "pdf-lokal", "keine"]),
  kwh: kwh.nullable(),
  zeitraumVon: z.date().nullable(),
  zeitraumBis: z.date().nullable(),
  stromsteuerEur: z.number().min(0).max(100_000_000).nullable(),
  versorger: z.string().max(200).nullable(),
  adresse: z.string().max(300).nullable(),
  zaehlpunkt: z.string().max(40).nullable(),
  ocrConfidence: z.number().min(0).max(1).nullable(),
});

export type BelegZuordnung = "gewaehlt" | "zaehlpunkt" | "adresse" | "neu";

/** Vergleichsschluessel fuer Adressen: "Industriestraße 1" == "industriestr. 1". */
function adresseSchluessel(adresse: string): string {
  return adresse
    .toLowerCase()
    .replace(/stra(ß|ss)e/g, "str")
    .replace(/[^a-z0-9äöü]/g, "");
}

export const lieferstelleRouter = router({
  list: applicationProcedure.query(({ ctx }) => {
    return prisma.lieferstelle.findMany({
      where: { antragId: ctx.application.id },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: applicationProcedure
    .input(z.object(felder).optional())
    .mutation(({ ctx, input }) => {
      return prisma.lieferstelle.create({
        data: {
          ...input,
          antragId: ctx.application.id,
          firmenname: input?.firmenname ?? "",
          adresse: input?.adresse ?? "",
          kwhEigenbetrieblich: input?.kwhEigenbetrieblich ?? 0,
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
      if (!existing || existing.antragId !== ctx.application.id) {
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
      if (!existing || existing.antragId !== ctx.application.id) {
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

  /** Wurde genau diese Datei in diesem Antrag schon hochgeladen? */
  belegDuplikat: applicationProcedure
    .input(z.object({ sha256: z.string().regex(/^[0-9a-f]{64}$/) }))
    .query(async ({ ctx, input }) => {
      const beleg = await prisma.beleg.findUnique({
        where: { antragId_sha256: { antragId: ctx.application.id, sha256: input.sha256 } },
        select: { dateiname: true },
      });
      return beleg?.dateiname ?? null;
    }),

  /**
   * Legt einen Beleg an, ordnet ihn einer Lieferstelle zu und zieht deren
   * Summen nach. Zuordnung ohne gewaehlte Lieferstelle: gleicher Zaehlpunkt,
   * sonst gleiche Adresse, sonst neue Lieferstelle. So landen zwoelf
   * Monatsrechnungen aus dem Massen-Upload an einer Lieferstelle.
   */
  belegErfassen: applicationProcedure
    .input(belegSchema)
    .mutation(async ({ ctx, input }) => {
      const antragId = ctx.application.id;
      try {
        return await prisma.$transaction(async (tx) => {
          let zuordnung: BelegZuordnung = "neu";
          let lieferstelleId: string | null = null;

          if (input.lieferstelleId) {
            const gewaehlt = await tx.lieferstelle.findUnique({ where: { id: input.lieferstelleId } });
            if (!gewaehlt || gewaehlt.antragId !== antragId) {
              throw new TRPCError({ code: "NOT_FOUND", message: "Lieferstelle nicht gefunden." });
            }
            lieferstelleId = gewaehlt.id;
            zuordnung = "gewaehlt";
          }
          if (!lieferstelleId && input.zaehlpunkt) {
            const gleich = await tx.beleg.findFirst({
              where: { antragId, zaehlpunkt: input.zaehlpunkt },
              select: { lieferstelleId: true },
            });
            if (gleich) {
              lieferstelleId = gleich.lieferstelleId;
              zuordnung = "zaehlpunkt";
            }
          }
          if (!lieferstelleId && input.adresse) {
            const schluessel = adresseSchluessel(input.adresse);
            const alle = await tx.lieferstelle.findMany({
              where: { antragId },
              select: { id: true, adresse: true },
              orderBy: { createdAt: "asc" },
            });
            const gleich = alle.find((l) => l.adresse && adresseSchluessel(l.adresse) === schluessel);
            if (gleich) {
              lieferstelleId = gleich.id;
              zuordnung = "adresse";
            }
          }
          if (!lieferstelleId) {
            // Die Wizard-Seite legt beim ersten Aufruf eine leere Karte an;
            // die wird gefuellt, statt daneben eine neue anzulegen.
            const leer = await tx.lieferstelle.findFirst({
              where: { antragId, adresse: "", kwhEigenbetrieblich: 0, belegFileKeys: { isEmpty: true } },
              orderBy: { createdAt: "asc" },
              select: { id: true },
            });
            if (leer) lieferstelleId = leer.id;
          }
          if (!lieferstelleId) {
            const neu = await tx.lieferstelle.create({
              data: {
                antragId,
                firmenname: input.versorger ?? "",
                adresse: input.adresse ?? "",
                kwhEigenbetrieblich: 0,
                belegFileKeys: [],
              },
            });
            lieferstelleId = neu.id;
          }

          const lieferstelle = await tx.lieferstelle.findUniqueOrThrow({
            where: { id: lieferstelleId },
            include: { belege: true },
          });
          const beleg = await tx.beleg.create({
            data: {
              lieferstelleId,
              antragId,
              storageKey: input.storageKey,
              dateiname: input.dateiname,
              sha256: input.sha256,
              extraktion: input.extraktion,
              kwh: input.kwh,
              zeitraumVon: input.zeitraumVon,
              zeitraumBis: input.zeitraumBis,
              stromsteuerEur: input.stromsteuerEur,
              versorger: input.versorger,
              adresse: input.adresse,
              zaehlpunkt: input.zaehlpunkt,
              ocrConfidence: input.ocrConfidence,
            },
          });

          const nachher = [...lieferstelle.belege, beleg];
          const summe = aggregiereBelege(nachher);
          const menge = mengeNachBeleg(lieferstelle.kwhEigenbetrieblich, lieferstelle.belege, nachher);

          const aktualisiert = await tx.lieferstelle.update({
            where: { id: lieferstelleId },
            data: {
              belegFileKeys: [...lieferstelle.belegFileKeys, input.storageKey],
              ...(lieferstelle.firmenname === "" && input.versorger ? { firmenname: input.versorger } : {}),
              ...(lieferstelle.adresse === "" && input.adresse ? { adresse: input.adresse } : {}),
              ...(input.versorger ? { versorger: input.versorger } : {}),
              ...(menge !== undefined ? { kwhEigenbetrieblich: menge } : {}),
              zeitraumVon: summe.zeitraumVon,
              zeitraumBis: summe.zeitraumBis,
              stromsteuerGezahltEur: summe.stromsteuerEur,
              ocrConfidence: summe.ocrConfidence,
            },
          });

          await logAudit(
            {
              antragId,
              type: "BELEG_ERFASST",
              metadata: {
                belegId: beleg.id,
                lieferstelleId,
                zuordnung,
                sha256: input.sha256,
                extraktion: input.extraktion,
                kwh: input.kwh,
                mengeUebernommen: menge !== undefined,
              },
            },
            tx,
          );

          return {
            lieferstelleId,
            zuordnung,
            anzahlBelege: nachher.length,
            belegSummeKwh: summe.kwh,
            kwhEigenbetrieblich: aktualisiert.kwhEigenbetrieblich,
            mengeUebernommen: menge !== undefined,
          };
        });
      } catch (err) {
        // P2002 = Unique-Verletzung (antragId, sha256): paralleler Doppel-Upload
        if (err instanceof Error && "code" in err && err.code === "P2002") {
          throw new TRPCError({ code: "CONFLICT", message: "Diese Rechnung wurde bereits hochgeladen." });
        }
        throw err;
      }
    }),

  getBelegUrl: applicationProcedure
    .input(z.object({ key: z.string().min(1) }))
    .query(({ input }) => {
      return getBelegDownloadUrl(input.key, 900);
    }),
});
