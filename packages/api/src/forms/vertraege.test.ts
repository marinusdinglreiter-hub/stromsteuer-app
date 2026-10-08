import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { canonicalConsentText, CLAUSES, CONSENT_VERSION } from "./legalTexts";
import {
  generateAufbereitungsvertragPdf,
  generateKanzleimandatPdf,
  type VertragsPartei,
} from "./vertraege";

const partei: VertragsPartei = {
  firmenname: "Muster Metallbau GmbH",
  rechtsform: "GmbH",
  geschaeftsfuehrer: "Erika Muster",
  strasse: "Industriestr. 1",
  plz: "93055",
  ort: "Regensburg",
  email: "info@muster.example",
};

const signatur = {
  signerName: "Erika Muster",
  signerIp: "127.0.0.1",
  signedAt: new Date("2026-10-08T10:00:00Z"),
  signatureDataUrl: null,
};

describe("Vertrags-PDFs", () => {
  it("erzeugt den Aufbereitungsvertrag als eigenes Dokument", async () => {
    const bytes = await generateAufbereitungsvertragPdf({
      antragId: "a1",
      antragsjahr: 2025,
      mandant: partei,
      anbieterName: "Stromsteuer-Service",
      preisEur: 1590,
      preisTabelleVersion: "2026-09",
      istFolgejahr: false,
      signatur,
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toContain("Aufbereitungsvertrag");
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("erzeugt das Kanzleimandat mit Vollmacht auf eigener Seite", async () => {
    const bytes = await generateKanzleimandatPdf({
      antragId: "a1",
      antragsjahr: 2025,
      mandant: partei,
      kanzleiName: "[KANZLEI]",
      kanzleiAnwalt: "[ANWALT]",
      signatur,
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toContain("Mandat");
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
  });
});

describe("Vertragstexte", () => {
  it("enthalten kein Erfolgshonorar mehr, dafuer Festpreis und Bescheidzustellung", () => {
    const text = canonicalConsentText();
    expect(text.toLowerCase()).not.toContain("erfolgshonorar");
    expect(text).toContain(CLAUSES.festpreis);
    expect(text).toContain(CLAUSES.bescheidzustellung);
    expect(CONSENT_VERSION).toBe("2026-10-08");
  });

  it("markieren ungepruefte Texte als juristisch zu pruefen", () => {
    for (const key of ["festpreis", "aufbereitungLeistung", "bescheidzustellung"] as const) {
      expect(CLAUSES[key]).toContain("[JURISTISCH ZU PRUEFEN]");
    }
  });

  it("sagen keinen Erstattungserfolg zu", () => {
    expect(CLAUSES.festpreis).toContain("wird nicht zugesagt");
  });
});
