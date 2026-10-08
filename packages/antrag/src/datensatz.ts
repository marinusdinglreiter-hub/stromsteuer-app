/**
 * Antragsdatensatz (TODO 1.6): flache Struktur in der Feldreihenfolge von
 * Formular 1453 — Abschnitt 1 bis 9, dann die Berechnungstabelle von Seite 2.
 * Diese Reihenfolge ist die Reihenfolge im Portal-Eingabeblatt und im
 * Datenblatt (Excel) fuer die Kanzlei.
 *
 * Die Steuerberechnung selbst passiert NICHT hier, sondern in
 * `@stromsteuer/api` (calc/stromsteuer.ts). Der Aufrufer reicht das Ergebnis
 * herein; hier werden nur Mengen auf die Spalten verteilt und formatiert.
 */

import type { AntragMitRelationen } from "./types";

export type Herkunft = "kunde" | "ocr" | "berechnet" | "kanzlei" | "fest";

export type DatensatzFeld = {
  /** Formular-Abschnitt, z. B. "1", "4", "Seite 2" */
  abschnitt: string;
  label: string;
  /** Fertig formatierter Wert zum Kopieren ins Portal; "" = fehlt */
  wert: string;
  herkunft: Herkunft;
  /** Pfad im Datenmodell, fuer die Rueckverfolgung */
  pfad?: string;
};

/** Ergebnis von `calculateErstattung` (nur die benoetigten Felder). */
export type BerechnungEingabe = {
  nettoKwh: number;
  abzuegeKwh: number;
  satzEurProMwh: number;
  bruttoErstattung: number;
  sockel: number;
  auszahlung: number;
};

export type BerechnungsTabelle = {
  satzEurProMwh: number;
  /** Spalte 3, MWh mit drei Dezimalstellen */
  spalte3Mwh: number;
  spalte4Mwh: number;
  spalte5Mwh: number;
  gesamtMwh: number;
  gesamtsummeEur: number;
  selbstbehaltEur: number;
  zuEntlastenEur: number;
};

export type LieferstelleZeile = {
  nr: number;
  bezeichnung: string;
  adresse: string;
  versorger: string;
  zeitraum: string;
  kwhEigenbetrieblich: number;
  kwhNutzenergiePG: number;
  kwhNutzenergieLuF: number;
  stromsteuerGezahltEur: number | null;
  belege: number;
  ocrConfidence: number | null;
};

export type Antragsdatensatz = {
  antragId: string;
  erzeugtAm: Date;
  felder: DatensatzFeld[];
  tabelle: BerechnungsTabelle;
  lieferstellen: LieferstelleZeile[];
};

const ENTLASTUNGSABSCHNITT_LABEL = {
  KALENDERJAHR: "Kalenderjahr",
  HALBJAHR: "Kalenderhalbjahr",
  QUARTAL: "Kalendervierteljahr",
  MONAT: "Kalendermonat",
} as const;

export function formatMwh(mwh: number): string {
  return mwh.toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function formatEur(eur: number): string {
  return eur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function datum(d: Date | null): string {
  return d
    ? d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" })
    : "";
}

function janein(v: boolean | null | undefined): string {
  if (v === true) return "Ja";
  if (v === false) return "Nein";
  return "";
}

function kwhZuMwh(kwh: number): number {
  return Math.round(kwh) / 1000;
}

export function erzeugeDatensatz(
  antrag: AntragMitRelationen,
  berechnung: BerechnungEingabe,
  erzeugtAm: Date = new Date(),
): Antragsdatensatz {
  const m = antrag.mandant;
  const felder: DatensatzFeld[] = [];
  const f = (abschnitt: string, label: string, wert: string | null | undefined, herkunft: Herkunft, pfad?: string) =>
    felder.push({ abschnitt, label, wert: wert ?? "", herkunft, pfad });

  // --- Abschnitt 1 — Anmelder und Rahmen ---
  f("1", "Anmelder/in — Name", m?.firmenname, "kunde", "mandant.firmenname");
  f("1", "Rechtsform", m?.rechtsform, "kunde", "mandant.rechtsform");
  f("1", "Vertreten durch", m?.geschaeftsfuehrer, "kunde", "mandant.geschaeftsfuehrer");
  f("1", "Strasse", m?.strasse, "kunde", "mandant.strasse");
  f("1", "PLZ", m?.plz, "kunde", "mandant.plz");
  f("1", "Ort", m?.ort, "kunde", "mandant.ort");
  f("1", "E-Mail", m?.email, "kunde", "mandant.email");
  f("1", "Steuernummer", m?.steuernummer, "kunde", "mandant.steuernummer");
  f("1", "USt-IdNr.", m?.ustIdNr, "kunde", "mandant.ustIdNr");
  f("1", "Handelsregister", m?.handelsregister, "kunde", "mandant.handelsregister");
  f("1", "WZ-Code", m?.wzCode, "kunde", "mandant.wzCode");
  f("1", "Hauptzollamt", m?.hauptzollamt, "kunde", "mandant.hauptzollamt");
  f(
    "1",
    "Unternehmensart",
    m?.unternehmensart === "PRODUZIERENDES_GEWERBE"
      ? "Unternehmen des Produzierenden Gewerbes i. S. d. § 2 Nr. 3 StromStG"
      : m?.unternehmensart === "LAND_FORSTWIRTSCHAFT"
        ? "Unternehmen der Land- und Forstwirtschaft i. S. d. § 2 Nr. 5 StromStG"
        : "",
    "kunde",
    "mandant.unternehmensart",
  );
  f(
    "1",
    "Zeitraum (Entlastungsabschnitt)",
    antrag.antragsjahr !== null
      ? `${ENTLASTUNGSABSCHNITT_LABEL[antrag.entlastungsabschnitt]} ${antrag.antragsjahr}`
      : "",
    "kunde",
    "antrag.antragsjahr",
  );

  // --- Abschnitt 2 ---
  f(
    "2",
    "Beschreibung der wirtschaftlichen Taetigkeit",
    antrag.beschreibungTaetigkeitVorgelegt === "BEREITS_VORGELEGT"
      ? "wurde bereits vorgelegt"
      : antrag.beschreibungTaetigkeitVorgelegt === "LIEGT_BEI"
        ? "wird mit diesem Antrag vorgelegt"
        : "",
    "kunde",
    "antrag.beschreibungTaetigkeitVorgelegt",
  );

  // --- Abschnitt 3 ---
  f("3", "Steuererklaerung", "Ich beantrage die Entlastung von der Stromsteuer nach § 9b StromStG.", "fest");

  // --- Abschnitt 4 — Bankverbindung ---
  f("4", "Kontoinhaber", m?.kontoinhaber, "kunde", "mandant.kontoinhaber");
  f("4", "IBAN", m?.iban, "kunde", "mandant.iban");
  f("4", "BIC", m?.bic, "kunde", "mandant.bic");

  // --- Abschnitt 5 bis 7 ---
  f("5", "Schaetzung nach § 17b Abs. 5 StromStV", janein(antrag.schaetzungNach17b), "kunde", "antrag.schaetzungNach17b");
  f("6", "Strom an Dritte geleistet", janein(antrag.stromAnDritteGeleistet), "kunde", "antrag.stromAnDritteGeleistet");
  f(
    "6",
    "Nutzenergie an Dritte weitergegeben",
    janein(antrag.nutzenergieAnDritteWeitergegeben),
    "kunde",
    "antrag.nutzenergieAnDritteWeitergegeben",
  );
  f(
    "7",
    "Entnahme durch einen Dritten",
    janein(antrag.entnahmeDurchDritten),
    "kunde",
    "antrag.entnahmeDurchDritten",
  );

  // --- Abschnitt 9 — Anlagen ---
  const anzahlBelege = antrag.lieferstellen.reduce((s, l) => s + l.belegFileKeys.length, 0);
  const empfaenger1456 = antrag.nutzenergieEmpfaenger.length;
  f("9", "Stromrechnungen (Anzahl)", String(anzahlBelege), "berechnet");
  f("9", "Zuordnungsaufstellung Nutzenergie", empfaenger1456 > 0 ? "liegt bei" : "entfaellt", "berechnet");
  f("9", "Selbsterklaerungen Formular 1456 (Anzahl)", String(antrag.nutzenergieEmpfaenger.filter((e) => e.selbsterklaerungVorhanden).length), "berechnet");
  f("9", "Selbsterklaerung Beihilfen Formular 1139", antrag.beihilfeSelbsterklaerungVorhanden ? "liegt bei" : "", "kunde", "antrag.beihilfeSelbsterklaerungVorhanden");

  // --- Seite 2 — Berechnungstabelle ---
  const kwhPG = antrag.lieferstellen.reduce((s, l) => s + l.kwhNutzenergiePG, 0);
  const kwhLuF = antrag.lieferstellen.reduce((s, l) => s + l.kwhNutzenergieLuF, 0);
  // Abzuege (Privatnutzung, E-Auto) mindern nur Spalte 3 — sie sind nicht betriebliche Entnahmen.
  const kwhSpalte3 = Math.max(0, berechnung.nettoKwh - kwhPG - kwhLuF);
  const tabelle: BerechnungsTabelle = {
    satzEurProMwh: berechnung.satzEurProMwh,
    spalte3Mwh: kwhZuMwh(kwhSpalte3),
    spalte4Mwh: kwhZuMwh(kwhPG),
    spalte5Mwh: kwhZuMwh(kwhLuF),
    gesamtMwh: kwhZuMwh(berechnung.nettoKwh),
    gesamtsummeEur: berechnung.bruttoErstattung,
    selbstbehaltEur: berechnung.sockel,
    zuEntlastenEur: berechnung.auszahlung,
  };

  f("Seite 2", "Spalte 1 — Entlastungsgegenstand", "Elektrischer Strom, § 3 StromStG", "fest");
  f("Seite 2", "Spalte 2 — Entlastungssatz EUR je MWh", formatEur(tabelle.satzEurProMwh), "berechnet");
  f("Seite 2", "Spalte 3 — betriebliche Zwecke (MWh)", formatMwh(tabelle.spalte3Mwh), "berechnet");
  f("Seite 2", "Spalte 4 — Nutzenergie Produzierendes Gewerbe (MWh)", formatMwh(tabelle.spalte4Mwh), "berechnet");
  f("Seite 2", "Spalte 5 — Nutzenergie Land-/Forstwirtschaft (MWh)", formatMwh(tabelle.spalte5Mwh), "berechnet");
  f("Seite 2", "Gesamtsumme (EUR)", formatEur(tabelle.gesamtsummeEur), "berechnet");
  f("Seite 2", "abzueglich Selbstbehalt § 9b Abs. 2 StromStG (EUR)", formatEur(tabelle.selbstbehaltEur), "berechnet");
  f("Seite 2", "zu entlasten (EUR)", formatEur(tabelle.zuEntlastenEur), "berechnet");

  const lieferstellen: LieferstelleZeile[] = antrag.lieferstellen.map((l, i) => ({
    nr: i + 1,
    bezeichnung: l.firmenname,
    adresse: [l.adresse, l.plz].filter(Boolean).join(", "),
    versorger: l.versorger ?? "",
    zeitraum: l.zeitraumVon || l.zeitraumBis ? `${datum(l.zeitraumVon)} – ${datum(l.zeitraumBis)}` : "",
    kwhEigenbetrieblich: l.kwhEigenbetrieblich,
    kwhNutzenergiePG: l.kwhNutzenergiePG,
    kwhNutzenergieLuF: l.kwhNutzenergieLuF,
    stromsteuerGezahltEur: l.stromsteuerGezahltEur === null ? null : Number(l.stromsteuerGezahltEur),
    belege: l.belegFileKeys.length,
    ocrConfidence: l.ocrConfidence,
  }));

  return { antragId: antrag.id, erzeugtAm, felder, tabelle, lieferstellen };
}
