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

describe("parseStromrechnung — Zaehlpunkt / Marktlokation", () => {
  it("liest die Marktlokations-ID aus derselben Zeile", () => {
    const result = parseStromrechnung(
      mockResponse(["Marktlokations-ID: 51238696781", "Verbrauch 12.000 kWh"]),
    );
    expect(result.zaehlpunkt).toBe("51238696781");
  });

  it("liest die MaLo-ID aus der Folgezeile", () => {
    const result = parseStromrechnung(mockResponse(["MaLo", "5123 8696 781"]));
    expect(result.zaehlpunkt).toBeNull();
    const kompakt = parseStromrechnung(mockResponse(["MaLo-ID", "51238696781"]));
    expect(kompakt.zaehlpunkt).toBe("51238696781");
  });

  it("liest eine Zaehlpunktbezeichnung auch mit Leerzeichen", () => {
    const result = parseStromrechnung(
      mockResponse(["Zählpunkt: DE 000562 66802 AO6G56M11SN51G21M24S"]),
    );
    expect(result.zaehlpunkt).toBe("DE00056266802AO6G56M11SN51G21M24S");
  });

  it("nimmt keine 12-stellige Kundennummer als MaLo", () => {
    const result = parseStromrechnung(mockResponse(["Marktlokation 512386967812"]));
    expect(result.zaehlpunkt).toBeNull();
  });
});

describe("parseStromrechnung — Stromsteuer mit EUR statt Euro-Zeichen", () => {
  it("erkennt 'EUR' als Waehrung", () => {
    const result = parseStromrechnung(mockResponse(["Stromsteuer 1.435,00 EUR"]));
    expect(result.stromsteuerGezahlt).toBe(1435);
  });

  it("nimmt den Betrag, nicht den Arbeitspreis in ct/kWh", () => {
    const result = parseStromrechnung(
      mockResponse(["Stromsteuer 70.000 kWh x 2,05 ct/kWh 1.435,00 EUR"]),
    );
    expect(result.stromsteuerGezahlt).toBe(1435);
  });
});

// ------------------------------------------------------------
// Praxisfall: Schlussrechnung eines Energieversorgers ueber 12,5 Monate
// (01.02.2025 - 21.02.2026), 28.550 kWh, Stromsteuer 585,29 EUR. Zeilen stammen aus
// dem Textlayer einer echten Rechnung (Kundendaten und Bankverbindungen entfernt,
// Reihenfolge und Schreibweise unveraendert).
// ------------------------------------------------------------
const SCHLUSSRECHNUNG_ZEILEN = [
  "MAINGAU Energie GmbH, Ringstr. 4 - 6, 63179 Obertshausen",
  "Herrn",
  "Mustermann GmbH",
  "Gewerbepark Markfeld 2 d",
  "83043 Bad Aibling",
  "Ihre aktuelle Rechnung für den Zeitraum 01.02.2025 - 21.02.2026",
  "2.624,84 €",
  "Rechnungsdatum 06. März 2026",
  "Schlussrechnung",
  "01.02.2025 - 21.02.2026\tAbrechnungszeitraum:",
  "Gewerbepark Markfeld 2d, 83043 Bad Aibling\tLieferstelle:",
  "Strom 0 kWh 28.550 kWh (386) 7.419,20 1.409,64 (19%) 8.828,84",
  "Messlokations-ID DE00106883043S0000000000000657459, Marktlokations-ID 50333282263, Codenummer des Verteilnetzbetreibers",
  "Zeitraum Zählerstand Differenz Wandler Verbrauch",
  "01.02.2025 - 09.06.2025 1.018 1.195 1) 177 50 8.850 kWh",
  "10.06.2025 - 31.12.2025 1.195 1.477 2) 282 50 14.100 kWh",
  "01.01.2026 - 30.01.2026 1.477 1.542 3) 65 50 3.250 kWh",
  "31.01.2026 - 21.02.2026 1.542 1.589 3) 47 50 2.350 kWh",
  "Summe 28.550 kWh",
  "01.02.2025 - 09.06.2025 AP MAINGAU StromGarant 25,80 Ct/kWh 8.850 kWh 19% 2.283,30 €",
  "Strom: Die Nettobeträge beinhalten:",
  "Stromsteuer 585,29",
  "Erneuerbare-Energien-Gesetz 0,00",
  "Lieferstelle",
  "Die Lieferstelle gibt Auskunft darüber, welcher Wohneinheit bzw. welcher Verbrauchs-",
  "Stromsteuer: Die Stromsteuer ist eine Steuer auf den Energieverbrauch, welche durch das Stromsteuergesetz geregelt ist.",
];

describe("parseStromrechnung — Schlussrechnung ueber mehrere Jahre (Praxisfall)", () => {
  const result = parseStromrechnung(mockResponse(SCHLUSSRECHNUNG_ZEILEN));

  it("erkennt den Versorger an der Absenderzeile, nicht an 'Gewerbepark' (g-EWE-rbe)", () => {
    expect(result.versorger).toBe("MAINGAU Energie GmbH");
  });

  it("liest die Lieferstelle mit PLZ, nicht den Erlaeuterungstext", () => {
    expect(result.adresse).toBe("Gewerbepark Markfeld 2d, 83043 Bad Aibling");
  });

  it("liest die Stromsteuer aus dem Posten ohne Euro-Zeichen", () => {
    expect(result.stromsteuerGezahlt).toBe(585.29);
  });

  it("nimmt die Marktlokations-ID, nicht die Ziffern der Messlokations-ID", () => {
    expect(result.zaehlpunkt).toBe("50333282263");
  });

  it("liest Zeitraum und Gesamtmenge", () => {
    expect(result.periodStart?.toISOString().slice(0, 10)).toBe("2025-02-01");
    expect(result.periodEnd?.toISOString().slice(0, 10)).toBe("2026-02-21");
    expect(result.jahresKwh).toBe(28_550);
  });

  it("teilt den Verbrauch auf die Kalenderjahre auf", () => {
    expect(result.verbrauchProJahr).toEqual({ 2025: 22_950, 2026: 5_600 });
  });
});

describe("parseStromrechnung — Verbrauch je Kalenderjahr", () => {
  it("teilt ein Intervall ueber den Jahreswechsel nach Tagen auf (Summe bleibt exakt)", () => {
    const result = parseStromrechnung(
      mockResponse([
        "Gesamtverbrauch 1.000 kWh",
        "17.12.2025 - 15.01.2026 100 1.100 1) 1.000 1 1.000 kWh",
      ]),
    );
    const jahre = result.verbrauchProJahr!;
    expect(jahre[2025]! + jahre[2026]!).toBe(1_000);
    // 15 Tage 2025 (17.-31.12.), 15 Tage 2026 (1.-15.01.)
    expect(jahre[2025]).toBe(500);
    expect(jahre[2026]).toBe(500);
  });

  it("liefert null, wenn die Intervalle nicht zur Gesamtmenge passen", () => {
    const result = parseStromrechnung(
      mockResponse([
        "Gesamtverbrauch 9.000 kWh",
        "01.01.2025 - 31.12.2025 1 2 1) 1 1 1.000 kWh",
      ]),
    );
    expect(result.verbrauchProJahr).toBeNull();
  });

  it("liefert null ohne Verbrauchstabelle", () => {
    expect(
      parseStromrechnung(mockResponse(["Jahresverbrauch: 48.560 kWh"])).verbrauchProJahr,
    ).toBeNull();
  });
});

describe("parseStromrechnung — Stromsteuer-Posten und Adresse (Randfaelle)", () => {
  it("verwechselt einen Steuersatz nicht mit dem gezahlten Betrag", () => {
    const result = parseStromrechnung(
      mockResponse(["Stromsteuer 20,50 €/MWh", "Stromsteuer 2,05 ct/kWh"]),
    );
    expect(result.stromsteuerGezahlt).toBeNull();
  });

  it("uebernimmt 'Stromsteuer 1.234,56 €' weiterhin", () => {
    expect(
      parseStromrechnung(mockResponse(["Stromsteuer 1.234,56 €"])).stromsteuerGezahlt,
    ).toBe(1_234.56);
  });

  it("liefert keine Adresse aus einer blossen Ueberschrift mit Fliesstext", () => {
    const result = parseStromrechnung(
      mockResponse(["Lieferstelle", "Die Lieferstelle gibt Auskunft darüber, welche Wohneinheit gemeint ist."]),
    );
    expect(result.adresse).toBeNull();
  });
});
