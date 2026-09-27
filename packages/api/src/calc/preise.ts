/**
 * Preistabelle fuer die Aufbereitung (unser Vertrag, TODO 1.2).
 *
 * Festpreis nach Verbrauchsband, vorab bekannt und unabhaengig vom Bescheid.
 * Herleitung und Begruendung: docs/10-entscheidung-abrechnungsstruktur.md.
 *
 * Nicht tun: einen Preis je MWh einfuehren. Weil die Erstattung genau
 * 20 €/MWh betraegt, waere ein Betrag je MWh mathematisch ein fester
 * Prozentsatz der Erstattung. Nur Baender.
 */

export type PreisBand = {
  vonMwh: number;
  /** null = offen nach oben */
  bisMwh: number | null;
  /** null = individuell zu verhandeln */
  preisEur: number | null;
};

export type PreisTabelle = {
  version: string;
  /** Ab diesem Vertragsschlussdatum gilt die Tabelle (ISO). */
  gueltigAb: string;
  baender: PreisBand[];
  /** Faktor fuer den zweiten und jeden weiteren Antrag desselben Mandanten. */
  folgejahrFaktor: number;
};

/** Neueste Tabelle zuerst. */
export const PREIS_TABELLEN: PreisTabelle[] = [
  {
    version: "2026-09",
    gueltigAb: "2026-09-27",
    folgejahrFaktor: 0.6,
    baender: [
      { vonMwh: 150, bisMwh: 250, preisEur: 690 },
      { vonMwh: 250, bisMwh: 400, preisEur: 1090 },
      { vonMwh: 400, bisMwh: 600, preisEur: 1590 },
      { vonMwh: 600, bisMwh: 900, preisEur: 2190 },
      { vonMwh: 900, bisMwh: 1300, preisEur: 2890 },
      { vonMwh: 1300, bisMwh: 2000, preisEur: 3790 },
      { vonMwh: 2000, bisMwh: 3000, preisEur: 4990 },
      { vonMwh: 3000, bisMwh: null, preisEur: null },
    ],
  },
];

export type PreisErgebnis = {
  /** null = kein Festpreis (unter dem kleinsten Band oder individuelles Angebot). */
  preisEur: number | null;
  version: string;
  /** null = Verbrauch liegt unter dem kleinsten Band. */
  band: PreisBand | null;
};

export function preisTabelle(version?: string): PreisTabelle {
  const tabelle = version
    ? PREIS_TABELLEN.find((t) => t.version === version)
    : PREIS_TABELLEN[0];
  if (!tabelle) throw new Error(`Unbekannte Preistabelle ${version}`);
  return tabelle;
}

/**
 * Folgejahrespreis: Erstjahrespreis × Faktor, auf volle 10 € abgerundet.
 * Ergibt exakt die Folgejahres-Tabelle in docs/10 (z. B. 690 € → 410 €).
 */
export function folgejahrPreis(preisEur: number, faktor: number): number {
  return Math.floor((preisEur * faktor) / 10) * 10;
}

/**
 * Preis fuer einen Jahresverbrauch in MWh. Bandgrenzen sind unten
 * einschliessend, oben ausschliessend: 250 MWh faellt in 250–400.
 * Ohne `tabelleVersion` gilt die neueste Tabelle; mit Version die
 * historische, damit ein Altvertrag zu seinem Preis abgerechnet wird.
 */
export function preisFuer(
  mwh: number,
  opts: { istFolgejahr?: boolean; tabelleVersion?: string } = {},
): PreisErgebnis {
  const tabelle = preisTabelle(opts.tabelleVersion);
  const band =
    tabelle.baender.find(
      (b) => mwh >= b.vonMwh && (b.bisMwh === null || mwh < b.bisMwh),
    ) ?? null;

  let preisEur = band?.preisEur ?? null;
  if (preisEur !== null && opts.istFolgejahr) {
    preisEur = folgejahrPreis(preisEur, tabelle.folgejahrFaktor);
  }
  return { preisEur, version: tabelle.version, band };
}
