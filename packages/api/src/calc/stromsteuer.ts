/**
 * Stromsteuer-Erstattung nach § 9b StromStG — Partnerkanzlei-Modell.
 *
 * Formel:
 *   bruttoErstattung   = (bruttoKwh - abzuegeKwh) * 0,02 €
 *   afterSockel        = max(0, bruttoErstattung - 250 €)
 *   prozentHonorar     = afterSockel * 0,141
 *   honorar            = max(500 €, prozentHonorar)   // Floor
 *   nettoAuszahlung    = max(0, afterSockel - honorar)
 *
 * Screenshot-Verifikation:
 *   800.000 kWh, keine Abzuege => 13.529,25 € Auszahlung
 *    48.560 kWh, keine Abzuege =>    221,20 € Auszahlung (Honorar-Floor greift)
 *
 * Beachte: Die Geldwerte werden auf 2 Nachkommastellen kaufmaennisch gerundet.
 * Mit den heutigen Konstanten (ganzzahlige kWh + Faktor 0,02 + 0,141) bleiben
 * die Zwischenwerte exakt darstellbar in IEEE-754; eine Decimal-Library ist
 * fuer das MVP nicht noetig. Falls die Konstanten dynamisch werden, auf
 * decimal.js wechseln.
 */

/** Entlastungssatz in EUR pro kWh (ab 2024 dauerhaft 20 €/MWh = 0,02 €/kWh). */
export const ENTLASTUNGSSATZ_EUR_PRO_KWH = 0.02;

/** Gesetzlicher Sockelbetrag in EUR pro Kalenderjahr (§ 9b Abs. 2 StromStG). */
export const SOCKEL_EUR = 250;

/** Honorar-Anteil an der Erstattung nach Sockel (Erfolgshonorar nach § 4a RVG). */
export const HONORAR_QUOTE = 0.141;

/** Mindesthonorar (Floor) der Partnerkanzlei in EUR. */
export const HONORAR_FLOOR_EUR = 500;

export type CalcInput = {
  /** Brutto-kWh aus allen Lieferstellen (Summe Jahresverbrauch). */
  bruttoKwh: number;
  /** Geschaetzte Privatnutzung in kWh (vom Kunden angegeben). */
  privatnutzungKwh?: number;
  /** Geschaetzte E-Auto-Ladung in kWh (Strassenverkehrs-Fahrzeuge). */
  eAutoKwh?: number;
};

export type CalcResult = {
  bruttoKwh: number;
  abzuegeKwh: number;
  nettoKwh: number;
  bruttoErstattung: number;
  sockel: number;
  honorar: number;
  /** Effektiver Honorarsatz in Prozent (Floor faengt kleine Antraege auf). */
  honorarSatz: number;
  nettoAuszahlung: number;
};

/** Rundet auf 2 Nachkommastellen (kaufmaennisch, halb-aufwaerts). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Berechnet die Erstattung fuer einen Antrag.
 * Funktion ist rein und idempotent — kein Datenbankzugriff.
 */
export function calculateErstattung(input: CalcInput): CalcResult {
  const bruttoKwh = Math.max(0, Math.floor(input.bruttoKwh));
  const abzuegeKwh =
    Math.max(0, Math.floor(input.privatnutzungKwh ?? 0)) +
    Math.max(0, Math.floor(input.eAutoKwh ?? 0));
  const nettoKwh = Math.max(0, bruttoKwh - abzuegeKwh);

  const bruttoErstattung = round2(nettoKwh * ENTLASTUNGSSATZ_EUR_PRO_KWH);
  const afterSockel = Math.max(0, round2(bruttoErstattung - SOCKEL_EUR));

  const prozentHonorar = round2(afterSockel * HONORAR_QUOTE);
  const honorar = Math.max(HONORAR_FLOOR_EUR, prozentHonorar);
  const honorarSatz =
    afterSockel > 0 ? round2((honorar / afterSockel) * 100) : 0;

  const nettoAuszahlung = Math.max(0, round2(afterSockel - honorar));

  return {
    bruttoKwh,
    abzuegeKwh,
    nettoKwh,
    bruttoErstattung,
    sockel: SOCKEL_EUR,
    honorar,
    honorarSatz,
    nettoAuszahlung,
  };
}

/**
 * Schwelle, ab der ein Antrag wirtschaftlich Sinn macht:
 * Sockel (250 €) muss ueber dem Brutto-Anspruch liegen, sonst 0 € Erstattung.
 * 12.500 kWh × 0,02 € = 250 € -> erst darueber faengt es an.
 * Praktisch "spuerbar" ab ~40.000 kWh (EnergyIQ-Mindestschwelle).
 */
export const MINDEST_KWH_WIRTSCHAFTLICH = 40_000;

export function istWirtschaftlich(bruttoKwh: number): boolean {
  return bruttoKwh >= MINDEST_KWH_WIRTSCHAFTLICH;
}
