/**
 * Folgejahre (TODO 2.3): Wann darf ein Bestandskunde einen Antrag fuer das
 * naechste Verbrauchsjahr aus dem Vorjahr heraus starten? Rein, ohne IO.
 *
 * Stammdaten, Lieferstellen und die Portal-Vollmacht bleiben stehen (sie
 * haengen am Mandanten); neu abgefragt werden Verbrauch (Rechnungen) und die
 * Erklaerungen samt Beihilfe-Selbsterklaerung.
 */

import type { AntragStatus } from "@stromsteuer/db";

import { berlinTag, stichtagsPruefung } from "./onboarding";

export type FolgejahrGrund =
  /** Der Vorjahres-Antrag ist noch nicht bei der Kanzlei eingereicht (oder abgelehnt) */
  | "vorjahr-nicht-eingereicht"
  /** Das Verbrauchsjahr ist noch nicht zu Ende, es gibt keine vollstaendigen Rechnungen */
  | "jahr-nicht-abgeschlossen"
  /** Fuer dieses Verbrauchsjahr gibt es schon einen Antrag */
  | "antrag-existiert"
  /** Der Stichtag fuer einen sicheren Start ist vorbei */
  | "stichtag-verstrichen";

export type FolgejahrErgebnis =
  | { moeglich: true; jahr: number }
  | { moeglich: false; jahr: number | null; grund: FolgejahrGrund };

/** Nur ein eingereichter Antrag begruendet ein Folgejahr; Ablehnung und Entwuerfe nicht. */
const EINGEREICHT: AntragStatus[] = ["SUBMITTED", "APPROVED", "PAID"];

export function pruefeFolgejahr(eingabe: {
  vorjahr: { antragsjahr: number | null; status: AntragStatus };
  /** Verbrauchsjahre, fuer die der Mandant schon einen nicht abgelaufenen Antrag hat */
  vorhandeneJahre: number[];
  jetzt: Date;
}): FolgejahrErgebnis {
  const { vorjahr, vorhandeneJahre, jetzt } = eingabe;
  if (vorjahr.antragsjahr === null || !EINGEREICHT.includes(vorjahr.status)) {
    return { moeglich: false, jahr: null, grund: "vorjahr-nicht-eingereicht" };
  }
  const jahr = vorjahr.antragsjahr + 1;
  if (jahr >= berlinTag(jetzt).jahr) return { moeglich: false, jahr, grund: "jahr-nicht-abgeschlossen" };
  if (vorhandeneJahre.includes(jahr)) return { moeglich: false, jahr, grund: "antrag-existiert" };
  if (stichtagsPruefung(jahr, jetzt).status === "zu-spaet") {
    return { moeglich: false, jahr, grund: "stichtag-verstrichen" };
  }
  return { moeglich: true, jahr };
}

/** Die Januar-Erinnerung gilt nur im Januar des Folgejahres des Verbrauchsjahres. */
export function istJanuar(jetzt: Date): boolean {
  return berlinTag(jetzt).monat === 1;
}
