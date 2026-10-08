import { describe, expect, it } from "vitest";

import { istEinreichbar, pruefeVollstaendigkeit } from "./complete";
import { erzeugeDatensatz, type BerechnungEingabe } from "./datensatz";
import { antrag, empfaenger, lieferstelle, mandant, portalZugang } from "./fixtures";
import { vorpruefung } from "./vorpruefung";

// Ergebnis von calculateErstattung fuer 800.000 kWh, Verbrauchsjahr 2025.
const BERECHNUNG_800K: BerechnungEingabe = {
  nettoKwh: 800_000,
  abzuegeKwh: 0,
  satzEurProMwh: 20,
  bruttoErstattung: 16_000,
  sockel: 250,
  auszahlung: 15_750,
};

const felder = (a: ReturnType<typeof antrag>, phase?: "uebergabe" | "einreichung") =>
  pruefeVollstaendigkeit(a, phase).map((f) => f.feld);

describe("pruefeVollstaendigkeit", () => {
  it("Standardfall vollstaendig ist einreichbar", () => {
    expect(pruefeVollstaendigkeit(antrag())).toEqual([]);
    expect(istEinreichbar(antrag())).toBe(true);
  });

  it("IBAN fehlt", () => {
    const a = antrag({ mandant: mandant({ iban: null }) });
    expect(felder(a)).toEqual(["mandant.iban"]);
    expect(istEinreichbar(a)).toBe(false);
  });

  it("ohne Mandant fehlen die Firmendaten insgesamt", () => {
    expect(felder(antrag({ mandant: null, mandantId: null }))).toContain("mandant");
  });

  it("Nutzenergie ohne Empfaenger", () => {
    const a = antrag({
      nutzenergieAnDritteWeitergegeben: true,
      lieferstellen: [lieferstelle({ kwhEigenbetrieblich: 750_000, kwhNutzenergiePG: 50_000 })],
    });
    expect(felder(a)).toEqual(["nutzenergieEmpfaenger.PRODUZIERENDES_GEWERBE"]);
  });

  it("Nutzenergie mit passendem Empfaenger und Selbsterklaerung ist vollstaendig", () => {
    const a = antrag({
      nutzenergieAnDritteWeitergegeben: true,
      lieferstellen: [lieferstelle({ kwhEigenbetrieblich: 750_000, kwhNutzenergiePG: 50_000 })],
      nutzenergieEmpfaenger: [empfaenger()],
    });
    expect(felder(a)).toEqual([]);
  });

  it("Zuordnungsaufstellung muss zur Menge in Spalte 4 passen", () => {
    const a = antrag({
      nutzenergieAnDritteWeitergegeben: true,
      lieferstellen: [lieferstelle({ kwhNutzenergiePG: 60_000 })],
      nutzenergieEmpfaenger: [empfaenger({ mengeKwh: 50_000, selbsterklaerungVorhanden: false })],
    });
    expect(felder(a)).toEqual([
      "nutzenergieEmpfaenger.PRODUZIERENDES_GEWERBE.selbsterklaerung",
      "nutzenergieEmpfaenger.PRODUZIERENDES_GEWERBE.menge",
    ]);
  });

  it("Portal-Vollmacht fehlt: Uebergabe ok, Einreichung nicht", () => {
    const a = antrag({ mandant: mandant({}, portalZugang({ vollmachtStatus: "ERTEILT" })) });
    expect(felder(a, "uebergabe")).toEqual([]);
    expect(felder(a, "einreichung")).toEqual(["mandant.portalZugang.vollmachtStatus"]);
  });

  it("ohne Portal-Zugang fehlt die Vollmacht ebenfalls", () => {
    expect(felder(antrag({ mandant: mandant({}, null) }))).toEqual([
      "mandant.portalZugang.vollmachtStatus",
    ]);
  });

  it("verlangt beide Signaturen, Beleg und Beihilfe-Selbsterklaerung", () => {
    const a = antrag({
      aufbereitungSignedAt: null,
      kanzleimandatSignedAt: null,
      beihilfeSelbsterklaerungVorhanden: null,
      lieferstellen: [lieferstelle({ belegFileKeys: [] })],
    });
    expect(felder(a)).toEqual([
      "lieferstellen.belege",
      "antrag.beihilfeSelbsterklaerungVorhanden",
      "antrag.aufbereitungSignedAt",
      "antrag.kanzleimandatSignedAt",
    ]);
  });

  it("Lieferstelle ohne Menge zaehlt nicht", () => {
    const a = antrag({ lieferstellen: [lieferstelle({ kwhEigenbetrieblich: 0 })] });
    expect(felder(a)).toContain("lieferstellen");
  });
});

describe("erzeugeDatensatz", () => {
  it("fuellt fuer einen vollstaendigen Antrag alle Pflichtfelder", () => {
    const d = erzeugeDatensatz(antrag(), BERECHNUNG_800K);
    const wert = (label: string) => d.felder.find((f) => f.label === label)?.wert;
    expect(wert("Anmelder/in — Name")).toBe("Muster Metallbau GmbH");
    expect(wert("IBAN")).toBe("DE02120300000000202051");
    expect(wert("Hauptzollamt")).toBe("Regensburg");
    expect(wert("Zeitraum (Entlastungsabschnitt)")).toBe("Kalenderjahr 2025");
    expect(wert("Unternehmensart")).toContain("§ 2 Nr. 3 StromStG");
    for (const pflicht of ["Rechtsform", "Steuernummer", "Kontoinhaber", "Strasse", "PLZ", "Ort"]) {
      expect(wert(pflicht), pflicht).not.toBe("");
    }
  });

  it("haelt die Formular-Reihenfolge ein: Abschnitt 1 bis 9, dann Seite 2", () => {
    const abschnitte = erzeugeDatensatz(antrag(), BERECHNUNG_800K).felder.map((f) => f.abschnitt);
    const reihenfolge = ["1", "2", "3", "4", "5", "6", "7", "9", "Seite 2"];
    const indizes = abschnitte.map((a) => reihenfolge.indexOf(a));
    expect(indizes.every((v, i) => i === 0 || v >= indizes[i - 1]!)).toBe(true);
    expect(abschnitte[abschnitte.length - 1]).toBe("Seite 2");
  });

  it("rechnet die Tabelle in MWh mit drei Dezimalstellen", () => {
    const d = erzeugeDatensatz(antrag(), BERECHNUNG_800K);
    expect(d.tabelle).toEqual({
      satzEurProMwh: 20,
      spalte3Mwh: 800,
      spalte4Mwh: 0,
      spalte5Mwh: 0,
      gesamtMwh: 800,
      gesamtsummeEur: 16_000,
      selbstbehaltEur: 250,
      zuEntlastenEur: 15_750,
    });
    const zuEntlasten = d.felder.find((f) => f.label === "zu entlasten (EUR)");
    expect(zuEntlasten?.wert).toBe("15.750,00");
  });

  it("verteilt Nutzenergie auf Spalte 4/5 und zieht Privatnutzung nur von Spalte 3 ab", () => {
    const a = antrag({
      lieferstellen: [
        lieferstelle({ kwhEigenbetrieblich: 700_123, kwhNutzenergiePG: 50_000, kwhNutzenergieLuF: 10_000 }),
      ],
    });
    // calculateErstattung: brutto 760.123 kWh, 5.000 kWh Privatnutzung abgezogen
    const d = erzeugeDatensatz(a, { ...BERECHNUNG_800K, nettoKwh: 755_123, abzuegeKwh: 5_000 });
    expect(d.tabelle.spalte3Mwh).toBe(695.123);
    expect(d.tabelle.spalte4Mwh).toBe(50);
    expect(d.tabelle.spalte5Mwh).toBe(10);
    expect(d.tabelle.gesamtMwh).toBe(755.123);
    expect(d.felder.find((f) => f.label.startsWith("Spalte 3"))?.wert).toBe("695,123");
  });

  it("listet die Lieferstellen mit OCR-Herkunft fuer das Pruefprotokoll", () => {
    const [ls] = erzeugeDatensatz(antrag(), BERECHNUNG_800K).lieferstellen;
    expect(ls).toMatchObject({ nr: 1, versorger: "Stadtwerke", belege: 1, ocrConfidence: 0.83 });
    expect(ls?.zeitraum).toBe("01.01.2025 – 31.12.2025");
  });

  it("laesst fehlende Werte leer statt etwas zu erfinden", () => {
    const d = erzeugeDatensatz(antrag({ mandant: null }), BERECHNUNG_800K);
    expect(d.felder.find((f) => f.label === "IBAN")?.wert).toBe("");
  });
});

describe("vorpruefung", () => {
  const ok = { unternehmensart: "PRODUZIERENDES_GEWERBE" as const, auszahlungEur: 15_750, triageKeineEuRueckforderung: true };

  it("laesst einen anspruchsberechtigten Fall durch", () => {
    expect(vorpruefung(ok)).toEqual({ status: "ok" });
  });

  it("stoppt ohne passende Unternehmensart", () => {
    const r = vorpruefung({ ...ok, unternehmensart: "KEINE" });
    expect(r.status).toBe("hardstop");
  });

  it("stoppt bei Erstattung nicht ueber dem Selbstbehalt", () => {
    expect(vorpruefung({ ...ok, auszahlungEur: 0 }).status).toBe("hardstop");
  });

  it("stoppt bei offener EU-Rueckforderung", () => {
    const r = vorpruefung({ ...ok, triageKeineEuRueckforderung: false });
    expect(r).toMatchObject({ status: "hardstop" });
  });

  it("meldet unbeantwortete Angaben als unvollstaendig", () => {
    expect(vorpruefung({ ...ok, unternehmensart: null })).toEqual({
      status: "unvollstaendig",
      fehlend: ["Unternehmensart"],
    });
  });
});
