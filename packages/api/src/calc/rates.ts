/**
 * Entlastungssaetze nach § 9b StromStG als datierte Tabelle mit Quelle.
 *
 * Saetze niemals aus Formularen uebernehmen: Formular 1453 (Fassung 07/2025)
 * nennt in der Berechnungstabelle noch 5,13 €/MWh, gueltig sind ab dem
 * Verbrauchsjahr 2024 20,00 €/MWh (docs/formulare/1453-feldspezifikation.md).
 */

export type EntlastungsSatz = {
  /** Erstes Verbrauchsjahr, fuer das dieser Satz gilt. */
  gueltigAbJahr: number;
  eurProMwh: number;
  selbstbehaltEur: number;
  quelle: string;
};

/** Absteigend nach gueltigAbJahr sortiert. */
export const ENTLASTUNGS_SAETZE: EntlastungsSatz[] = [
  {
    gueltigAbJahr: 2024,
    eurProMwh: 20.0,
    selbstbehaltEur: 250,
    quelle: "zoll.de, Steuerentlastung nach § 9b StromStG, abgerufen 2026-09-16",
  },
  {
    gueltigAbJahr: 2011,
    eurProMwh: 5.13,
    selbstbehaltEur: 250,
    quelle: "§ 9b Abs. 2 StromStG in der bis 2023 geltenden Fassung",
  },
];

export function satzFuer(verbrauchsjahr: number): EntlastungsSatz {
  const satz = ENTLASTUNGS_SAETZE.find((s) => verbrauchsjahr >= s.gueltigAbJahr);
  if (!satz) throw new Error(`Kein Entlastungssatz für ${verbrauchsjahr}`);
  return satz;
}
