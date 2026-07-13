import { describe, expect, it } from "vitest";

import {
  calculateErstattung,
  HONORAR_FLOOR_EUR,
  istWirtschaftlich,
  MINDEST_KWH_WIRTSCHAFTLICH,
  SOCKEL_EUR,
} from "./stromsteuer";

describe("calculateErstattung — Screenshot-Verifikation", () => {
  it("800.000 kWh ohne Abzuege => 13.529,25 € Auszahlung (EnergyIQ-Hero)", () => {
    const result = calculateErstattung({ bruttoKwh: 800_000 });

    expect(result.bruttoKwh).toBe(800_000);
    expect(result.nettoKwh).toBe(800_000);
    expect(result.bruttoErstattung).toBe(16_000);
    expect(result.sockel).toBe(250);
    expect(result.honorar).toBe(2_220.75);
    expect(result.honorarSatz).toBe(14.1);
    expect(result.nettoAuszahlung).toBe(13_529.25);
  });

  it("48.560 kWh ohne Abzuege => 221,20 € Auszahlung (Honorar-Floor greift)", () => {
    const result = calculateErstattung({ bruttoKwh: 48_560 });

    expect(result.bruttoErstattung).toBe(971.2);
    expect(result.honorar).toBe(HONORAR_FLOOR_EUR);
    expect(result.honorarSatz).toBeGreaterThan(14.1); // Floor > Prozentsatz
    expect(result.nettoAuszahlung).toBe(221.2);
  });
});

describe("calculateErstattung — Abzuege", () => {
  it("zieht Privatnutzungs-kWh und E-Auto-kWh ab", () => {
    const result = calculateErstattung({
      bruttoKwh: 100_000,
      privatnutzungKwh: 2_000,
      eAutoKwh: 5_000,
    });

    expect(result.abzuegeKwh).toBe(7_000);
    expect(result.nettoKwh).toBe(93_000);
    expect(result.bruttoErstattung).toBe(1_860);
  });

  it("akzeptiert keine negativen Abzuege", () => {
    const result = calculateErstattung({
      bruttoKwh: 100_000,
      privatnutzungKwh: -500,
      eAutoKwh: -1_000,
    });

    expect(result.abzuegeKwh).toBe(0);
    expect(result.nettoKwh).toBe(100_000);
  });
});

describe("calculateErstattung — Randfaelle", () => {
  it("Verbrauch unter Sockel-Schwelle => 0 € nach Sockel, Floor-Honorar trotzdem", () => {
    // 5.000 kWh × 0,02 = 100 € < 250 € Sockel
    const result = calculateErstattung({ bruttoKwh: 5_000 });

    expect(result.bruttoErstattung).toBe(100);
    // bruttoErstattung < Sockel => afterSockel = 0 => Honorar darf Auszahlung
    // nicht in den Negativbereich druecken
    expect(result.nettoAuszahlung).toBe(0);
  });

  it("Verbrauch = 0 kWh => alles 0", () => {
    const result = calculateErstattung({ bruttoKwh: 0 });

    expect(result.bruttoErstattung).toBe(0);
    expect(result.nettoAuszahlung).toBe(0);
    expect(result.honorarSatz).toBe(0);
  });

  it("Floor-Schwelle: prozentHonorar == 500 € bei 17.985 kWh netto-nach-Sockel", () => {
    // afterSockel × 0,141 = 500 => afterSockel ≈ 3.546,10 €
    // => bruttoErstattung ≈ 3.796,10 € => kWh ≈ 189.805
    // Bei genau 189.806 kWh sollte der Prozentsatz knapp ueber 14,1 % liegen
    const result = calculateErstattung({ bruttoKwh: 200_000 });

    expect(result.honorarSatz).toBe(14.1);
    expect(result.honorar).toBeGreaterThan(HONORAR_FLOOR_EUR);
  });

  it("Konstanten sind die offiziellen Werte", () => {
    expect(SOCKEL_EUR).toBe(250);
    expect(HONORAR_FLOOR_EUR).toBe(500);
  });
});

describe("istWirtschaftlich", () => {
  it("40.000 kWh ist die Mindestschwelle", () => {
    expect(MINDEST_KWH_WIRTSCHAFTLICH).toBe(40_000);
    expect(istWirtschaftlich(39_999)).toBe(false);
    expect(istWirtschaftlich(40_000)).toBe(true);
  });
});
