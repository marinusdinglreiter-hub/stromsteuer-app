/**
 * Zentrale Antrags-Konfiguration (Schwellwerte, Grenzen, Fristen, Jahre).
 *
 * Single Source of Truth fuer Werte, die bisher mehrfach hartkodiert in
 * Calculator, Hero, MindestverbrauchBanner, AntragsjahrPicker und der
 * Bootstrap-Route lagen. Der wirtschaftliche Mindestverbrauch kommt aus dem
 * Berechnungspaket (`@stromsteuer/api/calc`) — das ist der kanonische
 * Backend-Wert; hier nur re-exportiert, damit Front- und Backend nicht
 * auseinanderlaufen.
 */
import { MINDEST_KWH_WIRTSCHAFTLICH } from "@stromsteuer/api/calc";

export { MINDEST_KWH_WIRTSCHAFTLICH };

/** Obergrenze des Verbrauchs-Sliders im Calculator (UX-Grenze). */
export const KWH_SLIDER_MAX = 10_000_000;

/** Harte Plausibilitaets-Obergrenze fuer Verbrauchseingaben (Validierung). */
export const KWH_HARD_MAX = 50_000_000;

/** Schrittweite des Sliders/Number-Inputs. */
export const KWH_STEP = 10_000;

/** Default-Verbrauch fuer den Calculator. */
export const KWH_DEFAULT = 800_000;

/**
 * Aktuelles Verbrauchs-/Antragsjahr.
 * Verbrauchsjahr ist das Vorjahr; die Einreichfrist nach § 9b StromStG laeuft
 * bis zum 31.12. des Folgejahres (also des laufenden Kalenderjahres).
 * Beispiel: 2026 -> Verbrauchsjahr 2025, Frist 31.12.2026.
 */
export function aktuellesAntragsjahr(ref: Date = new Date()): number {
  return ref.getFullYear() - 1;
}

/**
 * Liste der aktuell antragsfaehigen Verbrauchsjahre.
 * Derzeit genau ein Jahr (das Vorjahr) — die Frist fuer aeltere Jahre ist
 * jeweils zum 31.12. des darauffolgenden Jahres verstrichen.
 */
export function antragsfaehigeJahre(ref: Date = new Date()): number[] {
  return [aktuellesAntragsjahr(ref)];
}

/** Einreichfrist (31.12. des auf das Verbrauchsjahr folgenden Jahres). */
export function fristDatum(antragsjahr: number): string {
  return `31.12.${antragsjahr + 1}`;
}
