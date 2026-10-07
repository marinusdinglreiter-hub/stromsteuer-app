import { describe, expect, it } from "vitest";

import {
  calculateErstattung,
  istWirtschaftlich,
  MINDEST_KWH_WIRTSCHAFTLICH,
  satzFuer,
} from "./stromsteuer";

describe("calculateErstattung — Grundfall", () => {
  it("800.000 kWh im Verbrauchsjahr 2025 => 16.000 € Entlastung, 15.750 € Auszahlung", () => {
    const result = calculateErstattung({ verbrauchsjahr: 2025, bruttoKwh: 800_000 });

    expect(result.bruttoKwh).toBe(800_000);
    expect(result.nettoKwh).toBe(800_000);
    expect(result.nettoMwh).toBe(800);
    expect(result.satzEurProMwh).toBe(20);
    expect(result.bruttoErstattung).toBe(16_000);
    expect(result.sockel).toBe(250);
    expect(result.auszahlung).toBe(15_750);
  });

  it("48.560 kWh => 971,20 € Entlastung, 721,20 € Auszahlung", () => {
    const result = calculateErstattung({ verbrauchsjahr: 2025, bruttoKwh: 48_560 });

    expect(result.bruttoErstattung).toBe(971.2);
    expect(result.auszahlung).toBe(721.2);
  });

  it("enthaelt keine Honorar-Felder mehr", () => {
    const result = calculateErstattung({ verbrauchsjahr: 2025, bruttoKwh: 800_000 });
    expect(Object.keys(result).some((k) => /honorar|netto(a|A)uszahlung/.test(k))).toBe(
      false,
    );
  });
});

describe("calculateErstattung — Satzwechsel", () => {
  it("Verbrauchsjahr 2023 rechnet mit 5,13 €/MWh", () => {
    const result = calculateErstattung({ verbrauchsjahr: 2023, bruttoKwh: 800_000 });
    expect(result.satzEurProMwh).toBe(5.13);
    expect(result.bruttoErstattung).toBe(4_104);
  });

  it("Verbrauchsjahr 2024 rechnet mit 20,00 €/MWh", () => {
    const result = calculateErstattung({ verbrauchsjahr: 2024, bruttoKwh: 800_000 });
    expect(result.satzEurProMwh).toBe(20);
    expect(result.bruttoErstattung).toBe(16_000);
  });

  it("satzFuer wirft vor dem aeltesten Eintrag", () => {
    expect(() => satzFuer(2005)).toThrow();
  });
});

describe("calculateErstattung — Rundung", () => {
  it("rundet nicht auf ganze MWh (500,499 MWh => 10.009,98 €)", () => {
    const result = calculateErstattung({ verbrauchsjahr: 2025, bruttoKwh: 500_499 });
    expect(result.nettoMwh).toBe(500.499);
    expect(result.bruttoErstattung).toBe(10_009.98);
  });

  it("rundet halbe Cent kaufmaennisch auf (0,5 MWh × 5,13 € = 2,565 € => 2,57 €)", () => {
    const result = calculateErstattung({ verbrauchsjahr: 2023, bruttoKwh: 500 });
    expect(result.bruttoErstattung).toBe(2.57);
  });

  it("rundet unter einem halben Cent ab (123,457 MWh × 5,13 € => 633,33 €)", () => {
    const result = calculateErstattung({ verbrauchsjahr: 2023, bruttoKwh: 123_457 });
    expect(result.bruttoErstattung).toBe(633.33);
  });
});

describe("calculateErstattung — Abzuege", () => {
  it("zieht Privatnutzungs-kWh und E-Auto-kWh ab", () => {
    const result = calculateErstattung({
      verbrauchsjahr: 2025,
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
      verbrauchsjahr: 2025,
      bruttoKwh: 100_000,
      privatnutzungKwh: -500,
      eAutoKwh: -1_000,
    });

    expect(result.abzuegeKwh).toBe(0);
    expect(result.nettoKwh).toBe(100_000);
  });
});

describe("calculateErstattung — Randfaelle", () => {
  it("Entlastung unter dem Selbstbehalt => Auszahlung 0 €", () => {
    // 5.000 kWh × 0,02 € = 100 € < 250 € Selbstbehalt
    const result = calculateErstattung({ verbrauchsjahr: 2025, bruttoKwh: 5_000 });

    expect(result.bruttoErstattung).toBe(100);
    expect(result.auszahlung).toBe(0);
  });

  it("knapp ueber dem Selbstbehalt (12.501 kWh => 0,02 €)", () => {
    const result = calculateErstattung({ verbrauchsjahr: 2025, bruttoKwh: 12_501 });
    expect(result.auszahlung).toBe(0.02);
  });

  it("Verbrauch = 0 kWh => alles 0", () => {
    const result = calculateErstattung({ verbrauchsjahr: 2025, bruttoKwh: 0 });

    expect(result.bruttoErstattung).toBe(0);
    expect(result.auszahlung).toBe(0);
  });
});

describe("istWirtschaftlich", () => {
  it("150.000 kWh ist die Mindestschwelle (kleinstes Preisband)", () => {
    expect(MINDEST_KWH_WIRTSCHAFTLICH).toBe(150_000);
    expect(istWirtschaftlich(149_999)).toBe(false);
    expect(istWirtschaftlich(150_000)).toBe(true);
  });
});
