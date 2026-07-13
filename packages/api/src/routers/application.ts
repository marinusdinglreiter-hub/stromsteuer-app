import { randomBytes } from "node:crypto";

import { prisma, type Application } from "@stromsteuer/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { logAudit, tryLogAudit } from "../audit";
import { calculateErstattung, type CalcResult } from "../calc/stromsteuer";
import { sendMail } from "../email/client";
import {
  renderAntragBestaetigt,
  renderNeuerAntragKanzlei,
} from "../email/templates";
import { env } from "../env";
import { generateKanzleiPaket } from "../forms/kanzleiPaket";
import { generateMandatPdf } from "../forms/mandat";
import {
  getGeneratedDownloadUrl,
  uploadGenerated,
} from "../storage/supabase";
import { applicationProcedure, publicProcedure, router } from "../trpc";

/** 30 Tage Lebensdauer fuer den Antrags-Datensatz. */
const DRAFT_TTL_DAYS = 30;

function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

function ttlDate(): Date {
  return new Date(Date.now() + DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export const applicationRouter = router({
  /**
   * Legt einen neuen Antrag an und gibt den sessionToken zurueck.
   * Der Aufrufer (apps/web) setzt damit den HTTP-Cookie.
   *
   * Bei Bedarf koennen erste Calculator-Werte (kWh + Branche + Jahr) direkt
   * mit uebergeben werden — dann sind sie schon im DRAFT gespeichert,
   * wenn der Wizard die Seite laedt.
   */
  bootstrap: publicProcedure
    .input(
      z
        .object({
          antragsjahr: z.number().int().min(2020).max(2030).optional(),
          branche: z.string().min(1).max(100).optional(),
          geschaetzteKwh: z.number().int().min(0).max(50_000_000).optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const sessionToken = generateSessionToken();
      const application = await prisma.application.create({
        data: {
          sessionToken,
          expiresAt: ttlDate(),
          antragsjahr: input?.antragsjahr,
          branche: input?.branche,
          geschaetzteKwh: input?.geschaetzteKwh,
        },
      });
      await tryLogAudit({
        applicationId: application.id,
        type: "APPLICATION_CREATED",
        actor: "CUSTOMER",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          antragsjahr: input?.antragsjahr ?? null,
          branche: input?.branche ?? null,
          geschaetzteKwh: input?.geschaetzteKwh ?? null,
        },
      });
      return { sessionToken, applicationId: application.id };
    }),

  /**
   * Gibt die aktuell im Cookie referenzierte Application zurueck (inkl.
   * Lieferstellen). Wirft, falls kein Antrag im Context.
   */
  current: applicationProcedure.query(async ({ ctx }) => {
    const full = await prisma.application.findUnique({
      where: { id: ctx.application.id },
      include: { lieferstellen: true },
    });
    if (!full) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return full;
  }),

  /**
   * Speichert die Auswahl aus Schritt 1 (Berechnen) und liefert die
   * Erstattungs-Schaetzung zurueck. Idempotent — kann beliebig oft
   * aufgerufen werden.
   */
  updateCalc: applicationProcedure
    .input(
      z.object({
        antragsjahr: z.number().int().min(2024).max(2026),
        branche: z.string().min(1).max(100),
        geschaetzteKwh: z.number().int().min(0).max(50_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = calculateErstattung({ bruttoKwh: input.geschaetzteKwh });
      await prisma.application.update({
        where: { id: ctx.application.id },
        data: {
          antragsjahr: input.antragsjahr,
          branche: input.branche,
          geschaetzteKwh: input.geschaetzteKwh,
          bruttoKwh: result.bruttoKwh,
          nettoKwh: result.nettoKwh,
          bruttoErstattung: result.bruttoErstattung,
          honorar: result.honorar,
          nettoAuszahlung: result.nettoAuszahlung,
        },
      });
      await tryLogAudit({
        applicationId: ctx.application.id,
        type: "CALC_UPDATED",
        actor: "CUSTOMER",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          antragsjahr: input.antragsjahr,
          branche: input.branche,
          geschaetzteKwh: input.geschaetzteKwh,
        },
      });
      return result;
    }),

  /**
   * Stateless Preview fuer den Landing-Calculator — kein DB-Write.
   * Wird debounced von der Calculator-Komponente aufgerufen.
   */
  preview: publicProcedure
    .input(
      z.object({
        kwh: z.number().int().min(0).max(50_000_000),
        privatnutzungKwh: z.number().int().min(0).optional(),
        eAutoKwh: z.number().int().min(0).optional(),
      }),
    )
    .query(({ input }) => {
      return calculateErstattung({
        bruttoKwh: input.kwh,
        privatnutzungKwh: input.privatnutzungKwh,
        eAutoKwh: input.eAutoKwh,
      });
    }),

  /**
   * Speichert die 6 Triage-Antworten und rechnet die Erstattung neu —
   * jetzt mit den tatsaechlichen Lieferstellen-kWh und den Abzuegen
   * aus Privatnutzung + E-Auto.
   */
  updateTriage: applicationProcedure
    .input(
      z.object({
        kleinsteRechtsperson: z.boolean(),
        keineFinanzschwierig: z.boolean(),
        keineEuRueckforderung: z.boolean(),
        privatnutzung: z.boolean(),
        privatnutzungKwh: z.number().int().min(0).max(50_000_000).optional(),
        eAutoLaden: z.boolean(),
        eAutoKwh: z.number().int().min(0).max(50_000_000).optional(),
        energieAnDritte: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.keineEuRueckforderung) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Ohne Bestaetigung zur EU-Rueckforderung kann der Antrag nicht gestellt werden.",
        });
      }

      const lieferstellen = await prisma.lieferstelle.findMany({
        where: { applicationId: ctx.application.id },
      });
      const summeKwh = lieferstellen.reduce((acc, l) => acc + l.jahresKwh, 0);
      const privatKwh = input.privatnutzung
        ? (input.privatnutzungKwh ?? 0)
        : 0;
      const eAutoKwh = input.eAutoLaden ? (input.eAutoKwh ?? 0) : 0;

      const result: CalcResult = calculateErstattung({
        bruttoKwh: summeKwh,
        privatnutzungKwh: privatKwh,
        eAutoKwh,
      });

      const updated = (await prisma.application.update({
        where: { id: ctx.application.id },
        data: {
          triageKleinsteRechtsperson: input.kleinsteRechtsperson,
          triageKeineFinanzschwierig: input.keineFinanzschwierig,
          triageKeineEuRueckforderung: input.keineEuRueckforderung,
          triagePrivatnutzung: input.privatnutzung,
          triagePrivatnutzungKwh: privatKwh > 0 ? privatKwh : null,
          triageEAutoLaden: input.eAutoLaden,
          triageEAutoKwh: eAutoKwh > 0 ? eAutoKwh : null,
          triageEnergieAnDritte: input.energieAnDritte,
          bruttoKwh: result.bruttoKwh,
          nettoKwh: result.nettoKwh,
          bruttoErstattung: result.bruttoErstattung,
          honorar: result.honorar,
          nettoAuszahlung: result.nettoAuszahlung,
        },
      })) satisfies Application;
      await tryLogAudit({
        applicationId: ctx.application.id,
        type: "TRIAGE_UPDATED",
        actor: "CUSTOMER",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          energieAnDritte: input.energieAnDritte,
          privatnutzungKwh: privatKwh,
          eAutoKwh,
          bruttoKwh: result.bruttoKwh,
          nettoKwh: result.nettoKwh,
        },
      });
      return updated;
    }),

  /** Speichert Firmendaten aus Schritt 3a. */
  updateFirma: applicationProcedure
    .input(
      z.object({
        firmenname: z.string().min(1).max(200),
        rechtsform: z.string().min(1).max(60),
        geschaeftsfuehrer: z.string().min(1).max(160),
        vorname: z.string().min(1).max(80),
        nachname: z.string().min(1).max(80),
        telefon: z.string().max(60).optional(),
        strasse: z.string().min(1).max(160),
        plz: z.string().regex(/^\d{5}$/),
        ort: z.string().min(1).max(120),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await prisma.application.update({
        where: { id: ctx.application.id },
        data: {
          firmenname: input.firmenname,
          rechtsform: input.rechtsform,
          geschaeftsfuehrer: input.geschaeftsfuehrer,
          vorname: input.vorname,
          nachname: input.nachname,
          telefon: input.telefon && input.telefon.length > 0 ? input.telefon : null,
          strasse: input.strasse,
          plz: input.plz,
          ort: input.ort,
        },
      });
      await tryLogAudit({
        applicationId: ctx.application.id,
        type: "FIRMA_UPDATED",
        actor: "CUSTOMER",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { firmenname: input.firmenname, plz: input.plz, ort: input.ort },
      });
      return updated;
    }),

  /**
   * Schliesst Schritt 3b ab: speichert die Zustimmungen, schreibt die
   * Signatur als PNG in Storage, erzeugt das Mandat-PDF und setzt den Status
   * auf SIGNED. Trigger fuer Schritt 7 (Kanzlei-Paket) erfolgt anschliessend.
   */
  signMandat: applicationProcedure
    .input(
      z.object({
        signerName: z.string().min(2).max(160),
        email: z.string().email().max(200),
        agbAccepted: z.literal(true),
        mandatAccepted: z.literal(true),
        vertretungsBerechtigt: z.literal(true),
        /** Base64-Data-URL eines PNG aus dem Canvas. */
        signatureDataUrl: z
          .string()
          .startsWith("data:image/png;base64,")
          .max(2_000_000),
        kanzleiName: z.string().min(1).max(200),
        kanzleiAnwalt: z.string().min(1).max(160),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const app = await prisma.application.findUnique({
        where: { id: ctx.application.id },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      if (app.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Antrag wurde bereits eingereicht.",
        });
      }
      const required: (keyof Application)[] = [
        "firmenname",
        "rechtsform",
        "geschaeftsfuehrer",
        "strasse",
        "plz",
        "ort",
        "antragsjahr",
        "triageKleinsteRechtsperson",
      ];
      for (const key of required) {
        if (app[key] === null || app[key] === "") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Pflichtfeld ${String(key)} fehlt. Bitte vorherige Schritte vervollstaendigen.`,
          });
        }
      }

      // 1) Signatur-PNG speichern.
      const base64 = input.signatureDataUrl.split(",")[1] ?? "";
      const signatureBytes = Uint8Array.from(Buffer.from(base64, "base64"));
      const signatureUpload = await uploadGenerated(
        app.id,
        `signature-${app.id}.png`,
        signatureBytes,
        "image/png",
      );

      // 2) Mandat-PDF erzeugen.
      const signedAt = new Date();
      const pdfBytes = await generateMandatPdf({
        applicationId: app.id,
        signedAt,
        firmenname: app.firmenname!,
        rechtsform: app.rechtsform!,
        geschaeftsfuehrer: app.geschaeftsfuehrer!,
        strasse: app.strasse!,
        plz: app.plz!,
        ort: app.ort!,
        email: input.email,
        bruttoErstattung: Number(app.bruttoErstattung ?? 0),
        honorar: Number(app.honorar ?? 0),
        nettoAuszahlung: Number(app.nettoAuszahlung ?? 0),
        antragsjahr: app.antragsjahr!,
        kanzleiName: input.kanzleiName,
        kanzleiAnwalt: input.kanzleiAnwalt,
        signerName: input.signerName,
        signerIp: ctx.ip,
        signatureDataUrl: input.signatureDataUrl,
      });
      const pdfUpload = await uploadGenerated(
        app.id,
        `mandat-${app.id}.pdf`,
        pdfBytes,
        "application/pdf",
      );

      // 3) Application updaten + Status SIGNED + Audit (atomar in einer Tx).
      return prisma.$transaction(async (tx) => {
        const updated = await tx.application.update({
          where: { id: app.id },
          data: {
            email: input.email,
            agbAccepted: true,
            mandatAccepted: true,
            vertretungsBerechtigt: true,
            mandatSignerName: input.signerName,
            mandatSignerIp: ctx.ip,
            mandatSignerUserAgent: ctx.userAgent,
            mandatSignedAt: signedAt,
            signaturePngKey: signatureUpload.key,
            mandatPdfKey: pdfUpload.key,
            status: "SIGNED",
          },
        });
        await logAudit(
          {
            applicationId: app.id,
            type: "MANDAT_SIGNED",
            actor: "CUSTOMER",
            ip: ctx.ip,
            userAgent: ctx.userAgent,
            metadata: {
              signerName: input.signerName,
              signaturePngKey: signatureUpload.key,
              mandatPdfKey: pdfUpload.key,
              kanzleiName: input.kanzleiName,
            },
          },
          tx,
        );
        return updated;
      });
    }),

  /**
   * Schliesst den Antrag final ab:
   *  - generiert Kanzlei-Paket-ZIP (Excel + Mandat + Belege)
   *  - schiebt es nach Storage
   *  - benachrichtigt Kunde + Kanzlei per Mail
   *  - Status SIGNED -> PENDING_REVIEW
   *
   * Idempotent — falls die Procedure mehrfach laeuft (z. B. nach Refresh der
   * /antrag/danke Seite), passiert nichts Doppeltes: bei PENDING_REVIEW wird
   * nur die Application zurueckgegeben.
   */
  submit: applicationProcedure
    .input(
      z.object({
        brandName: z.string().min(1).max(200),
        brandShortName: z.string().min(1).max(80),
        kanzleiName: z.string().min(1).max(200),
        kanzleiAnwalt: z.string().min(1).max(160),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const e = env();
      const app = await prisma.application.findUnique({
        where: { id: ctx.application.id },
        include: { lieferstellen: true },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });

      // Bereits eingereicht — idempotent.
      if (app.status === "PENDING_REVIEW" || app.status === "SUBMITTED") {
        return app;
      }
      if (app.status !== "SIGNED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Antrag noch nicht signiert.",
        });
      }
      if (!app.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Keine Kunden-E-Mail hinterlegt.",
        });
      }

      // 1) Kanzlei-Paket erzeugen + hochladen.
      const zipBytes = await generateKanzleiPaket({
        application: app,
        brand: {
          name: input.brandName,
          shortName: input.brandShortName,
        },
        kanzlei: {
          name: input.kanzleiName,
          anwalt: input.kanzleiAnwalt,
        },
      });
      const paketUpload = await uploadGenerated(
        app.id,
        `kanzlei-paket-${app.id}.zip`,
        zipBytes,
        "application/zip",
      );

      const submittedAt = new Date();
      const statusUrl = `${e.APP_BASE_URL}/status/${app.sessionToken}`;
      const paketDownloadUrl = await getGeneratedDownloadUrl(
        paketUpload.key,
        60 * 60 * 24 * 7, // 7 Tage
      ).catch(() => `${e.APP_BASE_URL}/admin/eingang`);

      // 2) Mails parallel versenden — Fehler sind nicht fatal.
      const customerMail = renderAntragBestaetigt({
        brand: { name: input.brandName, shortName: input.brandShortName },
        firmenname: app.firmenname ?? "Antragsteller",
        antragsjahr: app.antragsjahr ?? new Date().getFullYear() - 1,
        bruttoErstattung: Number(app.bruttoErstattung ?? 0),
        honorar: Number(app.honorar ?? 0),
        nettoAuszahlung: Number(app.nettoAuszahlung ?? 0),
        statusUrl,
        kanzleiName: input.kanzleiName,
      });
      const kanzleiMail = renderNeuerAntragKanzlei({
        brand: { name: input.brandName, shortName: input.brandShortName },
        applicationId: app.id,
        firmenname: app.firmenname ?? "—",
        geschaeftsfuehrer: app.geschaeftsfuehrer ?? "—",
        antragsjahr: app.antragsjahr ?? new Date().getFullYear() - 1,
        bruttoErstattung: Number(app.bruttoErstattung ?? 0),
        honorar: Number(app.honorar ?? 0),
        nettoAuszahlung: Number(app.nettoAuszahlung ?? 0),
        needs1456: app.triageEnergieAnDritte === true,
        paketDownloadUrl,
        kundenEmail: app.email,
      });

      const [customerResult, kanzleiResult] = await Promise.allSettled([
        sendMail({
          to: app.email,
          subject: "Ihr § 9b-Antrag ist eingegangen",
          html: customerMail.html,
          text: customerMail.text,
          replyTo: e.KANZLEI_EMAIL_INBOX,
        }),
        sendMail({
          to: e.KANZLEI_EMAIL_INBOX,
          subject: `Neuer § 9b-Mandant: ${app.firmenname ?? app.id}`,
          html: kanzleiMail.html,
          text: kanzleiMail.text,
        }),
      ]);

      if (customerResult.status === "rejected") {
        console.warn("[submit] Kunden-Mail fehlgeschlagen:", customerResult.reason);
      }
      if (kanzleiResult.status === "rejected") {
        console.warn("[submit] Kanzlei-Mail fehlgeschlagen:", kanzleiResult.reason);
      }

      // 3) Status PENDING_REVIEW + Paket-Key speichern + Audit (atomar).
      return prisma.$transaction(async (tx) => {
        const updated = await tx.application.update({
          where: { id: app.id },
          data: {
            status: "PENDING_REVIEW",
            submittedAt,
            kanzleiPaketKey: paketUpload.key,
          },
        });
        await logAudit(
          {
            applicationId: app.id,
            type: "APPLICATION_SUBMITTED",
            actor: "CUSTOMER",
            ip: ctx.ip,
            userAgent: ctx.userAgent,
            metadata: {
              kanzleiPaketKey: paketUpload.key,
              mailCustomerOk: customerResult.status === "fulfilled",
              mailKanzleiOk: kanzleiResult.status === "fulfilled",
            },
          },
          tx,
        );
        return updated;
      });
    }),
});
