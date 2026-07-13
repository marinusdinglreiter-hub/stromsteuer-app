import { parseStromrechnung, type ParsedBeleg } from "./parser";

// pdf-parse ist ein CommonJS-Modul — require() ist zuverlaessiger als ESM-import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buf: Buffer,
) => Promise<{ text: string }>;

/**
 * Lokale PDF-Textextraktion ohne Cloud-Dienst.
 * Funktioniert fuer text-basierte PDFs (nicht gescannte Bilder).
 */
export async function ocrPdfLokal(bytes: Uint8Array): Promise<ParsedBeleg> {
  const result = await pdfParse(Buffer.from(bytes));
  const lines = result.text
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  return parseStromrechnung({
    Blocks: lines.map((text: string) => ({
      BlockType: "LINE",
      Text: text,
      Confidence: 95,
    })),
  });
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
