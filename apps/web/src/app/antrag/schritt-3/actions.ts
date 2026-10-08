"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { BRAND } from "@/config/brand";
import { getServerCaller } from "@/server/trpc";

const firmaSchema = z.object({
  firmenname: z.string().min(1).max(200),
  rechtsform: z.string().min(1).max(60),
  geschaeftsfuehrer: z.string().min(1).max(160),
  vorname: z.string().min(1).max(80),
  nachname: z.string().min(1).max(80),
  telefon: z.string().max(60).optional().or(z.literal("")),
  strasse: z.string().min(1).max(160),
  plz: z.string().regex(/^\d{5}$/, "PLZ muss 5-stellig sein"),
  ort: z.string().min(1).max(120),
  unternehmensart: z.enum(["PRODUZIERENDES_GEWERBE", "LAND_FORSTWIRTSCHAFT", "KEINE"], {
    errorMap: () => ({ message: "Bitte die Unternehmensart wählen." }),
  }),
  steuernummer: z.string().min(5, "Bitte die Steuernummer angeben.").max(40),
  ustIdNr: z.string().max(20).optional().or(z.literal("")),
  handelsregister: z.string().max(60).optional().or(z.literal("")),
  wzCode: z.string().max(20).optional().or(z.literal("")),
  hauptzollamt: z.string().min(2, "Bitte das zuständige Hauptzollamt angeben.").max(80),
  kontoinhaber: z.string().min(1, "Bitte den Kontoinhaber angeben.").max(200),
  iban: z.string().min(15, "Bitte eine gültige IBAN angeben.").max(42),
  bic: z.string().max(11).optional().or(z.literal("")),
});

const optional = (v: string | undefined) => (v && v.trim().length > 0 ? v : undefined);

export type FirmaResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveFirmaAction(
  _prev: FirmaResult | null,
  formData: FormData,
): Promise<FirmaResult> {
  const parsed = firmaSchema.safeParse({
    firmenname: formData.get("firmenname"),
    rechtsform: formData.get("rechtsform"),
    geschaeftsfuehrer: formData.get("geschaeftsfuehrer"),
    vorname: formData.get("vorname"),
    nachname: formData.get("nachname"),
    telefon: formData.get("telefon") ?? "",
    strasse: formData.get("strasse"),
    plz: formData.get("plz"),
    ort: formData.get("ort"),
    unternehmensart: formData.get("unternehmensart"),
    steuernummer: formData.get("steuernummer"),
    ustIdNr: formData.get("ustIdNr") ?? "",
    handelsregister: formData.get("handelsregister") ?? "",
    wzCode: formData.get("wzCode") ?? "",
    hauptzollamt: formData.get("hauptzollamt"),
    kontoinhaber: formData.get("kontoinhaber"),
    iban: formData.get("iban"),
    bic: formData.get("bic") ?? "",
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, error: first?.message ?? "Eingaben unvollstaendig." };
  }
  // Vorpruefung: ohne passende Unternehmensart gibt es keinen Anspruch.
  if (parsed.data.unternehmensart === "KEINE") {
    return {
      ok: false,
      error:
        "Die Entlastung nach § 9b StromStG steht nur Unternehmen des Produzierenden Gewerbes und der Land- und Forstwirtschaft zu. Einen Vertrag schließen wir deshalb nicht ab, es entstehen Ihnen keine Kosten.",
    };
  }
  try {
    const caller = await getServerCaller();
    await caller.application.updateFirma({
      firmenname: parsed.data.firmenname,
      rechtsform: parsed.data.rechtsform,
      geschaeftsfuehrer: parsed.data.geschaeftsfuehrer,
      vorname: parsed.data.vorname,
      nachname: parsed.data.nachname,
      telefon:
        parsed.data.telefon && parsed.data.telefon.length > 0
          ? parsed.data.telefon
          : undefined,
      strasse: parsed.data.strasse,
      plz: parsed.data.plz,
      ort: parsed.data.ort,
      unternehmensart: parsed.data.unternehmensart,
      steuernummer: parsed.data.steuernummer,
      ustIdNr: optional(parsed.data.ustIdNr),
      handelsregister: optional(parsed.data.handelsregister),
      wzCode: optional(parsed.data.wzCode),
      hauptzollamt: parsed.data.hauptzollamt,
      kontoinhaber: parsed.data.kontoinhaber,
      iban: parsed.data.iban,
      bic: optional(parsed.data.bic),
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Speichern fehlgeschlagen.",
    };
  }
  revalidatePath("/antrag/schritt-3/firma");
  redirect("/antrag/schritt-3/vollmacht");
}

const pngDataUrl = z.string().startsWith("data:image/png;base64,");

const signSchema = z.object({
  signerName: z.string().min(2).max(160),
  email: z.string().email(),
  agbAccepted: z.literal("true"),
  vertretungsBerechtigt: z.literal("true"),
  aufbereitungAccepted: z.literal("true"),
  aufbereitungSignatur: pngDataUrl,
  kanzleimandatAccepted: z.literal("true"),
  kanzleimandatSignatur: pngDataUrl,
  consentVersion: z.string().max(40).optional(),
});

export type SignResult =
  | { ok: true }
  | { ok: false; error: string };

/** Zwei getrennte Vertraege mit je eigener Unterschrift (TODO 1.4). */
export async function signVertraegeAction(
  _prev: SignResult | null,
  formData: FormData,
): Promise<SignResult> {
  const parsed = signSchema.safeParse({
    signerName: formData.get("signerName"),
    email: formData.get("email"),
    agbAccepted: formData.get("agbAccepted"),
    vertretungsBerechtigt: formData.get("vertretungsBerechtigt"),
    aufbereitungAccepted: formData.get("aufbereitungAccepted"),
    aufbereitungSignatur: formData.get("aufbereitungSignatur"),
    kanzleimandatAccepted: formData.get("kanzleimandatAccepted"),
    kanzleimandatSignatur: formData.get("kanzleimandatSignatur"),
    consentVersion: formData.get("consentVersion") ?? undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error:
        first?.message === "Invalid input"
          ? "Bitte alle Pflichtfelder ausfuellen (Name, E-Mail, alle Zustimmungen, beide Unterschriften)."
          : (first?.message ?? "Eingaben ungueltig."),
    };
  }
  try {
    const caller = await getServerCaller();
    await caller.application.signVertraege({
      signerName: parsed.data.signerName,
      email: parsed.data.email,
      agbAccepted: true,
      vertretungsBerechtigt: true,
      aufbereitung: { accepted: true, signatureDataUrl: parsed.data.aufbereitungSignatur },
      kanzleimandat: { accepted: true, signatureDataUrl: parsed.data.kanzleimandatSignatur },
      anbieterName: BRAND.name,
      kanzleiName: BRAND.kanzlei.name,
      kanzleiAnwalt: BRAND.kanzlei.anwalt,
      consentVersion: parsed.data.consentVersion,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unterschreiben fehlgeschlagen.",
    };
  }
  revalidatePath("/antrag/schritt-3/vollmacht");
  redirect("/antrag/danke");
}
