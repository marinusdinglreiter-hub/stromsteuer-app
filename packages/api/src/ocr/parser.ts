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

/** Euro-Betrag im deutschen Format: z. B. "995,48 €" oder "1.234,56€" */
const EURO_REGEX = /(\d{1,3}(?:\.\d{3})*),(\d{2})\s*€/;

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

function detectVersorger(lines: string[]): string | null {
  // Top-of-page Brand-Match: schaut auf die ersten ~10 Zeilen, dann Fallback
  // auf gesamte Rechnung.
  const search = (zeilen: string[]) =>
    TOP_VERSORGER.find((brand) =>
      zeilen.some((line) => line.toLowerCase().includes(brand.toLowerCase())),
    );
  return search(lines.slice(0, 10)) ?? search(lines) ?? null;
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

function detectStromsteuer(lines: string[]): number | null {
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

function detectAdresse(lines: string[]): string | null {
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
      if (next) return next;
    }
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
    confidence,
    rawLines: lines,
  };
}

/** Schwelle, ab der wir die OCR-Werte ohne explizite Bestaetigung uebernehmen. */
export const OCR_CONFIDENCE_THRESHOLD = 0.7;

export function istOcrVertrauenswuerdig(result: ParsedBeleg): boolean {
  return result.confidence >= OCR_CONFIDENCE_THRESHOLD;
}
