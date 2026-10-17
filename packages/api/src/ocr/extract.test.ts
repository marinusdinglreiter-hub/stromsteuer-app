import { beforeEach, describe, expect, it, vi } from "vitest";

import { LEERES_ERGEBNIS, extrahiereBeleg } from "./extract";

const mocks = vi.hoisted(() => ({
  isOcrAvailable: vi.fn<() => boolean>(),
  ocrStromrechnung: vi.fn(),
  ocrPdfLokal: vi.fn(),
}));

vi.mock("./textract", () => ({
  isOcrAvailable: mocks.isOcrAvailable,
  ocrStromrechnung: mocks.ocrStromrechnung,
}));
vi.mock("./pdf-local", () => ({
  isPdfFile: (mime: string) => mime === "application/pdf",
  ocrPdfLokal: mocks.ocrPdfLokal,
}));

const TREFFER = { ...LEERES_ERGEBNIS, jahresKwh: 1000, confidence: 0.25 };
const bytes = new Uint8Array([1, 2, 3]);

describe("extrahiereBeleg", () => {
  beforeEach(() => vi.resetAllMocks());

  it("nimmt Textract, wenn es Werte liefert", async () => {
    mocks.isOcrAvailable.mockReturnValue(true);
    mocks.ocrStromrechnung.mockResolvedValue(TREFFER);
    const res = await extrahiereBeleg(bytes, "application/pdf");
    expect(res.methode).toBe("textract");
    expect(mocks.ocrPdfLokal).not.toHaveBeenCalled();
  });

  it("faellt bei Textract-Fehler (z. B. mehrseitiges PDF) auf lokale Extraktion zurueck", async () => {
    mocks.isOcrAvailable.mockReturnValue(true);
    mocks.ocrStromrechnung.mockRejectedValue(new Error("UnsupportedDocumentException"));
    mocks.ocrPdfLokal.mockResolvedValue(TREFFER);
    const res = await extrahiereBeleg(bytes, "application/pdf");
    expect(res.methode).toBe("pdf-lokal");
    expect(res.parsed.jahresKwh).toBe(1000);
  });

  it("versucht lokal, wenn Textract bei einem PDF nichts findet", async () => {
    mocks.isOcrAvailable.mockReturnValue(true);
    mocks.ocrStromrechnung.mockResolvedValue(LEERES_ERGEBNIS);
    mocks.ocrPdfLokal.mockResolvedValue(TREFFER);
    const res = await extrahiereBeleg(bytes, "application/pdf");
    expect(res.methode).toBe("pdf-lokal");
  });

  it("Bild ohne Textract: kein Versuch", async () => {
    mocks.isOcrAvailable.mockReturnValue(false);
    const res = await extrahiereBeleg(bytes, "image/png");
    expect(res).toMatchObject({ methode: "keine", versucht: false });
  });

  it("Bild mit Textract-Fehler: versucht, aber ohne Ergebnis", async () => {
    mocks.isOcrAvailable.mockReturnValue(true);
    mocks.ocrStromrechnung.mockRejectedValue(new Error("boom"));
    const res = await extrahiereBeleg(bytes, "image/jpeg");
    expect(res).toMatchObject({ methode: "keine", versucht: true });
  });
});
