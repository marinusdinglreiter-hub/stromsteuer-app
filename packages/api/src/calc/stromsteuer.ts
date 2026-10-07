/**
 * Stromsteuer-Entlastung nach § 9b StromStG — gesetzliche Berechnung.
 *
 * Nur die Erstattung. Unser Preis ist davon getrennt und haengt am
 * Verbrauchsband, nicht am Ergebnis (calc/preise.ts, docs/10).
 *
 * Formel:
 *   nettoKwh          = bruttoKwh - Abzuege (Privatnutzung, E-Auto)
 *   nettoMwh          = nettoKwh / 1000, drei Dezimalstellen (verlustfrei)
 *   bruttoErstattung  = nettoMwh * Satz, kaufmaennisch auf Cent gerundet
 *   auszahlung        = max(0, bruttoErstattung - Selbstbehalt)
 *
 * Rundung: Der Antrag rechnet in MWh, die Daten liegen in kWh. Nicht auf
 * ganze MWh runden — das verschiebt bei 500 MWh bis zu 10 €. Gerechnet wird
 * in ganzen Cent: kWh × Satz in Cent/MWh ist eine exakte Ganzzahl, geteilt
 * durch 1000 und halb-aufwaerts gerundet.
 *
 * Beispiel Verbrauchsjahr 2025: 800.000 kWh => 16.000,00 € Entlastung,
 * 15.750,00 € Auszahlung.
 */

import { satzFuer } from "./rates";

export { ENTLASTUNGS_SAETZE, satzFuer, type EntlastungsSatz } from "./rates";

export type CalcInput = {
  /** Verbrauchsjahr (Entnahmejahr). Bestimmt Satz und Selbstbehalt. */
  verbrauchsjahr: number;
  /** Brutto-kWh aus allen Lieferstellen (Summe Jahresverbrauch). */
  bruttoKwh: number;
  /** Geschaetzte Privatnutzung in kWh (vom Kunden angegeben). */
  privatnutzungKwh?: number;
  /** Geschaetzte E-Auto-Ladung in kWh (Strassenverkehrs-Fahrzeuge). */
  eAutoKwh?: number;
};

export type CalcResult = {
  verbrauchsjahr: number;
  bruttoKwh: number;
  abzuegeKwh: number;
  nettoKwh: number;
  /** nettoKwh in MWh, drei Dezimalstellen. */
  nettoMwh: number;
  satzEurProMwh: number;
  bruttoErstattung: number;
  /** Selbstbehalt nach § 9b Abs. 2 StromStG. */
  sockel: number;
  /** Erstattung nach Selbstbehalt — der Betrag, der beim Kunden ankommt. */
  auszahlung: number;
};

/**
 * Berechnet die Erstattung fuer einen Antrag.
 * Funktion ist rein und idempotent — kein Datenbankzugriff.
 */
export function calculateErstattung(input: CalcInput): CalcResult {
  const satz = satzFuer(input.verbrauchsjahr);
  const bruttoKwh = Math.max(0, Math.floor(input.bruttoKwh));
  const abzuegeKwh =
    Math.max(0, Math.floor(input.privatnutzungKwh ?? 0)) +
    Math.max(0, Math.floor(input.eAutoKwh ?? 0));
  const nettoKwh = Math.max(0, bruttoKwh - abzuegeKwh);

  const satzCentProMwh = Math.round(satz.eurProMwh * 100);
  const erstattungCent = Math.round((nettoKwh * satzCentProMwh) / 1000);
  const selbstbehaltCent = Math.round(satz.selbstbehaltEur * 100);

  return {
    verbrauchsjahr: input.verbrauchsjahr,
    bruttoKwh,
    abzuegeKwh,
    nettoKwh,
    nettoMwh: nettoKwh / 1000,
    satzEurProMwh: satz.eurProMwh,
    bruttoErstattung: erstattungCent / 100,
    sockel: satz.selbstbehaltEur,
    auszahlung: Math.max(0, erstattungCent - selbstbehaltCent) / 100,
  };
}

/**
 * Untergrenze, ab der wir einen Festpreis anbieten. Darunter laege der Preis
 * effektiv ueber 25 % der Erstattung (docs/10, kleinstes Preisband 150 MWh).
 * Rechnerisch beginnt die Entlastung schon bei 12.500 kWh (= 250 €).
 */
export const MINDEST_KWH_WIRTSCHAFTLICH = 150_000;

export function istWirtschaftlich(bruttoKwh: number): boolean {
  return bruttoKwh >= MINDEST_KWH_WIRTSCHAFTLICH;
}
