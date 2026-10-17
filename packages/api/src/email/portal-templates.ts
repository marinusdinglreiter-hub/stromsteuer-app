/**
 * Mails des Portal-Onboardings (TODO 2.1). Wortlaut nach
 * docs/20-vollmachts-onboarding.md, Abschnitt "Textvorlagen". Tag 14 hat dort
 * keine Vorlage und ist hier sinngemaess ergaenzt.
 *
 * Tonfall: nuechtern, keine Schuldzuweisung, ein konkreter naechster Schritt.
 */
import type { ErinnerungsStufe } from "@stromsteuer/antrag";

import { renderEmail } from "./layout";

type Brand = { name: string; shortName: string };

export type PortalMailInput = {
  brand: Brand;
  /** Anrede-Name, z. B. "Erika Muster"; leer = "Guten Tag," */
  ansprechpartner: string | null;
  kanzleiName: string;
  antragsjahr: number;
  /** Erstattung nach Selbstbehalt in EUR */
  erstattung: number | null;
  /** Link auf die Status-Seite mit der Anleitung */
  statusUrl: string;
  /** Buchungslink fuer den gefuehrten Termin (z. B. Cal.com) */
  terminUrl: string | null;
  /** Ausschlussfrist, vorformatiert (TT.MM.JJJJ) */
  fristDatum: string;
  /** Datum, bis die Vollmacht spaetestens vorliegen muss, vorformatiert */
  vollmachtBisDatum: string;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function eur(v: number): string {
  return v.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function anrede(name: string | null): string {
  return name && name.trim() ? `Guten Tag ${esc(name.trim())},` : "Guten Tag,";
}

export type PortalMail = { subject: string; html: string; text: string };

function fertig(
  input: PortalMailInput,
  subject: string,
  preheader: string,
  absaetze: string[],
  cta: { href: string; label: string },
): PortalMail {
  const { html, text } = renderEmail({
    title: subject,
    preheader,
    bodyHtml: [`<p>${anrede(input.ansprechpartner)}</p>`, ...absaetze.map((a) => `<p>${a}</p>`)].join("\n"),
    cta,
    brandName: input.brand.name,
    brandShortName: input.brand.shortName,
  });
  return { subject, html, text };
}

export function renderPortalErinnerung(stufe: ErinnerungsStufe, input: PortalMailInput): PortalMail {
  const betrag = input.erstattung !== null ? eur(input.erstattung) : "Ihre Erstattung";
  const kanzlei = esc(input.kanzleiName);

  switch (stufe) {
    case 1:
      return fertig(
        input,
        "Nur noch der Portal-Zugang fehlt",
        "Ihre Rechnungen liegen bei uns, es fehlt nur die Vollmacht im Zoll-Portal.",
        [
          `Ihre Stromrechnungen liegen bei uns, die Berechnung steht: ${betrag} für ${input.antragsjahr}. Was noch fehlt, ist die Vollmacht im Zoll-Portal. Ohne sie darf ${kanzlei} den Antrag nicht stellen.`,
          "Wenn das Zertifikat im Haus ist, sind es etwa 20 Minuten. Wenn irgendwo etwas klemmt, antworten Sie einfach auf diese Mail.",
        ],
        { href: input.statusUrl, label: "Anleitung mit Schritten ansehen" },
      );
    case 2:
      return fertig(
        input,
        "Sollen wir den Portal-Zugang gemeinsam einrichten?",
        "15 Minuten Telefon mit Bildschirmfreigabe, danach ist die Vollmacht erteilt.",
        [
          "der Zugang zum Zoll-Portal steht noch aus. Das ist kein Vorwurf: Das Portal ist an zwei Stellen unübersichtlich, und wir kennen beide.",
          input.terminUrl
            ? "Angebot: 15 Minuten Telefon mit Bildschirmfreigabe, danach ist die Vollmacht erteilt. Den Termin können Sie über den Button wählen."
            : "Angebot: 15 Minuten Telefon mit Bildschirmfreigabe, danach ist die Vollmacht erteilt. Antworten Sie auf diese Mail mit einem Wunschtermin.",
          "Wenn Ihnen das Zertifikat fehlt oder es beim Steuerberater liegt, sagen Sie es uns. Dafür haben wir ein Anschreiben, das Sie weiterleiten können.",
        ],
        input.terminUrl
          ? { href: input.terminUrl, label: "Termin wählen" }
          : { href: input.statusUrl, label: "Zur Anleitung" },
      );
    case 3:
      return fertig(
        input,
        `Frist 31. Dezember: Zugang bis ${input.vollmachtBisDatum} nötig`,
        `Der Antrag muss bis ${input.fristDatum} beim Hauptzollamt sein.`,
        [
          `der Antrag für das Verbrauchsjahr ${input.antragsjahr} muss bis zum ${input.fristDatum} beim Hauptzollamt sein. Das ist eine Ausschlussfrist, danach verfällt der Anspruch auf ${betrag}.`,
          `Damit die Prüfung und die Einreichung durch ${kanzlei} hineinpassen, brauchen wir Ihre Vollmacht bis zum ${input.vollmachtBisDatum}. Fehlt Ihnen das ELSTER-Zertifikat, sollten Sie es jetzt beantragen; der Aktivierungscode kommt per Post.`,
          "Wir rufen Sie in den nächsten Tagen an. Falls Sie es vorher erledigen wollen, finden Sie die Anleitung unter dem Button.",
        ],
        { href: input.statusUrl, label: "Zur Anleitung" },
      );
    case 4:
      return fertig(
        input,
        "Wir halten Ihnen einen Termin frei",
        "Gemeinsam ist der Portal-Zugang in 15 Minuten erledigt.",
        [
          `der Portal-Zugang fehlt noch, und bis zur Ausschlussfrist am ${input.fristDatum} bleibt weniger Zeit, als man denkt. Die Vollmacht muss spätestens am ${input.vollmachtBisDatum} vorliegen, sonst ist die Einreichung durch ${kanzlei} nicht mehr sicher.`,
          input.terminUrl
            ? "Wir halten Ihnen einen Termin frei und richten den Zugang gemeinsam mit Ihnen ein, 15 Minuten genügen. Bitte wählen Sie ein Zeitfenster."
            : "Wir richten den Zugang gerne gemeinsam mit Ihnen ein, 15 Minuten genügen. Antworten Sie auf diese Mail mit zwei Wunschterminen.",
        ],
        input.terminUrl
          ? { href: input.terminUrl, label: "Zeitfenster wählen" }
          : { href: input.statusUrl, label: "Zur Anleitung" },
      );
  }
}

/** Nach dem Einloesen und der Pruefung durch die Kanzlei. */
export function renderVollmachtAktiv(input: PortalMailInput): PortalMail {
  const kanzlei = esc(input.kanzleiName);
  return fertig(
    input,
    "Vollmacht ist aktiv",
    "Im Portal müssen Sie nichts weiter tun.",
    [
      "wir haben den Zugangscode eingelöst, die Vollmacht ist aktiv und auf die richtige Dienstleistung ausgestellt. Im Portal müssen Sie nichts weiter tun.",
      `Ein Hinweis dazu: Bescheide des Hauptzollamts gehen ab jetzt in das Portal-Profil von ${kanzlei}, nicht in Ihres. Wir leiten sie Ihnen weiter, sobald sie eingehen.`,
      `Wie es weitergeht: ${kanzlei} reicht den Antrag bis ${input.vollmachtBisDatum} ein, danach entscheidet das Hauptzollamt. Den Stand sehen Sie jederzeit unter dem Button.`,
    ],
    { href: input.statusUrl, label: "Status ansehen" },
  );
}

/**
 * Anschreiben an den Steuerberater, das der Kunde weiterleitet (Zertifikat
 * liegt beim Steuerberater). Reiner Text, wird auf der Status-Seite
 * angezeigt und zum Kopieren angeboten.
 */
export function steuerberaterAnschreiben(opts: { kanzleiName: string; antragsjahr: number }): {
  betreff: string;
  text: string;
} {
  return {
    betreff: "Zoll-Portal — Vollmacht für die Stromsteuer-Entlastung",
    text: `Guten Tag,

wir beantragen für ${opts.antragsjahr} die Entlastung von der Stromsteuer nach § 9b StromStG. Der Antrag läuft seit 2025 nur noch über das Zoll-Portal, und die Einreichung übernimmt ${opts.kanzleiName} für uns. Dafür müssen wir dort eine Vollmacht erteilen.

Die Anmeldung im Portal setzt ein ELSTER-Zertifikat unseres Unternehmens voraus. Haben wir eines, und verwalten Sie es?

Wenn ja, wären das diese Schritte, zusammen etwa zehn Minuten:

1. Login auf zoll-portal.de mit dem ELSTER-Zertifikat
2. Unternehmensdaten prüfen, Hauptbenutzer festlegen
3. Vollmachten, dann „Neue Vollmacht einrichten“
4. Digitale Bescheidbereitstellung aktivieren
5. „Ich möchte vertreten werden“, Dienstleistung „Sonstige steuerliche Anträge“
6. Zugangscode erzeugen und mir zusammen mit unserer Beteiligten-Nummer schicken

Falls wir kein Zertifikat haben, sagen Sie mir bitte kurz Bescheid. Dann beantragen wir eines selbst; das dauert wegen des Aktivierungscodes per Post ein bis zwei Wochen.

Viele Grüße`,
  };
}
