/**
 * Zentrale, einzige Quelle der juristischen Vollmacht-/Mandatstexte.
 *
 * !! Die Texte sind weiterhin PLATZHALTER und muessen vor Live-Schaltung durch
 * !! die finalen Templates der Partnerkanzlei ersetzt werden. Bei jeder inhaltlichen
 * !! Aenderung MUSS `CONSENT_VERSION` erhoeht werden — nur so bleibt nachweisbar,
 * !! welchem Wortlaut ein Mandant zugestimmt hat.
 *
 * Dieses Modul ist bewusst frei von Server-Abhaengigkeiten (kein node:*-Import),
 * damit es auch von der Web-App importiert werden kann, ohne Server-Code ins
 * Client-Bundle zu ziehen. Das Hashen der Texte passiert server-seitig in
 * `crypto.ts` / `signMandat`.
 */

/**
 * Version des zustimmungspflichtigen Wortlauts. Bei jeder Textaenderung erhoehen
 * (Datum im ISO-Format). Wird pro Signatur auf der Application gespeichert.
 */
export const CONSENT_VERSION = "2026-07-14";

/**
 * Kanonische Klauseln. Platzhalter im `{{token}}`-Format werden erst zur
 * Laufzeit ersetzt (siehe `renderClause`). Der Hash der Einwilligung
 * (`canonicalConsentText`) nutzt die Klauseln MIT Platzhaltern, ist also
 * unabhaengig von den instanzbezogenen Daten und damit versions-stabil.
 */
export const CLAUSES = {
  mandatsgegenstand:
    "Die Mandatsnehmerin wird vom Mandanten beauftragt, die Stromsteuer-Entlastung " +
    "nach § 9b StromStG fuer das Verbrauchsjahr {{antragsjahr}} beim zustaendigen " +
    "Hauptzollamt zu beantragen und das Antragsverfahren bis zur Bekanntgabe des " +
    "Bescheids zu betreuen. Die Mandatsnehmerin handelt ausschliesslich im Rahmen der " +
    "hier erteilten Vollmacht. Die Datenaufbereitung erfolgt auf Grundlage der vom " +
    "Mandanten zur Verfuegung gestellten Stromrechnungen und Erklaerungen.",
  pflichtenDesMandanten:
    "Der Mandant verpflichtet sich, alle fuer die Antragstellung erforderlichen Belege " +
    "(insbesondere Jahres- oder Schlussrechnungen des Stromversorgers) vollstaendig und " +
    "wahrheitsgemaess zu uebermitteln sowie etwaige Rueckfragen der Mandatsnehmerin oder " +
    "des Hauptzollamts zeitnah zu beantworten.",
  verschwiegenheit:
    "Die Mandatsnehmerin unterliegt der anwaltlichen Schweigepflicht (§ 43a Abs. 2 BRAO). " +
    "Daten werden EU-konform verarbeitet (DSGVO). Eine Auftragsverarbeitungs-Vereinbarung " +
    "mit dem technischen Dienstleister besteht. Details siehe Datenschutzerklaerung.",
  vollmachtGegenstand:
    "Beantragung der Stromsteuer-Entlastung nach § 9b StromStG fuer das Verbrauchsjahr " +
    "{{antragsjahr}}, einschliesslich aller damit verbundenen Erklaerungen (insb. " +
    "Formular 1139, ggf. Formular 1456), gegenueber dem zustaendigen Hauptzollamt.",
  vollmachtUmfang:
    "Die Vollmacht umfasst Empfangsbevollmaechtigung fuer Bescheide und Schriftverkehr. " +
    "Sie erlischt mit Bekanntgabe des Bescheids bzw. Abschluss eines etwaigen " +
    "Rechtsbehelfsverfahrens.",
  erfolgshonorar:
    "Die Parteien vereinbaren ein Erfolgshonorar gemaess § 4a Abs. 1 RVG. Das Honorar " +
    "ist ausschliesslich im Erfolgsfall — also bei Auszahlung der Stromsteuer-Entlastung " +
    "durch das Hauptzollamt — geschuldet.",
} as const;

export type ClauseKey = keyof typeof CLAUSES;

/** Ersetzt Laufzeit-Platzhalter in einer Klausel. */
export function renderClause(
  clause: string,
  params: { antragsjahr: number },
): string {
  return clause.replace(/\{\{antragsjahr\}\}/g, String(params.antragsjahr));
}

/**
 * Versions-stabiler kanonischer Einwilligungstext (Platzhalter NICHT ersetzt).
 * Grundlage fuer `consentTextSha256` — ein Fingerprint des Wortlauts, unabhaengig
 * von den instanzbezogenen Daten eines einzelnen Antrags.
 */
export function canonicalConsentText(): string {
  return [
    `CONSENT_VERSION: ${CONSENT_VERSION}`,
    CLAUSES.mandatsgegenstand,
    CLAUSES.pflichtenDesMandanten,
    CLAUSES.verschwiegenheit,
    CLAUSES.vollmachtGegenstand,
    CLAUSES.vollmachtUmfang,
    CLAUSES.erfolgshonorar,
  ].join("\n\n");
}
