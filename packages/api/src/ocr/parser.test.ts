import { describe, expect, it } from "vitest";

import {
  istOcrVertrauenswuerdig,
  parseStromrechnung,
  type TextractResponseShape,
} from "./parser";

/** Helper: baut ein Textract-Response aus Klartext-Zeilen. */
function mockResponse(lines: string[]): TextractResponseShape {
  return {
    Blocks: lines.map((Text) => ({ BlockType: "LINE", Text, Confidence: 99 })),
  };
}

describe("parseStromrechnung — Top-Versorger-Erkennung", () => {
  it("erkennt E.ON in der Kopfzeile", () => {
    const result = parseStromrechnung(
      mockResponse([
        "E.ON Energie Deutschland GmbH",
        "Rechnung Nr. 12345",
        "Verbrauch: 48.560 kWh",
      ]),
    );
    expect(result.versorger).toBe("E.ON");
  });

  it("erkennt EnBW egal welche Schreibweise", () => {
    const result = parseStromrechnung(
      mockResponse(["EnBW Energie Baden-Wuerttemberg AG"]),
    );
    expect(result.versorger).toBe("EnBW");
  });

  it("erkennt Stadtwerke als Generic-Match", () => {
    const result = parseStromrechnung(
      mockResponse(["Stadtwerke Musterstadt GmbH"]),
    );
    expect(result.versorger).toBe("Stadtwerke");
  });

  it("gibt null zurueck, wenn kein Versorger erkannt wird", () => {
    const result = parseStromrechnung(
      mockResponse(["Unbekannter Lieferant XY"]),
    );
    expect(result.versorger).toBeNull();
  });
});

describe("parseStromrechnung — kWh-Erkennung", () => {
  it("erkennt deutschen Tausenderpunkt + Dezimalkomma", () => {
    const result = parseStromrechnung(
      mockResponse(["Jahresverbrauch: 48.560,00 kWh"]),
    );
    expect(result.jahresKwh).toBe(48_560);
  });

  it("erkennt Wert ohne Tausenderpunkt", () => {
    const result = parseStromrechnung(mockResponse(["Verbrauch 12345 kWh"]));
    expect(result.jahresKwh).toBe(12_345);
  });

  it("wahlt den groessten kWh-Wert als Jahresverbrauch", () => {
    const result = parseStromrechnung(
      mockResponse([
        "HT 35.000 kWh",
        "NT 13.560 kWh",
        "Gesamt 48.560 kWh",
        "Vergleich Vorjahr 47.200 kWh",
      ]),
    );
    expect(result.jahresKwh).toBe(48_560);
  });

  it("gibt null bei fehlendem kWh-Wert", () => {
    const result = parseStromrechnung(mockResponse(["Keine Angabe hier"]));
    expect(result.jahresKwh).toBeNull();
  });

  it("erkennt MWh und rechnet auf kWh um", () => {
    const result = parseStromrechnung(
      mockResponse(["Jahresverbrauch: 800 MWh"]),
    );
    expect(result.jahresKwh).toBe(800_000);
  });

  it("erkennt MWh mit Dezimalkomma", () => {
    const result = parseStromrechnung(mockResponse(["1.234,5 MWh gesamt"]));
    expect(result.jahresKwh).toBe(1_234_500);
  });

  it("bevorzugt Zeile mit 'Jahresverbrauch' vor groesserem Zaehlerstand", () => {
    const result = parseStromrechnung(
      mockResponse([
        "Zaehlerstand neu 123.456 kWh",
        "Jahresverbrauch 48.560 kWh",
      ]),
    );
    expect(result.jahresKwh).toBe(48_560);
  });

  it("ignoriert Vorjahres-/Zaehlerstand-Zeilen im Fallback", () => {
    const result = parseStromrechnung(
      mockResponse([
        "Zaehlerstand 999.999 kWh",
        "Vergleich Vorjahr 47.200 kWh",
        "Verbrauch 48.560 kWh",
      ]),
    );
    expect(result.jahresKwh).toBe(48_560);
  });
});

describe("parseStromrechnung — Verbrauchszeitraum", () => {
  it("erkennt Datums-Paar in einer Zeile", () => {
    const result = parseStromrechnung(
      mockResponse(["Verbrauchszeitraum: 01.01.2025 - 31.12.2025"]),
    );
    expect(result.periodStart?.toISOString().startsWith("2025-01-01")).toBe(
      true,
    );
    expect(result.periodEnd?.toISOString().startsWith("2025-12-31")).toBe(true);
  });

  it("akzeptiert 2-stellige Jahresangaben", () => {
    const result = parseStromrechnung(
      mockResponse(["Zeitraum 01.01.25 - 31.12.25"]),
    );
    expect(result.periodStart?.getUTCFullYear()).toBe(2025);
    expect(result.periodEnd?.getUTCFullYear()).toBe(2025);
  });

  it("ignoriert ungueltige Daten", () => {
    const result = parseStromrechnung(
      mockResponse(["32.13.2025 - 99.99.2025"]),
    );
    expect(result.periodStart).toBeNull();
  });
});

describe("parseStromrechnung — Adresse", () => {
  it("erkennt 'Lieferstelle: ...' inline", () => {
    const result = parseStromrechnung(
      mockResponse(["Lieferstelle: Industriestraße 27, 54321 Beispielstadt"]),
    );
    expect(result.adresse).toContain("Industriestraße 27");
  });

  it("erkennt Adresse in der naechsten Zeile mit PLZ-Pattern", () => {
    const result = parseStromrechnung(
      mockResponse([
        "Verbrauchsstelle:",
        "Industriestraße 27",
        "54321 Beispielstadt",
      ]),
    );
    expect(result.adresse).toBe("Industriestraße 27, 54321 Beispielstadt");
  });
});

describe("parseStromrechnung — Confidence", () => {
  it("4 von 4 Feldern => Confidence 1.0", () => {
    const result = parseStromrechnung(
      mockResponse([
        "E.ON Energie Deutschland GmbH",
        "Lieferstelle: Industriestraße 27, 54321 Beispielstadt",
        "Zeitraum: 01.01.2025 - 31.12.2025",
        "Jahresverbrauch: 48.560 kWh",
      ]),
    );
    expect(result.confidence).toBe(1);
    expect(istOcrVertrauenswuerdig(result)).toBe(true);
  });

  it("nur kWh erkannt => Confidence 0.25", () => {
    const result = parseStromrechnung(
      mockResponse(["48.560 kWh — sonst nichts erkennbar"]),
    );
    expect(result.confidence).toBe(0.25);
    expect(istOcrVertrauenswuerdig(result)).toBe(false);
  });
});
