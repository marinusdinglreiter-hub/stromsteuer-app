import { describe, expect, it } from "vitest";

import { folgejahrPreis, PREIS_TABELLEN, preisFuer } from "./preise";

describe("preisFuer — Baender", () => {
  it("unter 150 MWh gibt es keinen Festpreis und kein Band", () => {
    const r = preisFuer(149.999);
    expect(r.preisEur).toBeNull();
    expect(r.band).toBeNull();
    expect(r.version).toBe("2026-09");
  });

  it("150 MWh liegt im ersten Band", () => {
    expect(preisFuer(150).preisEur).toBe(690);
  });

  it("Bandgrenzen: unten einschliessend, oben ausschliessend", () => {
    expect(preisFuer(249.999).preisEur).toBe(690);
    expect(preisFuer(250).preisEur).toBe(1090);
    expect(preisFuer(399.999).preisEur).toBe(1090);
    expect(preisFuer(400).preisEur).toBe(1590);
  });

  it("ab 3.000 MWh individuelles Angebot (Band vorhanden, Preis null)", () => {
    const r = preisFuer(3000);
    expect(r.preisEur).toBeNull();
    expect(r.band).toEqual({ vonMwh: 3000, bisMwh: null, preisEur: null });
    expect(preisFuer(12_000).preisEur).toBeNull();
  });
});

describe("preisFuer — Folgejahr", () => {
  it("entspricht der Folgejahres-Tabelle in docs/10", () => {
    const erwartet: [number, number][] = [
      [200, 410],
      [300, 650],
      [500, 950],
      [700, 1310],
      [1000, 1730],
      [1500, 2270],
      [2500, 2990],
    ];
    for (const [mwh, preis] of erwartet) {
      expect(preisFuer(mwh, { istFolgejahr: true }).preisEur).toBe(preis);
    }
  });

  it("individuelles Angebot bleibt auch im Folgejahr null", () => {
    expect(preisFuer(3500, { istFolgejahr: true }).preisEur).toBeNull();
  });

  it("folgejahrPreis rundet auf volle 10 € ab", () => {
    expect(folgejahrPreis(690, 0.6)).toBe(410);
    expect(folgejahrPreis(1000, 0.6)).toBe(600);
  });
});

describe("preisFuer — Versionen", () => {
  it("mit Version wird die historische Tabelle verwendet", () => {
    const aelteste = PREIS_TABELLEN[PREIS_TABELLEN.length - 1]!;
    expect(preisFuer(300, { tabelleVersion: aelteste.version }).version).toBe(
      aelteste.version,
    );
  });

  it("unbekannte Version wirft", () => {
    expect(() => preisFuer(300, { tabelleVersion: "1999-01" })).toThrow();
  });
});
