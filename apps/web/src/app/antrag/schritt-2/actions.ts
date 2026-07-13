"use server";

import {
  isOcrAvailable,
  isPdfFile,
  ocrPdfLokal,
  ocrStromrechnung,
  uploadBeleg,
  type ParsedBeleg,
} from "@stromsteuer/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerCaller } from "@/server/trpc";

const SCHRITT2_PATH = "/antrag/schritt-2/lieferstellen";

const saveSchema = z.object({
  id: z.string().min(1),
  firmenname: z.string().min(1).max(200),
  adresse: z.string().min(1).max(300),
  plz: z
    .string()
    .regex(/^\d{5}$/)
    .optional()
    .or(z.literal("")),
  jahresKwh: z.coerce.number().int().min(0).max(50_000_000),
});

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveLieferstelleAction(
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  const parsed = saveSchema.safeParse({
    id: formData.get("id"),
    firmenname: formData.get("firmenname"),
    adresse: formData.get("adresse"),
    plz: formData.get("plz") ?? "",
    jahresKwh: formData.get("jahresKwh"),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, error: first?.message ?? "Eingaben ungueltig." };
  }

  try {
    const caller = await getServerCaller();
    await caller.lieferstelle.update({
      id: parsed.data.id,
      firmenname: parsed.data.firmenname,
      adresse: parsed.data.adresse,
      plz:
        parsed.data.plz && parsed.data.plz.length > 0
          ? parsed.data.plz
          : undefined,
      jahresKwh: parsed.data.jahresKwh,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Speichern fehlgeschlagen.",
    };
  }
  revalidatePath(SCHRITT2_PATH);
  return { ok: true };
}

export async function createEmptyLieferstelleAction(): Promise<void> {
  const caller = await getServerCaller();
  await caller.lieferstelle.create();
  revalidatePath(SCHRITT2_PATH);
}

export async function deleteLieferstelleAction(id: string): Promise<void> {
  const caller = await getServerCaller();
  await caller.lieferstelle.delete({ id });
  revalidatePath(SCHRITT2_PATH);
}

/**
 * Ergebnis der automatischen Extraktion:
 *  - "ok"          — es wurden Werte gelesen (confidence > 0)
 *  - "empty"       — Extraktion lief, fand aber nichts (z. B. gescanntes
 *                    Bild-PDF ohne Textlayer)
 *  - "unavailable" — keine automatische Erkennung moeglich (Bilddatei ohne
 *                    Cloud-OCR, kein lokaler Fallback)
 */
export type ExtractionStatus = "ok" | "empty" | "unavailable";

export type UploadOcrResult =
  | {
      ok: true;
      lieferstelleId: string;
      storageKey: string;
      parsed: SerializedParsedBeleg;
      ocrAvailable: boolean;
      extractionStatus: ExtractionStatus;
    }
  | { ok: false; error: string };

export type SerializedParsedBeleg = Omit<
  ParsedBeleg,
  "periodStart" | "periodEnd"
> & {
  periodStart: string | null;
  periodEnd: string | null;
};

function serializeParsed(parsed: ParsedBeleg): SerializedParsedBeleg {
  return {
    ...parsed,
    periodStart: parsed.periodStart?.toISOString() ?? null,
    periodEnd: parsed.periodEnd?.toISOString() ?? null,
  };
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // Textract sync-Limit
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

/**
 * Nimmt eine hochgeladene Datei, schiebt sie nach Supabase Storage und
 * laeuft (falls AWS-Credentials gesetzt) durch Textract. Optional bestehende
 * Lieferstelle anhaengen, sonst neue erstellen. Rueckgabe enthaelt parsed-Werte
 * zur Vorbefuellung der Karte im Browser.
 */
export async function uploadAndOcrAction(
  formData: FormData,
): Promise<UploadOcrResult> {
  const file = formData.get("file");
  const lieferstelleIdRaw = formData.get("lieferstelleId");
  if (!(file instanceof File)) {
    return { ok: false, error: "Keine Datei im Upload gefunden." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `Datei zu gross (${(file.size / 1024 / 1024).toFixed(1)} MB). Max. 5 MB pro Beleg.`,
    };
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return {
      ok: false,
      error: `Dateityp ${file.type || "unbekannt"} nicht unterstuetzt (PDF, JPG, PNG).`,
    };
  }

  const caller = await getServerCaller();
  const application = await caller.application.current();

  const bytes = new Uint8Array(await file.arrayBuffer());

  // 1) Datei nach Storage. Wenn Supabase nicht konfiguriert ist, geht das
  // hier auf eine klare Fehlermeldung.
  let storageKey: string;
  try {
    const upload = await uploadBeleg(
      application.id,
      file.name,
      bytes,
      file.type,
    );
    storageKey = upload.key;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Upload fehlgeschlagen.",
    };
  }

  // 2) OCR: AWS Textract wenn konfiguriert, sonst lokale PDF-Extraktion als Fallback.
  let parsed: ParsedBeleg = {
    versorger: null,
    periodStart: null,
    periodEnd: null,
    jahresKwh: null,
    adresse: null,
    stromsteuerGezahlt: null,
    confidence: 0,
    rawLines: [],
  };
  // Wurde ueberhaupt ein Extraktionsweg genutzt? Bei Bilddateien ohne
  // Cloud-OCR gibt es keinen lokalen Fallback -> "unavailable".
  let versuchteExtraktion = false;
  if (isOcrAvailable()) {
    versuchteExtraktion = true;
    try {
      parsed = await ocrStromrechnung(bytes);
    } catch (err) {
      console.warn("[uploadAndOcrAction] Textract fehlgeschlagen:", err);
    }
  } else if (isPdfFile(file.type)) {
    versuchteExtraktion = true;
    try {
      parsed = await ocrPdfLokal(bytes);
    } catch (err) {
      console.warn("[uploadAndOcrAction] Lokale PDF-Extraktion fehlgeschlagen:", err);
    }
  }

  const extractionStatus: ExtractionStatus = !versuchteExtraktion
    ? "unavailable"
    : parsed.confidence > 0
      ? "ok"
      : "empty";

  // 3) Lieferstelle aktualisieren oder neu anlegen.
  const lieferstelleId =
    typeof lieferstelleIdRaw === "string" && lieferstelleIdRaw.length > 0
      ? lieferstelleIdRaw
      : null;

  if (lieferstelleId) {
    // Bestehende Lieferstelle: belegFileKeys appenden, kWh nur ueberschreiben
    // wenn bisher 0.
    const existing = await caller.lieferstelle.list();
    const current = existing.find((l) => l.id === lieferstelleId);
    if (!current) {
      return { ok: false, error: "Lieferstelle nicht gefunden." };
    }
    await caller.lieferstelle.update({
      id: lieferstelleId,
      firmenname:
        current.firmenname || parsed.versorger
          ? current.firmenname || parsed.versorger || undefined
          : undefined,
      adresse:
        current.adresse || parsed.adresse
          ? current.adresse || parsed.adresse || undefined
          : undefined,
      jahresKwh:
        current.jahresKwh === 0 && parsed.jahresKwh != null
          ? parsed.jahresKwh
          : undefined,
      belegFileKeys: [...current.belegFileKeys, storageKey],
      ocrConfidence: parsed.confidence,
    });
    revalidatePath(SCHRITT2_PATH);
    return {
      ok: true,
      lieferstelleId,
      storageKey,
      parsed: serializeParsed(parsed),
      ocrAvailable: isOcrAvailable(),
      extractionStatus,
    };
  }

  // Neue Lieferstelle aus OCR-Ergebnis (MassenUpload-Flow).
  const created = await caller.lieferstelle.create({
    firmenname: parsed.versorger ?? "",
    adresse: parsed.adresse ?? "",
    jahresKwh: parsed.jahresKwh ?? 0,
    belegFileKeys: [storageKey],
    ocrConfidence: parsed.confidence,
  });
  revalidatePath(SCHRITT2_PATH);
  return {
    ok: true,
    lieferstelleId: created.id,
    storageKey,
    parsed: serializeParsed(parsed),
    ocrAvailable: isOcrAvailable(),
    extractionStatus,
  };
}

/** Speichert + navigiert zu Schritt 2b (Erklaerungen). */
export async function weiterZuErklaerungenAction(): Promise<void> {
  const caller = await getServerCaller();
  const list = await caller.lieferstelle.list();
  if (list.length === 0) {
    redirect(`${SCHRITT2_PATH}?error=Bitte%20mindestens%20eine%20Lieferstelle%20erfassen.`);
  }
  const summe = list.reduce((acc, l) => acc + l.jahresKwh, 0);
  if (summe < 40_000) {
    redirect(
      `${SCHRITT2_PATH}?error=Summe%20der%20Lieferstellen%20unter%2040.000%20kWh%20-%20Antrag%20wirtschaftlich%20nicht%20sinnvoll.`,
    );
  }
  redirect("/antrag/schritt-2/erklaerungen");
}
