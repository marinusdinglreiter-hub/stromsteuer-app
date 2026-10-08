import { randomBytes } from "node:crypto";

import {
  ANTRAG_MIT_RELATIONEN_INCLUDE,
  pruefeVollstaendigkeit,
  vorpruefung,
  type VorpruefungErgebnis,
} from "@stromsteuer/antrag";
import { prisma } from "@stromsteuer/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { berechneAntrag, ladeAntrag, summeKwh } from "../antrag-service";
import { logAudit, tryLogAudit } from "../audit";
import { preisFuer, type PreisErgebnis } from "../calc/preise";
import { calculateErstattung, type CalcResult } from "../calc/stromsteuer";
import { sha256Hex } from "../crypto";
import { sendMail } from "../email/client";
import {
  renderAntragBestaetigt,
  renderNeuerAntragKanzlei,
} from "../email/templates";
import { env, hasSupabaseCredentials } from "../env";
import { generateKanzleiPaket } from "../forms/kanzleiPaket";
import { canonicalConsentText, CONSENT_VERSION } from "../forms/legalTexts";
import {
  generateAufbereitungsvertragPdf,
  generateKanzleimandatPdf,
  type VertragsPartei,
} from "../forms/vertraege";
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

/** Preis nach Verbrauchsband fuer eine Berechnung. */
function preisFuerBerechnung(result: CalcResult, istFolgejahr: boolean): PreisErgebnis {
  return preisFuer(result.nettoMwh, { istFolgejahr });
}

const signaturSchema = z
  .string()
  .startsWith("data:image/png;base64,")
  .max(2_000_000);

/** Signatur-Felder, deren Fehlen vor der Unterschrift natuerlich ist. */
const SIGNATUR_FELDER = new Set([
  "antrag.aufbereitungSignedAt",
  "antrag.kanzleimandatSignedAt",
]);

export const applicationRouter = router({
  /**
   * Legt einen neuen Antrag an und gibt den sessionToken zurueck.
   * Der Aufrufer (apps/web) setzt damit den HTTP-Cookie.
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
      const antrag = await prisma.antrag.create({
        data: {
          sessionToken,
          expiresAt: ttlDate(),
          antragsjahr: input?.antragsjahr,
          branche: input?.branche,
          geschaetzteKwh: input?.geschaetzteKwh,
        },
      });
      await tryLogAudit({
        antragId: antrag.id,
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
      return { sessionToken, applicationId: antrag.id };
    }),

  /** Aktueller Antrag aus dem Cookie inkl. Mandant, Lieferstellen, Empfaenger. */
  current: applicationProcedure.query(async ({ ctx }) => {
    const full = await prisma.antrag.findUnique({
      where: { id: ctx.application.id },
      include: ANTRAG_MIT_RELATIONEN_INCLUDE,
    });
    if (!full) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return full;
  }),

  /**
   * Speichert die Auswahl aus Schritt 1 (Berechnen) und liefert die
   * Erstattungs-Schaetzung samt Festpreis zurueck. Idempotent.
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
      const result = calculateErstattung({
        verbrauchsjahr: input.antragsjahr,
        bruttoKwh: input.geschaetzteKwh,
      });
      await prisma.antrag.update({
        where: { id: ctx.application.id },
        data: {
          antragsjahr: input.antragsjahr,
          branche: input.branche,
          geschaetzteKwh: input.geschaetzteKwh,
          bruttoKwh: result.bruttoKwh,
          nettoKwh: result.nettoKwh,
          bruttoErstattung: result.bruttoErstattung,
        },
      });
      await tryLogAudit({
        antragId: ctx.application.id,
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
      return {
        ...result,
        preis: preisFuerBerechnung(result, ctx.application.istFolgejahr),
      };
    }),

  /**
   * Stateless Preview fuer den Landing-Calculator — kein DB-Write.
   * Ohne Verbrauchsjahr wird das Vorjahr angenommen (einzig antragsfaehiges Jahr).
   */
  preview: publicProcedure
    .input(
      z.object({
        kwh: z.number().int().min(0).max(50_000_000),
        verbrauchsjahr: z.number().int().min(2011).max(2100).optional(),
        privatnutzungKwh: z.number().int().min(0).optional(),
        eAutoKwh: z.number().int().min(0).optional(),
      }),
    )
    .query(({ input }) => {
      const result = calculateErstattung({
        verbrauchsjahr: input.verbrauchsjahr ?? new Date().getFullYear() - 1,
        bruttoKwh: input.kwh,
        privatnutzungKwh: input.privatnutzungKwh,
        eAutoKwh: input.eAutoKwh,
      });
      return { ...result, preis: preisFuerBerechnung(result, false) };
    }),

  /**
   * Speichert die Triage-Antworten und rechnet die Erstattung neu — mit den
   * tatsaechlichen Lieferstellen-Mengen und den Abzuegen aus Privatnutzung
   * und E-Auto.
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
        /** Formular 1453 Punkt 6, zweite Zeile: Nutzenergie an Dritte */
        energieAnDritte: z.boolean(),
        /** Punkt 6, erste Zeile */
        stromAnDritte: z.boolean().optional(),
        /** Punkt 7 */
        entnahmeDurchDritten: z.boolean().optional(),
        /** Selbsterklaerung zu staatlichen Beihilfen (Formular 1139) */
        beihilfeSelbsterklaerung: z.boolean().optional(),
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
        where: { antragId: ctx.application.id },
      });
      const privatKwh = input.privatnutzung ? (input.privatnutzungKwh ?? 0) : 0;
      const eAutoKwh = input.eAutoLaden ? (input.eAutoKwh ?? 0) : 0;

      const result: CalcResult = calculateErstattung({
        verbrauchsjahr: ctx.application.antragsjahr ?? new Date().getFullYear() - 1,
        bruttoKwh: summeKwh(lieferstellen),
        privatnutzungKwh: privatKwh,
        eAutoKwh,
      });

      const updated = await prisma.antrag.update({
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
          nutzenergieAnDritteWeitergegeben: input.energieAnDritte,
          stromAnDritteGeleistet: input.stromAnDritte,
          entnahmeDurchDritten: input.entnahmeDurchDritten,
          beihilfeSelbsterklaerungVorhanden: input.beihilfeSelbsterklaerung,
          bruttoKwh: result.bruttoKwh,
          nettoKwh: result.nettoKwh,
          bruttoErstattung: result.bruttoErstattung,
        },
      });
      await tryLogAudit({
        antragId: ctx.application.id,
        type: "TRIAGE_UPDATED",
        actor: "CUSTOMER",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          energieAnDritte: input.energieAnDritte,
          stromAnDritte: input.stromAnDritte ?? null,
          entnahmeDurchDritten: input.entnahmeDurchDritten ?? null,
          privatnutzungKwh: privatKwh,
          eAutoKwh,
          bruttoKwh: result.bruttoKwh,
          nettoKwh: result.nettoKwh,
        },
      });
      return updated;
    }),

  /**
   * Speichert Firmendaten, Steuer- und Bankdaten aus Schritt 3a am Mandanten.
   * Legt den Mandanten beim ersten Aufruf an.
   */
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
        unternehmensart: z.enum(["PRODUZIERENDES_GEWERBE", "LAND_FORSTWIRTSCHAFT"]),
        steuernummer: z.string().min(5).max(40),
        ustIdNr: z.string().max(20).optional(),
        handelsregister: z.string().max(60).optional(),
        wzCode: z.string().max(20).optional(),
        hauptzollamt: z.string().min(2).max(80),
        kontoinhaber: z.string().min(1).max(200),
        iban: z
          .string()
          .transform((s) => s.replace(/\s+/g, "").toUpperCase())
          .pipe(z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/, "IBAN ungueltig")),
        bic: z.string().max(11).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const leer = (s: string | undefined) => (s && s.trim().length > 0 ? s.trim() : null);
      const data = {
        firmenname: input.firmenname,
        rechtsform: input.rechtsform,
        geschaeftsfuehrer: input.geschaeftsfuehrer,
        vorname: input.vorname,
        nachname: input.nachname,
        telefon: leer(input.telefon),
        strasse: input.strasse,
        plz: input.plz,
        ort: input.ort,
        unternehmensart: input.unternehmensart,
        steuernummer: input.steuernummer.trim(),
        ustIdNr: leer(input.ustIdNr),
        handelsregister: leer(input.handelsregister),
        wzCode: leer(input.wzCode),
        hauptzollamt: input.hauptzollamt.trim(),
        kontoinhaber: input.kontoinhaber.trim(),
        iban: input.iban,
        bic: leer(input.bic)?.toUpperCase() ?? null,
      };

      const mandantId = ctx.application.mandantId;
      const mandant = mandantId
        ? await prisma.mandant.update({ where: { id: mandantId }, data })
        : await prisma.mandant.create({ data });
      if (!mandantId) {
        await prisma.antrag.update({
          where: { id: ctx.application.id },
          data: { mandantId: mandant.id },
        });
      }
      await tryLogAudit({
        antragId: ctx.application.id,
        type: "FIRMA_UPDATED",
        actor: "CUSTOMER",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          firmenname: input.firmenname,
          plz: input.plz,
          ort: input.ort,
          unternehmensart: input.unternehmensart,
          hauptzollamt: input.hauptzollamt,
        },
      });
      return mandant;
    }),

  /**
   * Vorpruefung mit Hardstop vor Vertragsschluss (kostenlos, ohne Rechnung).
   * Liefert ausserdem den Festpreis, der beim Vertragsschluss eingefroren wird.
   */
  vorpruefung: applicationProcedure.query(async ({ ctx }) => {
    const antrag = await ladeAntrag(ctx.application.id);
    const result = berechneAntrag(antrag);
    const ergebnis: VorpruefungErgebnis = vorpruefung({
      unternehmensart: antrag.mandant?.unternehmensart ?? null,
      auszahlungEur: result.auszahlung,
      triageKeineEuRueckforderung: antrag.triageKeineEuRueckforderung,
    });
    return {
      ergebnis,
      berechnung: result,
      preis: preisFuerBerechnung(result, antrag.istFolgejahr),
    };
  }),

  /**
   * Schliesst Schritt 3b ab: zwei getrennte Willenserklaerungen mit je eigener
   * Zustimmung und Signatur (TODO 1.4). Erzeugt beide PDFs, friert den Preis
   * ein und setzt den Status auf SIGNED.
   */
  signVertraege: applicationProcedure
    .input(
      z.object({
        signerName: z.string().min(2).max(160),
        email: z.string().email().max(200),
        agbAccepted: z.literal(true),
        vertretungsBerechtigt: z.literal(true),
        aufbereitung: z.object({
          accepted: z.literal(true),
          signatureDataUrl: signaturSchema,
        }),
        kanzleimandat: z.object({
          accepted: z.literal(true),
          signatureDataUrl: signaturSchema,
        }),
        anbieterName: z.string().min(1).max(200),
        kanzleiName: z.string().min(1).max(200),
        kanzleiAnwalt: z.string().min(1).max(160),
        /**
         * Version des im Client angezeigten Wortlauts. Weicht sie von der
         * serverseitig gebundenen `CONSENT_VERSION` ab, wird abgewiesen.
         */
        consentVersion: z.string().max(40).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Rechtssicherheit: eine Signatur darf nur erfasst werden, wenn die
      // Beweis-Artefakte (PNG + PDF) real persistiert werden koennen.
      if (
        !hasSupabaseCredentials() &&
        env().ALLOW_LOCAL_STORAGE_FALLBACK !== true
      ) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Dokument-Speicher ist nicht konfiguriert — Signatur kann nicht rechtssicher abgelegt werden.",
        });
      }
      if (input.consentVersion && input.consentVersion !== CONSENT_VERSION) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Die Vertragstexte wurden inzwischen aktualisiert. Bitte Seite neu laden und erneut bestaetigen.",
        });
      }

      const antrag = await ladeAntrag(ctx.application.id);
      if (antrag.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Antrag wurde bereits unterschrieben.",
        });
      }

      // Vorpruefung: nicht anspruchsberechtigte Faelle erreichen den Vertrag nicht.
      const result = berechneAntrag(antrag);
      const vp = vorpruefung({
        unternehmensart: antrag.mandant?.unternehmensart ?? null,
        auszahlungEur: result.auszahlung,
        triageKeineEuRueckforderung: antrag.triageKeineEuRueckforderung,
      });
      if (vp.status === "hardstop") {
        throw new TRPCError({ code: "BAD_REQUEST", message: vp.gruende.join(" ") });
      }

      // Alles, was der Kunde vor der Unterschrift liefern muss, ueber das Gate.
      const fehlend = pruefeVollstaendigkeit(antrag, "uebergabe").filter(
        (f) => !SIGNATUR_FELDER.has(f.feld),
      );
      if (fehlend.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Bitte vorher ergaenzen: ${fehlend.map((f) => f.label).join(", ")}.`,
        });
      }

      const preis = preisFuerBerechnung(result, antrag.istFolgejahr);
      if (preis.band === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Fuer diesen Verbrauch bieten wir keinen Festpreis an (unter 150 MWh nach Abzuegen).",
        });
      }

      const m = antrag.mandant!;
      const partei: VertragsPartei = {
        firmenname: m.firmenname,
        rechtsform: m.rechtsform ?? "",
        geschaeftsfuehrer: m.geschaeftsfuehrer ?? "",
        strasse: m.strasse ?? "",
        plz: m.plz ?? "",
        ort: m.ort ?? "",
        email: input.email,
      };
      const signedAt = new Date();
      const antragsjahr = antrag.antragsjahr!;

      const speichere = async (name: string, bytes: Uint8Array, mime: string) =>
        (await uploadGenerated(antrag.id, name, bytes, mime)).key;
      const pngBytes = (dataUrl: string) =>
        Uint8Array.from(Buffer.from(dataUrl.split(",")[1] ?? "", "base64"));

      // 1) Aufbereitungsvertrag (unser Vertrag, Festpreis)
      const aufbereitungPdf = await generateAufbereitungsvertragPdf({
        antragId: antrag.id,
        antragsjahr,
        mandant: partei,
        anbieterName: input.anbieterName,
        preisEur: preis.preisEur,
        preisTabelleVersion: preis.version,
        istFolgejahr: antrag.istFolgejahr,
        signatur: {
          signerName: input.signerName,
          signerIp: ctx.ip,
          signedAt,
          signatureDataUrl: input.aufbereitung.signatureDataUrl,
          consentVersion: CONSENT_VERSION,
        },
      });
      // 2) Kanzleimandat + Vollmacht
      const kanzleimandatPdf = await generateKanzleimandatPdf({
        antragId: antrag.id,
        antragsjahr,
        mandant: partei,
        kanzleiName: input.kanzleiName,
        kanzleiAnwalt: input.kanzleiAnwalt,
        signatur: {
          signerName: input.signerName,
          signerIp: ctx.ip,
          signedAt,
          signatureDataUrl: input.kanzleimandat.signatureDataUrl,
          consentVersion: CONSENT_VERSION,
        },
      });

      const aufbereitungPdfSha256 = sha256Hex(aufbereitungPdf);
      const kanzleimandatPdfSha256 = sha256Hex(kanzleimandatPdf);
      const consentTextSha256 = sha256Hex(canonicalConsentText());

      const [aufbereitungPngKey, kanzleimandatPngKey, aufbereitungPdfKey, kanzleimandatPdfKey] =
        await Promise.all([
          speichere(`signatur-aufbereitung-${antrag.id}.png`, pngBytes(input.aufbereitung.signatureDataUrl), "image/png"),
          speichere(`signatur-kanzleimandat-${antrag.id}.png`, pngBytes(input.kanzleimandat.signatureDataUrl), "image/png"),
          speichere(`aufbereitungsvertrag-${antrag.id}.pdf`, aufbereitungPdf, "application/pdf"),
          speichere(`kanzleimandat-${antrag.id}.pdf`, kanzleimandatPdf, "application/pdf"),
        ]);

      // 3) Antrag + Mandant updaten, Status SIGNED, zwei Audit-Eintraege (atomar).
      return prisma.$transaction(async (tx) => {
        await tx.mandant.update({ where: { id: m.id }, data: { email: input.email } });
        const updated = await tx.antrag.update({
          where: { id: antrag.id },
          data: {
            agbAccepted: true,
            vertretungsBerechtigt: true,
            mandatSignerName: input.signerName,
            mandatSignerIp: ctx.ip,
            mandatSignerUserAgent: ctx.userAgent,
            consentVersion: CONSENT_VERSION,
            consentTextSha256,
            aufbereitungAccepted: true,
            aufbereitungSignedAt: signedAt,
            aufbereitungSignaturePngKey: aufbereitungPngKey,
            aufbereitungPdfKey,
            aufbereitungPdfSha256,
            kanzleimandatAccepted: true,
            kanzleimandatSignedAt: signedAt,
            kanzleimandatSignaturePngKey: kanzleimandatPngKey,
            kanzleimandatPdfKey,
            kanzleimandatPdfSha256,
            preisEur: preis.preisEur,
            preisTabelleVersion: preis.version,
            bruttoKwh: result.bruttoKwh,
            nettoKwh: result.nettoKwh,
            bruttoErstattung: result.bruttoErstattung,
            status: "SIGNED",
          },
        });
        const gemeinsam = {
          antragId: antrag.id,
          actor: "CUSTOMER" as const,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        };
        await logAudit(
          {
            ...gemeinsam,
            type: "AUFBEREITUNG_SIGNED",
            metadata: {
              signerName: input.signerName,
              pdfKey: aufbereitungPdfKey,
              pdfSha256: aufbereitungPdfSha256,
              signaturePngKey: aufbereitungPngKey,
              preisEur: preis.preisEur,
              preisTabelleVersion: preis.version,
              consentVersion: CONSENT_VERSION,
              consentTextSha256,
            },
          },
          tx,
        );
        await logAudit(
          {
            ...gemeinsam,
            type: "KANZLEIMANDAT_SIGNED",
            metadata: {
              signerName: input.signerName,
              pdfKey: kanzleimandatPdfKey,
              pdfSha256: kanzleimandatPdfSha256,
              signaturePngKey: kanzleimandatPngKey,
              kanzleiName: input.kanzleiName,
              consentVersion: CONSENT_VERSION,
              consentTextSha256,
            },
          },
          tx,
        );
        return updated;
      });
    }),

  /**
   * Schliesst den Antrag final ab:
   *  - prueft die Vollstaendigkeit (Phase "uebergabe")
   *  - generiert das Kanzlei-Paket (Datenblatt-Excel + beide Vertraege + Belege)
   *  - benachrichtigt Kunde + Kanzlei per Mail
   *  - Status SIGNED -> PENDING_REVIEW
   *
   * Idempotent — bei PENDING_REVIEW wird nur der Antrag zurueckgegeben.
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
      const antrag = await ladeAntrag(ctx.application.id);

      if (antrag.status === "PENDING_REVIEW" || antrag.status === "SUBMITTED") {
        return antrag;
      }
      if (antrag.status !== "SIGNED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Antrag noch nicht unterschrieben.",
        });
      }
      const email = antrag.mandant?.email;
      if (!email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Keine Kunden-E-Mail hinterlegt.",
        });
      }
      const fehlend = pruefeVollstaendigkeit(antrag, "uebergabe");
      if (fehlend.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Antrag unvollstaendig: ${fehlend.map((f) => f.label).join(", ")}.`,
        });
      }

      // 1) Kanzlei-Paket erzeugen + hochladen.
      const zipBytes = await generateKanzleiPaket({
        antrag,
        brand: { name: input.brandName, shortName: input.brandShortName },
        kanzlei: { name: input.kanzleiName, anwalt: input.kanzleiAnwalt },
      });
      const paketUpload = await uploadGenerated(
        antrag.id,
        `kanzlei-paket-${antrag.id}.zip`,
        zipBytes,
        "application/zip",
      );

      const submittedAt = new Date();
      const statusUrl = `${e.APP_BASE_URL}/status/${antrag.sessionToken}`;
      const paketDownloadUrl = await getGeneratedDownloadUrl(
        paketUpload.key,
        60 * 60 * 24 * 7, // 7 Tage
      ).catch(() => `${e.APP_BASE_URL}/admin/eingang`);

      const result = berechneAntrag(antrag);
      const preisEur = antrag.preisEur !== null ? Number(antrag.preisEur) : null;
      const firmenname = antrag.mandant?.firmenname ?? "Antragsteller";
      const antragsjahr = antrag.antragsjahr ?? new Date().getFullYear() - 1;

      // 2) Mails parallel versenden — Fehler sind nicht fatal.
      const customerMail = renderAntragBestaetigt({
        brand: { name: input.brandName, shortName: input.brandShortName },
        firmenname,
        antragsjahr,
        bruttoErstattung: result.bruttoErstattung,
        erstattung: result.auszahlung,
        preisEur,
        statusUrl,
        kanzleiName: input.kanzleiName,
      });
      const kanzleiMail = renderNeuerAntragKanzlei({
        brand: { name: input.brandName, shortName: input.brandShortName },
        applicationId: antrag.id,
        firmenname,
        geschaeftsfuehrer: antrag.mandant?.geschaeftsfuehrer ?? "—",
        antragsjahr,
        bruttoErstattung: result.bruttoErstattung,
        erstattung: result.auszahlung,
        preisEur,
        needs1456: antrag.nutzenergieAnDritteWeitergegeben === true,
        paketDownloadUrl,
        kundenEmail: email,
      });

      const [customerResult, kanzleiResult] = await Promise.allSettled([
        sendMail({
          to: email,
          subject: "Ihr § 9b-Antrag ist eingegangen",
          html: customerMail.html,
          text: customerMail.text,
          replyTo: e.KANZLEI_EMAIL_INBOX,
        }),
        sendMail({
          to: e.KANZLEI_EMAIL_INBOX,
          subject: `Neuer § 9b-Mandant: ${firmenname}`,
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
        const updated = await tx.antrag.update({
          where: { id: antrag.id },
          data: {
            status: "PENDING_REVIEW",
            submittedAt,
            kanzleiPaketKey: paketUpload.key,
          },
        });
        await logAudit(
          {
            antragId: antrag.id,
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
