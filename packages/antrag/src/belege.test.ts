import type { Beleg } from "@stromsteuer/db";
import { describe, expect, it } from "vitest";

import { aggregiereBelege, mengeNachBeleg, pruefeLieferstelle } from "./belege";
import { beleg, lieferstelle } from "./fixtures";

const REGEL = 20.5;
const eur = (v: number) => v as unknown as Beleg["stromsteuerEur"];
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Zwoelf Monatsrechnungen fuer 2025 zu je 10.000 kWh. */
function monatsrechnungen(): Beleg[] {
  return Array.from({ length: 12 }, (_, m) =>
    beleg({
      id: `b${m}`,
      dateiname: `rechnung-${m + 1}.pdf`,
      kwh: 10_000,
      stromsteuerEur: eur(205),
      zeitraumVon: new Date(Date.UTC(2025, m, 1)),
      zeitraumBis: new Date(Date.UTC(2025, m + 1, 0)),
    }),
  );
}

const texte = (l: ReturnType<typeof lieferstelle>, antragsjahr: number | null = 2025) =>
  pruefeLieferstelle(l, { antragsjahr, regelsatzEurProMwh: REGEL }).map((h) => h.text);

describe("aggregiereBelege", () => {
  it("summiert Monatsrechnungen und spannt den Zeitraum auf", () => {
    const agg = aggregiereBelege(monatsrechnungen());
    expect(agg.kwh).toBe(120_000);
    expect(agg.stromsteuerEur).toBe(2460);
    expect(agg.zeitraumVon).toEqual(d("2025-01-01"));
    expect(agg.zeitraumBis).toEqual(d("2025-12-31"));
  });

  it("nimmt die schwaechste OCR-Konfidenz", () => {
    const agg = aggregiereBelege([beleg({ ocrConfidence: 0.9 }), beleg({ ocrConfidence: 0.5 })]);
    expect(agg.ocrConfidence).toBe(0.5);
  });

  it("ohne erkannte Menge: null statt 0", () => {
    expect(aggregiereBelege([beleg({ kwh: null })]).kwh).toBeNull();
  });
});

describe("mengeNachBeleg", () => {
  const b1 = beleg({ kwh: 10_000 });
  const b2 = beleg({ kwh: 12_000 });

  it("leere Lieferstelle uebernimmt die Belegsumme", () => {
    expect(mengeNachBeleg(0, [], [b1])).toBe(10_000);
  });

  it("folgt der Summe, solange nicht von Hand geaendert", () => {
    expect(mengeNachBeleg(10_000, [b1], [b1, b2])).toBe(22_000);
  });

  it("laesst eine von Hand geaenderte Menge stehen", () => {
    expect(mengeNachBeleg(50_000, [b1], [b1, b2])).toBeUndefined();
  });

  it("Beleg ohne Menge aendert nichts", () => {
    expect(mengeNachBeleg(0, [], [beleg({ kwh: null })])).toBeUndefined();
  });
});

describe("pruefeLieferstelle", () => {
  it("vollstaendige Jahresrechnung: keine Hinweise", () => {
    expect(texte(lieferstelle())).toEqual([]);
  });

  it("zwoelf lueckenlose Monatsrechnungen: keine Hinweise", () => {
    expect(texte(lieferstelle({ kwhEigenbetrieblich: 120_000, belege: monatsrechnungen() }))).toEqual([]);
  });

  it("fehlender Monat wird als Luecke gemeldet", () => {
    const belege = monatsrechnungen().filter((_, m) => m !== 5);
    const t = texte(lieferstelle({ kwhEigenbetrieblich: 110_000, belege }));
    expect(t).toHaveLength(1);
    expect(t[0]).toContain("Lücke zwischen 31.05.2025 und 01.07.2025");
  });

  it("doppelt hochgeladener Zeitraum wird als Ueberlappung gemeldet", () => {
    const belege = [...monatsrechnungen(), beleg({ dateiname: "jahr.pdf", kwh: 120_000, stromsteuerEur: eur(2460) })];
    const t = texte(lieferstelle({ kwhEigenbetrieblich: 240_000, belege }));
    expect(t.some((x) => x.includes("überlappen"))).toBe(true);
  });

  it("rollierende Jahresrechnung: ueber das Kalenderjahr hinaus und Anfang fehlt", () => {
    const t = texte(
      lieferstelle({ belege: [beleg({ zeitraumVon: d("2025-03-15"), zeitraumBis: d("2026-03-14") })] }),
    );
    expect(t.some((x) => x.includes("reicht über das Kalenderjahr 2025 hinaus"))).toBe(true);
    expect(t.some((x) => x.includes("beginnen erst am 15.03.2025"))).toBe(true);
  });

  it("Ablesung am 2.1. des Folgejahres liegt in der Toleranz", () => {
    const t = texte(lieferstelle({ belege: [beleg({ zeitraumBis: d("2026-01-02") })] }));
    expect(t).toEqual([]);
  });

  it("Rechnung aus dem falschen Jahr", () => {
    const t = texte(lieferstelle(), 2024);
    expect(t.some((x) => x.includes("reicht über das Kalenderjahr 2024 hinaus"))).toBe(true);
  });

  it("Stromsteuer passt nicht zur Menge", () => {
    const t = texte(lieferstelle({ belege: [beleg({ stromsteuerEur: eur(20.5) })] }));
    expect(t[0]).toContain("entspricht 0,03 €/MWh statt 20,50 €/MWh");
  });

  it("Stromsteuer innerhalb von 5 % ist in Ordnung", () => {
    expect(texte(lieferstelle({ belege: [beleg({ stromsteuerEur: eur(16_800) })] }))).toEqual([]);
  });

  it("ohne Regelsatz keine Plausibilitaetspruefung", () => {
    const l = lieferstelle({ belege: [beleg({ stromsteuerEur: eur(1) })] });
    expect(pruefeLieferstelle(l, { antragsjahr: 2025 })).toEqual([]);
  });

  it("unsichere OCR, fehlende Menge und unlesbares Bild", () => {
    const t = texte(
      lieferstelle({
        kwhEigenbetrieblich: 800_000,
        belege: [
          beleg({ dateiname: "a.pdf", ocrConfidence: 0.5 }),
          beleg({ dateiname: "b.png", kwh: null, extraktion: "keine", zeitraumVon: null, zeitraumBis: null }),
        ],
      }),
    );
    expect(t).toContain("a.pdf: Erkennung unsicher (50 %), Werte mit dem Beleg abgleichen.");
    expect(t.some((x) => x.startsWith("b.png: nicht automatisch lesbar"))).toBe(true);
  });

  it("von Hand geaenderte Menge wird gemeldet", () => {
    const t = texte(lieferstelle({ kwhEigenbetrieblich: 900_000 }));
    expect(t[0]).toContain("weicht von der Summe der Rechnungen (800.000 kWh) ab");
  });

  it("ohne Rechnung: manuell erfasst", () => {
    const t = texte(lieferstelle({ belege: [], belegFileKeys: [] }));
    expect(t).toEqual(["Keine Rechnung hochgeladen, Menge manuell erfasst."]);
  });

  it("Warnungen stehen vor Infos", () => {
    const h = pruefeLieferstelle(
      lieferstelle({
        kwhEigenbetrieblich: 900_000,
        belege: [beleg({ stromsteuerEur: null })],
      }),
      { antragsjahr: 2025, regelsatzEurProMwh: REGEL },
    );
    expect(h.map((x) => x.stufe)).toEqual(["warnung", "info"]);
  });
});
