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
});

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
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, error: first?.message ?? "Eingaben unvollstaendig." };
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

const signSchema = z.object({
  signerName: z.string().min(2).max(160),
  email: z.string().email(),
  signatureDataUrl: z
    .string()
    .startsWith("data:image/png;base64,"),
  agbAccepted: z.literal("true"),
  mandatAccepted: z.literal("true"),
  vertretungsBerechtigt: z.literal("true"),
});

export type SignResult =
  | { ok: true }
  | { ok: false; error: string };

export async function signMandatAction(
  _prev: SignResult | null,
  formData: FormData,
): Promise<SignResult> {
  const parsed = signSchema.safeParse({
    signerName: formData.get("signerName"),
    email: formData.get("email"),
    signatureDataUrl: formData.get("signatureDataUrl"),
    agbAccepted: formData.get("agbAccepted"),
    mandatAccepted: formData.get("mandatAccepted"),
    vertretungsBerechtigt: formData.get("vertretungsBerechtigt"),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error:
        first?.message === "Invalid input"
          ? "Bitte alle Pflichtfelder ausfuellen (Name, E-Mail, alle 3 Zustimmungen, Signatur)."
          : (first?.message ?? "Eingaben ungueltig."),
    };
  }
  try {
    const caller = await getServerCaller();
    await caller.application.signMandat({
      signerName: parsed.data.signerName,
      email: parsed.data.email,
      agbAccepted: true,
      mandatAccepted: true,
      vertretungsBerechtigt: true,
      signatureDataUrl: parsed.data.signatureDataUrl,
      kanzleiName: BRAND.kanzlei.name,
      kanzleiAnwalt: BRAND.kanzlei.anwalt,
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
