/**
 * Stichtage fuer den Start eines Antrags, rueckwaerts gerechnet von der
 * Ausschlussfrist (31.12. des Jahres nach dem Verbrauchsjahr).
 *
 * Quelle der Rueckrechnung: docs/20-vollmachts-onboarding.md, Abschnitt
 * "Stichtage". Einreichung durch die Kanzlei bis 15.12., Aufbereitung bis
 * 08.12., Vollmacht eingeloest bis 01.12., Registrierung und Vollmacht beim
 * Kunden bis 24.11., ELSTER-Zertifikat beantragt bis 10.11.
 */
import { aktuellesAntragsjahr } from "./antrag";

export type Stichtage = {
  verbrauchsjahr: number;
  /** Ausschlussfrist beim Hauptzollamt. */
  ausschlussfrist: Date;
  /** Spaetester Start, wenn das ELSTER-Zertifikat im Haus ist. */
  startMitZertifikat: Date;
  /** Spaetester Start, wenn das Zertifikat erst beantragt werden muss. */
  startOhneZertifikat: Date;
};

export function stichtage(verbrauchsjahr = aktuellesAntragsjahr()): Stichtage {
  const fristJahr = verbrauchsjahr + 1;
  return {
    verbrauchsjahr,
    ausschlussfrist: new Date(fristJahr, 11, 31),
    startMitZertifikat: new Date(fristJahr, 10, 24),
    startOhneZertifikat: new Date(fristJahr, 10, 10),
  };
}

/** Ganze Kalendertage von `ref` bis `ziel` (negativ, wenn vorbei). */
export function tageBis(ziel: Date, ref: Date = new Date()): number {
  const tag = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((tag(ziel) - tag(ref)) / 86_400_000);
}

export function formatDatum(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
