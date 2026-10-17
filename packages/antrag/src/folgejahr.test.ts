import { describe, expect, it } from "vitest";

import { istJanuar, pruefeFolgejahr } from "./folgejahr";

const vorjahr2025 = { antragsjahr: 2025, status: "PAID" as const };
const pruefe = (over: Partial<Parameters<typeof pruefeFolgejahr>[0]> = {}) =>
  pruefeFolgejahr({ vorjahr: vorjahr2025, vorhandeneJahre: [2025], jetzt: new Date("2027-01-15T10:00:00Z"), ...over });

describe("pruefeFolgejahr", () => {
  it("ab Januar 2027 ist 2026 antragsfaehig", () => {
    expect(pruefe()).toEqual({ moeglich: true, jahr: 2026 });
  });

  it("vor Jahresende 2026 ist das Verbrauchsjahr 2026 noch nicht abgeschlossen", () => {
    expect(pruefe({ jetzt: new Date("2026-10-17T10:00:00Z") })).toEqual({
      moeglich: false,
      jahr: 2026,
      grund: "jahr-nicht-abgeschlossen",
    });
  });

  it("Silvester 23:30 Uhr UTC ist in Deutschland schon der 1. Januar", () => {
    expect(pruefe({ jetzt: new Date("2026-12-31T23:30:00Z") })).toMatchObject({ moeglich: true });
    expect(pruefe({ jetzt: new Date("2026-12-31T22:30:00Z") })).toMatchObject({ moeglich: false });
  });

  it("eingereichte, bewilligte und ausgezahlte Antraege begruenden ein Folgejahr", () => {
    for (const status of ["SUBMITTED", "APPROVED", "PAID"] as const) {
      expect(pruefe({ vorjahr: { antragsjahr: 2025, status } })).toMatchObject({ moeglich: true });
    }
  });

  it("Entwuerfe, Ablehnungen und abgelaufene Antraege nicht", () => {
    for (const status of ["DRAFT", "SIGNED", "PENDING_REVIEW", "REJECTED", "EXPIRED"] as const) {
      expect(pruefe({ vorjahr: { antragsjahr: 2025, status } })).toMatchObject({
        moeglich: false,
        grund: "vorjahr-nicht-eingereicht",
      });
    }
    expect(pruefe({ vorjahr: { antragsjahr: null, status: "PAID" } })).toMatchObject({ moeglich: false });
  });

  it("nicht zweimal fuer dasselbe Jahr", () => {
    expect(pruefe({ vorhandeneJahre: [2025, 2026] })).toEqual({
      moeglich: false,
      jahr: 2026,
      grund: "antrag-existiert",
    });
  });

  it("nach dem Stichtag (25.11. des Fristjahres) nicht mehr", () => {
    expect(pruefe({ jetzt: new Date("2027-11-25T10:00:00Z") })).toMatchObject({
      moeglich: false,
      grund: "stichtag-verstrichen",
    });
    expect(pruefe({ jetzt: new Date("2027-11-24T10:00:00Z") })).toMatchObject({ moeglich: true });
  });
});

describe("istJanuar", () => {
  it("rechnet in Berliner Zeit", () => {
    expect(istJanuar(new Date("2027-01-02T10:00:00Z"))).toBe(true);
    expect(istJanuar(new Date("2027-02-01T10:00:00Z"))).toBe(false);
    expect(istJanuar(new Date("2026-12-31T23:30:00Z"))).toBe(true);
  });
});
