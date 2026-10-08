/**
 * Vorpruefung mit Hardstop vor Vertragsschluss (TODO 1.6). Ein Fall, der
 * nicht anspruchsberechtigt ist, darf den Vertragsschluss nicht erreichen —
 * ohne Rechnung und mit Begruendung im Klartext.
 */

import type { Unternehmensart } from "@stromsteuer/db";

export type VorpruefungEingabe = {
  /** null = noch nicht beantwortet, "KEINE" = keine der beiden Unternehmensarten */
  unternehmensart: Unternehmensart | "KEINE" | null;
  /** Erstattung nach Selbstbehalt aus calculateErstattung */
  auszahlungEur: number;
  triageKeineEuRueckforderung: boolean | null;
};

export type VorpruefungErgebnis =
  | { status: "ok" }
  | { status: "hardstop"; gruende: string[] }
  | { status: "unvollstaendig"; fehlend: string[] };

export function vorpruefung(e: VorpruefungEingabe): VorpruefungErgebnis {
  const gruende: string[] = [];
  if (e.unternehmensart === "KEINE") {
    gruende.push(
      "Die Entlastung nach § 9b StromStG steht nur Unternehmen des Produzierenden Gewerbes " +
        "(§ 2 Nr. 3 StromStG) und der Land- und Forstwirtschaft (§ 2 Nr. 5 StromStG) zu.",
    );
  }
  if (e.triageKeineEuRueckforderung === false) {
    gruende.push(
      "Bei einer offenen Rueckforderungsanordnung der EU-Kommission darf die Beihilfe nicht " +
        "gewaehrt werden (Art. 1 Abs. 4 AGVO).",
    );
  }
  if (e.auszahlungEur <= 0) {
    gruende.push(
      "Die berechnete Entlastung liegt nicht ueber dem Selbstbehalt von 250 Euro je " +
        "Kalenderjahr (§ 9b Abs. 2 StromStG). Es bliebe nichts zu erstatten.",
    );
  }
  if (gruende.length > 0) return { status: "hardstop", gruende };

  const fehlend: string[] = [];
  if (e.unternehmensart === null) fehlend.push("Unternehmensart");
  if (e.triageKeineEuRueckforderung === null) fehlend.push("Erklaerung zur EU-Rueckforderung");
  if (fehlend.length > 0) return { status: "unvollstaendig", fehlend };

  return { status: "ok" };
}
