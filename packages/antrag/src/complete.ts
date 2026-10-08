/**
 * Vollstaendigkeits-Gate (TODO 1.5). Einzige Stelle, die festlegt, welche
 * Angaben ein Antrag braucht. Wizard, Admin und Datenblatt rufen diese
 * Funktion auf, statt eigene Regeln zu fuehren.
 *
 * Zwei Phasen:
 *  - "uebergabe":   Kunde schliesst den Wizard ab und uebergibt an die Kanzlei.
 *                   Alles, was der Kunde liefern kann, muss da sein.
 *  - "einreichung": Kanzlei stellt den Antrag im Zoll-Portal. Zusaetzlich muss
 *                   die Portal-Vollmacht aktiv sein.
 */

import type { AntragMitRelationen } from "./types";

export type FehlendesFeld = {
  /** Pfad im Datenmodell, z. B. "mandant.iban" */
  feld: string;
  /** Klartext fuer Kunde oder Kanzlei */
  label: string;
  quelle: "kunde" | "kanzlei" | "berechnet";
  /** Abschnitt in Formular 1453, fuer die Rueckverfolgung */
  formularAbschnitt?: string;
};

export type Phase = "uebergabe" | "einreichung";

function leer(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === "";
}

export function pruefeVollstaendigkeit(
  antrag: AntragMitRelationen,
  phase: Phase = "einreichung",
): FehlendesFeld[] {
  const fehlend: FehlendesFeld[] = [];
  const add = (f: FehlendesFeld) => fehlend.push(f);
  const m = antrag.mandant;

  if (!m) {
    add({ feld: "mandant", label: "Firmendaten fehlen vollstaendig", quelle: "kunde", formularAbschnitt: "1" });
  } else {
    if (leer(m.firmenname)) add({ feld: "mandant.firmenname", label: "Firmenname", quelle: "kunde", formularAbschnitt: "1" });
    if (leer(m.strasse) || leer(m.plz) || leer(m.ort)) {
      add({ feld: "mandant.anschrift", label: "Anschrift (Strasse, PLZ, Ort)", quelle: "kunde", formularAbschnitt: "1" });
    }
    if (leer(m.rechtsform)) add({ feld: "mandant.rechtsform", label: "Rechtsform", quelle: "kunde", formularAbschnitt: "1" });
    if (!m.unternehmensart) {
      add({ feld: "mandant.unternehmensart", label: "Unternehmensart (Produzierendes Gewerbe oder Land-/Forstwirtschaft)", quelle: "kunde", formularAbschnitt: "1" });
    }
    if (leer(m.steuernummer)) add({ feld: "mandant.steuernummer", label: "Steuernummer", quelle: "kunde", formularAbschnitt: "1" });
    if (leer(m.hauptzollamt)) add({ feld: "mandant.hauptzollamt", label: "Zustaendiges Hauptzollamt (nach Geschaeftssitz)", quelle: "kunde", formularAbschnitt: "1" });
    if (leer(m.kontoinhaber)) add({ feld: "mandant.kontoinhaber", label: "Kontoinhaber", quelle: "kunde", formularAbschnitt: "4" });
    if (leer(m.iban)) add({ feld: "mandant.iban", label: "IBAN", quelle: "kunde", formularAbschnitt: "4" });
  }

  if (antrag.antragsjahr === null) {
    add({ feld: "antrag.antragsjahr", label: "Antragsjahr (Verbrauchsjahr)", quelle: "kunde", formularAbschnitt: "1" });
  }

  const mitMenge = antrag.lieferstellen.filter(
    (l) => l.kwhEigenbetrieblich + l.kwhNutzenergiePG + l.kwhNutzenergieLuF > 0,
  );
  if (mitMenge.length === 0) {
    add({ feld: "lieferstellen", label: "Mindestens eine Lieferstelle mit Verbrauchsmenge", quelle: "kunde", formularAbschnitt: "Seite 2" });
  }
  if (antrag.lieferstellen.some((l) => l.belegFileKeys.length === 0)) {
    add({ feld: "lieferstellen.belege", label: "Stromrechnung fuer jede Lieferstelle", quelle: "kunde", formularAbschnitt: "9" });
  }

  if (antrag.stromAnDritteGeleistet === null) {
    add({ feld: "antrag.stromAnDritteGeleistet", label: "Angabe: Strom an Dritte geleistet (Ja/Nein)", quelle: "kunde", formularAbschnitt: "6" });
  }
  if (antrag.nutzenergieAnDritteWeitergegeben === null) {
    add({ feld: "antrag.nutzenergieAnDritteWeitergegeben", label: "Angabe: Nutzenergie an Dritte weitergegeben (Ja/Nein)", quelle: "kunde", formularAbschnitt: "6" });
  }
  if (antrag.entnahmeDurchDritten === null) {
    add({ feld: "antrag.entnahmeDurchDritten", label: "Angabe: Entnahme durch einen Dritten (Ja/Nein)", quelle: "kunde", formularAbschnitt: "7" });
  }

  if (antrag.beihilfeSelbsterklaerungVorhanden !== true) {
    add({ feld: "antrag.beihilfeSelbsterklaerungVorhanden", label: "Selbsterklaerung zu staatlichen Beihilfen (Formular 1139)", quelle: "kunde", formularAbschnitt: "9" });
  }

  if (!antrag.aufbereitungSignedAt) {
    add({ feld: "antrag.aufbereitungSignedAt", label: "Aufbereitungsvertrag signiert", quelle: "kunde" });
  }
  if (!antrag.kanzleimandatSignedAt) {
    add({ feld: "antrag.kanzleimandatSignedAt", label: "Kanzleimandat und Vollmacht signiert", quelle: "kunde" });
  }

  if (antrag.nutzenergieAnDritteWeitergegeben === true) {
    for (const [kategorie, spalte, label] of [
      ["PRODUZIERENDES_GEWERBE", "kwhNutzenergiePG", "Produzierendes Gewerbe"],
      ["LAND_FORSTWIRTSCHAFT", "kwhNutzenergieLuF", "Land- und Forstwirtschaft"],
    ] as const) {
      const menge = antrag.lieferstellen.reduce((s, l) => s + l[spalte], 0);
      if (menge === 0) continue;
      const empfaenger = antrag.nutzenergieEmpfaenger.filter((e) => e.kategorie === kategorie);
      if (empfaenger.length === 0) {
        add({ feld: `nutzenergieEmpfaenger.${kategorie}`, label: `Nutzenergie-Empfaenger (${label}) mit Menge`, quelle: "kunde", formularAbschnitt: "6" });
        continue;
      }
      if (empfaenger.some((e) => !e.selbsterklaerungVorhanden)) {
        add({ feld: `nutzenergieEmpfaenger.${kategorie}.selbsterklaerung`, label: `Selbsterklaerung 1456 je Empfaenger (${label})`, quelle: "kunde", formularAbschnitt: "9" });
      }
      const zugeordnet = empfaenger.reduce((s, e) => s + e.mengeKwh, 0);
      if (zugeordnet !== menge) {
        add({ feld: `nutzenergieEmpfaenger.${kategorie}.menge`, label: `Zuordnungsaufstellung (${label}): ${zugeordnet} kWh zugeordnet, ${menge} kWh in Spalte ${spalte === "kwhNutzenergiePG" ? 4 : 5}`, quelle: "berechnet", formularAbschnitt: "9" });
      }
    }
  }

  if (phase === "einreichung" && m?.portalZugang?.vollmachtStatus !== "AKTIV") {
    add({ feld: "mandant.portalZugang.vollmachtStatus", label: "Vollmacht im Zoll-Portal aktiv (Dienstleistung \"Sonstige steuerliche Antraege\")", quelle: "kanzlei" });
  }

  return fehlend;
}

export function istEinreichbar(antrag: AntragMitRelationen, phase: Phase = "einreichung"): boolean {
  return pruefeVollstaendigkeit(antrag, phase).length === 0;
}
