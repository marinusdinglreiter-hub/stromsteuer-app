/**
 * Anleitung fuer den Portal-Zugang (docs/20-vollmachts-onboarding.md, Abschnitt
 * "Was im Zoll-Portal passiert"): fuenf Schritte beim Kunden. Jeder Schritt hat
 * einen Satz, was zu tun ist, einen Direktlink und eine Zeitschaetzung.
 *
 * Screenshots: In `screenshot` steht der Pfad unter /public, sobald es ein Bild
 * des echten Portal-Bildschirms gibt. Ohne Bild zeigt die Seite einen
 * gekennzeichneten Platzhalter. Die Bilder muessen aus einem echten Portal-
 * Zugang stammen und koennen nicht erfunden werden (offen, siehe TODO 2.4).
 */

export const ZOLL_PORTAL_URL = "https://www.zoll-portal.de";

/** Wortlaut der Dienstleistung, der im Portal exakt so gewaehlt werden muss. */
export const DIENSTLEISTUNG = "Sonstige steuerliche Anträge";

export type PortalSchritt = {
  nr: 1 | 2 | 3 | 4 | 5;
  titel: string;
  text: string;
  /** Direktlink an die richtige Stelle, falls es eine gibt */
  link?: { href: string; label: string };
  minuten: number;
  /** Pfad unter /public, z. B. "/portal/schritt-1.png" */
  screenshot?: string;
  /** Wird besonders hervorgehoben (Schritt 5: Wortlaut der Dienstleistung) */
  hervorheben?: string;
};

export const PORTAL_SCHRITTE: PortalSchritt[] = [
  {
    nr: 1,
    titel: "Im Zoll-Portal anmelden",
    text: "Login über ELSTER: Zertifikatsdatei auswählen und Passwort eingeben.",
    link: { href: ZOLL_PORTAL_URL, label: "zoll-portal.de öffnen" },
    minuten: 3,
  },
  {
    nr: 2,
    titel: "Unternehmensdaten prüfen",
    text: "Die vorausgefüllten Unternehmensdaten kontrollieren und fehlende Angaben ergänzen.",
    minuten: 4,
  },
  {
    nr: 3,
    titel: "Hauptbenutzer festlegen",
    text: "Eine Person als Hauptbenutzer des Unternehmens eintragen.",
    minuten: 2,
  },
  {
    nr: 4,
    titel: "Neue Vollmacht einrichten",
    text: "Unter Übersicht → Vollmachten „Neue Vollmacht einrichten“ wählen und dabei die digitale Bescheidbereitstellung aktivieren.",
    minuten: 3,
  },
  {
    nr: 5,
    titel: "Dienstleistung wählen und Zugangscode erzeugen",
    text: "„Ich möchte vertreten werden“ wählen, die Dienstleistung festlegen und den Zugangscode erzeugen. Code und Beteiligten-Nummer tragen Sie unten ein.",
    minuten: 3,
    hervorheben: DIENSTLEISTUNG,
  },
];

/** Gesamtdauer der Anleitung, wenn das Zertifikat im Haus ist. */
export const GESAMT_MINUTEN = PORTAL_SCHRITTE.reduce((s, x) => s + x.minuten, 0);
