import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { ocrPdfLokal } from "./pdf-local";

/** Baut ein echtes Text-PDF, wie es Versorger als Monatsrechnung verschicken. */
async function rechnungPdf(zeilen: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  zeilen.forEach((text, i) => page.drawText(text, { x: 50, y: 790 - i * 18, size: 11, font }));
  // Zweite Seite: Textract sync wuerde ablehnen, lokal muss es gehen.
  doc.addPage([595, 842]).drawText("Seite 2 - Allgemeine Hinweise", { x: 50, y: 790, size: 11, font });
  return doc.save();
}

describe("ocrPdfLokal (echtes PDF)", () => {
  it("liest Menge, Zeitraum, Stromsteuer und MaLo aus einer zweiseitigen Rechnung", async () => {
    const bytes = await rechnungPdf([
      "Stadtwerke Regensburg GmbH",
      "Rechnung Nr. 2025-0815",
      "Lieferstelle: Industriestr. 1, 93055 Regensburg",
      "Marktlokations-ID: 51238696781",
      "Abrechnungszeitraum 01.03.2025 - 31.03.2025",
      "Verbrauchsmenge 64.250 kWh",
      "Stromsteuer 64.250 kWh x 2,05 ct/kWh 1.317,13 EUR",
      "Stromsteuer gesamt 1.317,13 €",
    ]);
    const parsed = await ocrPdfLokal(bytes);
    expect(parsed.versorger).toBe("Stadtwerke");
    expect(parsed.jahresKwh).toBe(64_250);
    expect(parsed.periodStart?.toISOString().slice(0, 10)).toBe("2025-03-01");
    expect(parsed.periodEnd?.toISOString().slice(0, 10)).toBe("2025-03-31");
    expect(parsed.stromsteuerGezahlt).toBe(1317.13);
    expect(parsed.zaehlpunkt).toBe("51238696781");
    expect(parsed.adresse).toBe("Industriestr. 1, 93055 Regensburg");
    expect(parsed.confidence).toBe(1);
  });
});
