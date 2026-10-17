"use server";

import {
  extrahiereBeleg,
  istWirtschaftlich,
  isOcrAvailable,
  MINDEST_KWH_WIRTSCHAFTLICH,
  sha256Hex,
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
      kwhEigenbetrieblich: parsed.data.jahresKwh,
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
      /** Wie der Beleg zugeordnet wurde (gewaehlt, Zaehlpunkt, Adresse, neu) */
      zuordnung: BelegZuordnung;
      anzahlBelege: number;
      /** Summe aller erkannten Mengen dieser Lieferstelle */
      belegSummeKwh: number | null;
      /** Menge der Lieferstelle nach dem Upload */
      kwhEigenbetrieblich: number;
      /** false = Kunde hatte die Menge von Hand geaendert, sie bleibt stehen */
      mengeUebernommen: boolean;
    }
  | { ok: false; error: string };

export type BelegZuordnung = "gewaehlt" | "zaehlpunkt" | "adresse" | "neu";

export type SerializedParsedBeleg = Omit<
  ParsedBeleg,
  "periodStart" | "periodEnd" | "rawLines"
> & {
  periodStart: string | null;
  periodEnd: string | null;
};

function serializeParsed(parsed: ParsedBeleg): SerializedParsedBeleg {
  const { rawLines: _rawLines, ...rest } = parsed;
  return {
    ...rest,
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
 * Nimmt eine hochgeladene Rechnung an: Duplikat pruefen, nach Supabase
 * Storage schieben, Werte auslesen (Textract, sonst lokale PDF-Extraktion)
 * und als Beleg erfassen. Mit `lieferstelleId` an diese Lieferstelle, sonst
 * automatisch zugeordnet (Zaehlpunkt, Adresse) oder als neue Lieferstelle.
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
  const sha256 = sha256Hex(bytes);

  // 1) Dieselbe Datei nicht zweimal zaehlen.
  const duplikat = await caller.lieferstelle.belegDuplikat({ sha256 });
  if (duplikat) {
    return {
      ok: false,
      error: `Diese Rechnung wurde bereits hochgeladen (${duplikat}).`,
    };
  }

  // 2) Datei nach Storage. Wenn Supabase nicht konfiguriert ist, geht das
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

  // 3) Werte auslesen.
  const { parsed, methode, versucht } = await extrahiereBeleg(bytes, file.type);
  const extractionStatus: ExtractionStatus = !versucht
    ? "unavailable"
    : parsed.confidence > 0
      ? "ok"
      : "empty";

  // 4) Beleg erfassen, Lieferstelle zuordnen und Summen nachziehen.
  try {
    const erfasst = await caller.lieferstelle.belegErfassen({
      lieferstelleId:
        typeof lieferstelleIdRaw === "string" && lieferstelleIdRaw.length > 0
          ? lieferstelleIdRaw
          : undefined,
      storageKey,
      dateiname: file.name.slice(0, 255),
      sha256,
      extraktion: methode,
      kwh: parsed.jahresKwh,
      zeitraumVon: parsed.periodStart,
      zeitraumBis: parsed.periodEnd,
      stromsteuerEur: parsed.stromsteuerGezahlt,
      versorger: parsed.versorger,
      adresse: parsed.adresse?.slice(0, 300) ?? null,
      zaehlpunkt: parsed.zaehlpunkt,
      ocrConfidence: versucht ? parsed.confidence : null,
    });
    revalidatePath(SCHRITT2_PATH);
    return {
      ok: true,
      storageKey,
      parsed: serializeParsed(parsed),
      ocrAvailable: isOcrAvailable(),
      extractionStatus,
      ...erfasst,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Rechnung konnte nicht gespeichert werden.",
    };
  }
}

/** Speichert + navigiert zu Schritt 2b (Erklaerungen). */
export async function weiterZuErklaerungenAction(): Promise<void> {
  const caller = await getServerCaller();
  const list = await caller.lieferstelle.list();
  if (list.length === 0) {
    redirect(`${SCHRITT2_PATH}?error=Bitte%20mindestens%20eine%20Lieferstelle%20erfassen.`);
  }
  const summe = list.reduce(
    (acc, l) => acc + l.kwhEigenbetrieblich + l.kwhNutzenergiePG + l.kwhNutzenergieLuF,
    0,
  );
  if (!istWirtschaftlich(summe)) {
    redirect(
      `${SCHRITT2_PATH}?error=${encodeURIComponent(
        `Summe der Lieferstellen unter ${MINDEST_KWH_WIRTSCHAFTLICH.toLocaleString("de-DE")} kWh – dafür bieten wir keinen Festpreis an.`,
      )}`,
    );
  }
  redirect("/antrag/schritt-2/erklaerungen");
}
