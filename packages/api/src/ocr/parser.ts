/**
 * Heuristik-Parser fuer deutsche Stromrechnungen aus AWS-Textract-Output.
 *
 * Reine Funktion ohne Netzwerk- oder Datei-IO — leicht testbar mit
 * synthetischen Block-Arrays. Das eigentliche `AnalyzeDocument`-Wrapping
 * passiert in `textract.ts`.
 *
 * Extrahiert:
 *  - Versorger-Name (Brand-Match aus TOP_VERSORGER oder fallback)
 *  - Verbrauchszeitraum (erstes Datums-Paar)
 *  - Jahres-kWh (Keyword-gewichtet; MWh wird auf kWh normalisiert)
 *  - Lieferadresse (Heuristik: Zeile nach "Lieferstelle:" / "Verbrauchsstelle:")
 *  - Stromsteuer-Betrag (aus "Stromsteuer"-Zeile in Rechnungspositionen)
 *  - Zaehlpunkt bzw. Marktlokations-ID (ordnet Rechnungen einer Lieferstelle zu)
 *  - Composite-Confidence (0..1, wie viele Felder gefunden wurden)
 */

export type TextractLineBlock = {
  BlockType?: string;
  Text?: string;
  Confidence?: number;
};

export type TextractResponseShape = {
  Blocks?: TextractLineBlock[];
};

export type ParsedBeleg = {
  versorger: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  jahresKwh: number | null;
  adresse: string | null;
  /** In der Rechnung ausgewiesener Stromsteuer-Betrag (€). */
  stromsteuerGezahlt: number | null;
  /** Marktlokations-ID (11 Ziffern) oder Zaehlpunktbezeichnung (DE + 31 Zeichen). */
  zaehlpunkt: string | null;
  /**
   * Verbrauch je Kalenderjahr in kWh, aus der Tabelle "Uebersicht der
   * Verbrauchsmengen" (Zeitraum, Zaehlerstaende, Verbrauch). Nur gesetzt, wenn die
   * Intervalle zur Gesamtmenge passen. Wichtig bei Schlussrechnungen ueber mehrere
   * Jahre: Satz, Selbstbehalt und Ausschlussfrist gelten je Verbrauchsjahr.
   */
  verbrauchProJahr: Record<number, number> | null;
  /** Composite-Confidence: Anteil der erfolgreich extrahierten Felder. */
  confidence: number;
  /** Volltext der erkannten Zeilen, falls UI Original anzeigen will. */
  rawLines: string[];
};

/** Bekannte Top-Versorger fuer Brand-Detection. */
const TOP_VERSORGER = [
  "E.ON",
  "EnBW",
  "Vattenfall",
  "RWE",
  "EWE",
  "Stadtwerke",
  "Yello",
  "LichtBlick",
  "Naturstrom",
  "Eprimo",
] as const;

/**
 * Verbrauchs-Pattern: Deutsche Zahlenformatierung mit Punkt als Tausendertrenner
 * und Komma als Dezimaltrenner, gefolgt von der Einheit kWh oder MWh.
 * Beispiele: "12.345 kWh", "48.560,00 kWh", "800 MWh", "1.234,5 MWh".
 * Auch ohne Tausenderpunkte: "12345 kWh". Die Einheit wird als Gruppe erfasst,
 * damit MWh-Werte auf kWh normalisiert werden koennen (× 1000).
 */
const VERBRAUCH_REGEX =
  /([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+)(?:,([0-9]+))?\s*(kWh|MWh)\b/gi;

/** Zeilen mit diesen Begriffen deuten stark auf den Jahresverbrauch hin. */
const VERBRAUCH_POSITIV_REGEX =
  /jahresverbrauch|gesamtverbrauch|verbrauch\s+gesamt|gesamtmenge|abrechnungsmenge|liefermenge|verbrauchsmenge/i;

/**
 * Zeilen mit diesen Begriffen sind KEIN Jahresverbrauch (Zaehlerstaende,
 * Vorjahres-/Vergleichswerte). "zähler" deckt Umlaut- und ae/a-Transliteration
 * ab (OCR liefert beides).
 */
const VERBRAUCH_NEGATIV_REGEX = /z(?:ä|ae|a)hler|vorjahr|vergleich/i;

/** Datums-Pattern: DD.MM.YYYY oder DD.MM.YY. */
const DATE_REGEX = /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/g;

/** "Lieferstelle:" / "Verbrauchsstelle:" / "Standort:" gefolgt von Adresse. */
const ADRESSE_LABEL_REGEX =
  /^(Liefer(?:stelle|adresse)|Verbrauchs(?:stelle|adresse)|Standort)[\s:]*/i;

/**
 * Euro-Betrag im deutschen Format: z. B. "995,48 €", "1.234,56€" oder "1.234,56 EUR".
 * Kein Betrag ist "20,50 €/MWh" (ein Steuersatz): nach dem Euro-Zeichen darf kein "/" folgen.
 */
const EURO_REGEX = /(\d{1,3}(?:\.\d{3})*),(\d{2})\s*(?:€|EUR\b)(?!\s*\/)/i;

/** Zaehlpunktbezeichnung: DE, 6-stellige Netzbetreibernummer, PLZ, 20 Zeichen Zaehlpunktnummer. */
const ZAEHLPUNKT_REGEX = /DE\d{11}[0-9A-Z]{20}/;

/** Zeile mit Marktlokations-Label; die ID steht dort oder in der Folgezeile. */
const MALO_LABEL_REGEX = /marktlokation|\bmalo\b/i;
const MALO_ID_REGEX = /(?<![\dA-Za-z])(\d{11})(?![\d])/;

function parseDeutscheZahl(integer: string, decimal: string | undefined): number {
  const withoutThousand = integer.replace(/\./g, "");
  if (decimal === undefined) {
    return Number(withoutThousand);
  }
  return Number(`${withoutThousand}.${decimal}`);
}

function parseDate(d: string, m: string, y: string): Date | null {
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function extractLines(response: TextractResponseShape): string[] {
  const blocks = response.Blocks ?? [];
  return blocks
    .filter((b) => b.BlockType === "LINE" && b.Text)
    .map((b) => b.Text!.trim())
    .filter((s) => s.length > 0);
}

/** Buchstabe (inkl. Umlaute) – fuer Wortgrenzen beim Marken-Match. */
const BUCHSTABE = "A-Za-zÄÖÜäöüß";

function markenRegex(brand: string): RegExp {
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Links immer eine Wortgrenze: "EWE" steckt sonst in "Gewerbepark" (g-EWE-rbe) und
  // machte aus einer MAINGAU-Rechnung eine EWE-Rechnung. Kurze Namen brauchen
  // auch rechts eine Grenze; "Stadtwerke" darf als "Stadtwerken" weiterlaufen.
  const rechts = brand.length <= 4 ? `(?![${BUCHSTABE}])` : "";
  return new RegExp(`(?<![${BUCHSTABE}])${escaped}${rechts}`, "i");
}

/**
 * Absenderzeile im Briefkopf: "MAINGAU Energie GmbH, Ringstr. 4 - 6, 63179 Obertshausen".
 * Nur mit Rechtsform und anschliessender Adresse, damit keine beliebige Zeile
 * als Versorger durchgeht.
 */
const ABSENDER_REGEX =
  /^\s*([^,\n]{3,60}?\s(?:GmbH|mbH|AG|SE|KG|eG|UG)(?:\s*&\s*Co\.\s*KG)?)\s*,\s*[^,\n]*\d/;

function detectVersorger(lines: string[]): string | null {
  // Top-of-page Brand-Match: schaut auf die ersten ~10 Zeilen, dann Absenderzeile,
  // dann Fallback auf die gesamte Rechnung.
  const search = (zeilen: string[]) =>
    TOP_VERSORGER.find((brand) =>
      zeilen.some((line) => markenRegex(brand).test(line)),
    );
  const kopf = lines.slice(0, 10);
  const marke = search(kopf);
  if (marke) return marke;

  for (const line of kopf) {
    const absender = ABSENDER_REGEX.exec(line);
    if (absender) return absender[1]!.trim();
  }
  return search(lines) ?? null;
}

type KwhKandidat = { value: number; line: string };

function detectJahresKwh(lines: string[]): number | null {
  const kandidaten: KwhKandidat[] = [];
  for (const line of lines) {
    const matches = [...line.matchAll(VERBRAUCH_REGEX)];
    for (const m of matches) {
      const roh = parseDeutscheZahl(m[1]!, m[2]);
      // MWh auf kWh normalisieren, damit alle Kandidaten vergleichbar sind.
      const val = m[3]!.toLowerCase() === "mwh" ? roh * 1000 : roh;
      if (Number.isFinite(val) && val > 0) {
        kandidaten.push({ value: Math.round(val), line });
      }
    }
  }
  if (kandidaten.length === 0) return null;

  // 1) Zeilen mit klarem "Jahresverbrauch"-Hinweis haben Vorrang.
  const positiv = kandidaten.filter((k) =>
    VERBRAUCH_POSITIV_REGEX.test(k.line),
  );
  if (positiv.length > 0) {
    return Math.max(...positiv.map((k) => k.value));
  }

  // 2) Sonst groesster Wert, aber Zaehlerstaende/Vorjahreswerte ausschliessen.
  const ohneStoerer = kandidaten.filter(
    (k) => !VERBRAUCH_NEGATIV_REGEX.test(k.line),
  );
  const basis = ohneStoerer.length > 0 ? ohneStoerer : kandidaten;
  return Math.max(...basis.map((k) => k.value));
}

const TAG_MS = 86_400_000;

/**
 * Zeile der Verbrauchstabelle: "01.02.2025 - 09.06.2025 1.018 1.195 1) 177 50 8.850 kWh" –
 * Zeitraum vorn, Verbrauch in kWh am Zeilenende. Preiszeilen ("... 25,80 Ct/kWh 8.850 kWh
 * 19% 2.283,30 €") enden mit einem Betrag und werden dadurch nicht erfasst.
 */
const VERBRAUCHS_INTERVALL_REGEX =
  /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\b.*?((?:\d{1,3}(?:\.\d{3})+|\d+))(?:,(\d+))?\s*kWh\s*$/i;

/**
 * Verbrauch je Kalenderjahr aus den Intervallen der Verbrauchstabelle. Liegt ein
 * Intervall in zwei Jahren, wird es nach Tagen aufgeteilt. Gibt null zurueck, wenn
 * nichts gefunden wurde oder die Summe nicht zur Gesamtmenge passt (z. B. weil die
 * Tabelle zweimal auf der Rechnung steht).
 */
function detectVerbrauchProJahr(
  lines: string[],
  jahresKwh: number | null,
): Record<number, number> | null {
  const intervalle = new Map<string, { von: Date; bis: Date; kwh: number }>();
  for (const line of lines) {
    const m = VERBRAUCHS_INTERVALL_REGEX.exec(line.trim());
    if (!m) continue;
    const von = parseDate(m[1]!, m[2]!, m[3]!);
    const bis = parseDate(m[4]!, m[5]!, m[6]!);
    if (!von || !bis || bis < von) continue;
    const kwh = Math.round(parseDeutscheZahl(m[7]!, m[8]));
    if (!Number.isFinite(kwh) || kwh <= 0) continue;
    intervalle.set(`${von.toISOString()}|${bis.toISOString()}`, { von, bis, kwh });
  }
  if (intervalle.size === 0) return null;

  const proJahr: Record<number, number> = {};
  let summe = 0;
  for (const { von, bis, kwh } of intervalle.values()) {
    const tage = Math.round((bis.getTime() - von.getTime()) / TAG_MS) + 1;
    let rest = kwh;
    for (let jahr = von.getUTCFullYear(); jahr <= bis.getUTCFullYear(); jahr++) {
      const start = Math.max(von.getTime(), Date.UTC(jahr, 0, 1));
      const ende = Math.min(bis.getTime(), Date.UTC(jahr, 11, 31));
      const tageImJahr = Math.round((ende - start) / TAG_MS) + 1;
      // Letztes Jahr bekommt den Rest, damit die Summe exakt bleibt
      const anteil =
        jahr === bis.getUTCFullYear() ? rest : Math.round((kwh * tageImJahr) / tage);
      proJahr[jahr] = (proJahr[jahr] ?? 0) + anteil;
      rest -= anteil;
    }
    summe += kwh;
  }

  // Muss zur erkannten Gesamtmenge passen (1 % Toleranz), sonst nicht verwenden
  if (jahresKwh === null || Math.abs(summe - jahresKwh) > jahresKwh * 0.01) return null;
  return proJahr;
}

function detectPeriod(lines: string[]): {
  periodStart: Date | null;
  periodEnd: Date | null;
} {
  // Suche nach Datums-Paaren in derselben Zeile.
  for (const line of lines) {
    const matches = [...line.matchAll(DATE_REGEX)];
    if (matches.length >= 2) {
      const first = matches[0]!;
      const second = matches[1]!;
      const start = parseDate(first[1]!, first[2]!, first[3]!);
      const end = parseDate(second[1]!, second[2]!, second[3]!);
      if (start && end && end >= start) {
        return { periodStart: start, periodEnd: end };
      }
    }
  }
  return { periodStart: null, periodEnd: null };
}

/**
 * Posten in der Aufstellung "Die Nettobetraege beinhalten": "Stromsteuer 585,29" –
 * Betrag ohne Euro-Zeichen am Zeilenende. Ein Satz wie "Stromsteuer 20,50 €/MWh"
 * oder "2,05 ct/kWh" passt bewusst nicht (nach dem Betrag darf nur noch €/EUR folgen).
 */
const STROMSTEUER_POSTEN_REGEX =
  /^\s*stromsteuer\s*:?\s*(\d{1,3}(?:\.\d{3})*),(\d{2})\s*(?:€|EUR)?\s*$/i;

function detectStromsteuer(lines: string[]): number | null {
  for (const line of lines) {
    const posten = STROMSTEUER_POSTEN_REGEX.exec(line);
    if (posten) return parseDeutscheZahl(posten[1]!, posten[2]);
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!/stromsteuer/i.test(line)) continue;
    // Betrag kann in derselben Zeile stehen oder in den naechsten 1-2 Zeilen.
    const candidates = [line, lines[i + 1] ?? "", lines[i + 2] ?? ""];
    for (const candidate of candidates) {
      const match = EURO_REGEX.exec(candidate);
      if (match) {
        return parseDeutscheZahl(match[1]!, match[2]);
      }
    }
  }
  return null;
}

/** Eine Adresse hat eine 5-stellige PLZ (Lieferstellen stehen immer mit PLZ auf der Rechnung). */
function sieht_aus_wie_adresse(text: string): boolean {
  return /(?<!\d)\d{5}(?!\d)/.test(text);
}

/**
 * Umgekehrte Reihenfolge, wie sie bei tabellarischen Kopfbloecken vorkommt: erst der Wert,
 * dann (per Tab getrennt) das Label – "Gewerbepark Markfeld 2d, 83043 Bad Aibling<TAB>Lieferstelle:".
 */
const ADRESSE_WERT_VOR_LABEL_REGEX =
  /^(.+?)\s*(?:Liefer(?:stelle|adresse)|Verbrauchs(?:stelle|adresse)|Standort)\s*:?\s*$/i;

function detectAdresse(lines: string[]): string | null {
  for (const line of lines) {
    const rueckwaerts = ADRESSE_WERT_VOR_LABEL_REGEX.exec(line);
    const wert = rueckwaerts?.[1]?.trim();
    if (wert && sieht_aus_wie_adresse(wert)) return wert;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (ADRESSE_LABEL_REGEX.test(line)) {
      // Inline-Form: "Lieferstelle: Industriestr. 27, 54321 Beispielstadt"
      const inline = line.replace(ADRESSE_LABEL_REGEX, "").trim();
      if (inline.length >= 5) return inline;
      // Sonst: naechste 1-2 Zeilen als Adresse nehmen.
      const next = lines[i + 1]?.trim();
      const overnext = lines[i + 2]?.trim();
      if (next && overnext && /^\d{5}/.test(overnext)) {
        return `${next}, ${overnext}`;
      }
      // Eine Ueberschrift "Lieferstelle" in den Erlaeuterungen ist von Fliesstext
      // gefolgt ("Die Lieferstelle gibt Auskunft ...") – das ist keine Adresse.
      if (next && sieht_aus_wie_adresse(next)) return next;
    }
  }
  return null;
}

/** "Marktlokations-ID 50333282263": die ID direkt hinter dem Label. */
const MALO_NACH_LABEL_REGEX =
  /marktlokations?[-\s]*(?:id|nummer)?\s*:?\s*(?<![\dA-Za-z])(\d{11})(?!\d)/i;

function detectZaehlpunkt(lines: string[]): string | null {
  // Zuerst die ID, die unmittelbar hinter "Marktlokations-ID" steht. Auf derselben Zeile
  // steht oft auch die Messlokations-ID ("DE00106883043S000...") – deren 11 Ziffern nach
  // "DE" sind NICHT die Marktlokation und wurden frueher faelschlich uebernommen.
  for (const line of lines) {
    const direkt = MALO_NACH_LABEL_REGEX.exec(line.replace(/\s+/g, " "));
    if (direkt) return direkt[1]!;
  }
  for (let i = 0; i < lines.length; i++) {
    if (!MALO_LABEL_REGEX.test(lines[i]!)) continue;
    for (const candidate of [lines[i]!, lines[i + 1] ?? ""]) {
      const match = MALO_ID_REGEX.exec(candidate.replace(/\s+/g, " "));
      if (match) return match[1]!;
    }
  }
  // OCR setzt in die 33 Zeichen gern Leerzeichen.
  for (const line of lines) {
    const match = ZAEHLPUNKT_REGEX.exec(line.replace(/\s+/g, "").toUpperCase());
    if (match) return match[0];
  }
  return null;
}

export function parseStromrechnung(
  response: TextractResponseShape,
): ParsedBeleg {
  const lines = extractLines(response);

  const versorger = detectVersorger(lines);
  const jahresKwh = detectJahresKwh(lines);
  const { periodStart, periodEnd } = detectPeriod(lines);
  const adresse = detectAdresse(lines);
  const stromsteuerGezahlt = detectStromsteuer(lines);
  const zaehlpunkt = detectZaehlpunkt(lines);
  const verbrauchProJahr = detectVerbrauchProJahr(lines, jahresKwh);

  // Confidence-Score: wie viele der vier Schluessel-Felder konnten extrahiert werden?
  const totalFields = 4;
  let detectedFields = 0;
  if (versorger) detectedFields++;
  if (jahresKwh !== null) detectedFields++;
  if (periodStart && periodEnd) detectedFields++;
  if (adresse) detectedFields++;
  const confidence = detectedFields / totalFields;

  return {
    versorger,
    periodStart,
    periodEnd,
    jahresKwh,
    adresse,
    stromsteuerGezahlt,
    zaehlpunkt,
    verbrauchProJahr,
    confidence,
    rawLines: lines,
  };
}

/** Schwelle, ab der wir die OCR-Werte ohne explizite Bestaetigung uebernehmen. */
export const OCR_CONFIDENCE_THRESHOLD = 0.7;

export function istOcrVertrauenswuerdig(result: ParsedBeleg): boolean {
  return result.confidence >= OCR_CONFIDENCE_THRESHOLD;
}
