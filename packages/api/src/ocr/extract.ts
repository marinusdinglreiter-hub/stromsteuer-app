import type { ParsedBeleg } from "./parser";
import { isPdfFile, ocrPdfLokal } from "./pdf-local";
import { isOcrAvailable, ocrStromrechnung } from "./textract";

/** Welcher Weg die Werte geliefert hat; landet am Beleg und im Pruefprotokoll. */
export type ExtraktionsMethode = "textract" | "pdf-lokal" | "keine";

export type ExtraktionsErgebnis = {
  parsed: ParsedBeleg;
  methode: ExtraktionsMethode;
  /** Wurde ueberhaupt ein Extraktionsweg versucht? */
  versucht: boolean;
};

export const LEERES_ERGEBNIS: ParsedBeleg = {
  versorger: null,
  periodStart: null,
  periodEnd: null,
  jahresKwh: null,
  adresse: null,
  stromsteuerGezahlt: null,
  zaehlpunkt: null,
  confidence: 0,
  rawLines: [],
};

/**
 * Liest eine Rechnung aus. Reihenfolge:
 *  1. AWS Textract, falls konfiguriert. Der synchrone Aufruf lehnt
 *     mehrseitige PDFs ab — dann und bei jedem anderen Fehler weiter mit 2.
 *  2. Lokale PDF-Textextraktion (nur PDFs mit Textlayer).
 * Bilddateien ohne Textract bleiben ohne Ergebnis; der Kunde traegt manuell ein.
 */
export async function extrahiereBeleg(
  bytes: Uint8Array,
  mimeType: string,
): Promise<ExtraktionsErgebnis> {
  let versucht = false;

  if (isOcrAvailable()) {
    versucht = true;
    try {
      const parsed = await ocrStromrechnung(bytes);
      if (parsed.confidence > 0 || !isPdfFile(mimeType)) {
        return { parsed, methode: "textract", versucht };
      }
    } catch (err) {
      console.warn("[extrahiereBeleg] Textract fehlgeschlagen, versuche lokale Extraktion:", err);
    }
  }

  if (isPdfFile(mimeType)) {
    versucht = true;
    try {
      const parsed = await ocrPdfLokal(bytes);
      return { parsed, methode: "pdf-lokal", versucht };
    } catch (err) {
      console.warn("[extrahiereBeleg] Lokale PDF-Extraktion fehlgeschlagen:", err);
    }
  }

  return { parsed: LEERES_ERGEBNIS, methode: "keine", versucht };
}
