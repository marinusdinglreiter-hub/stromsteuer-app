import { PDFParse } from "pdf-parse";

import { parseStromrechnung, type ParsedBeleg } from "./parser";

/**
 * Lokale PDF-Textextraktion ohne Cloud-Dienst.
 * Funktioniert fuer text-basierte PDFs (nicht gescannte Bilder), auch
 * mehrseitig. pdf-parse ab 2.x: Klassen-API statt Funktion.
 */
export async function ocrPdfLokal(bytes: Uint8Array): Promise<ParsedBeleg> {
  // Kopie, weil pdf.js den uebergebenen Puffer an den Worker abgeben kann.
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const result = await parser.getText();
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
  } finally {
    await parser.destroy();
  }
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
