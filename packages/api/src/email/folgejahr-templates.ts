/**
 * Januar-Erinnerung an Bestandskunden (TODO 2.3): Der Antrag fuer das neue
 * Verbrauchsjahr geht aus dem Vorjahr heraus in wenigen Minuten, weil
 * Stammdaten, Lieferstellen und Portal-Vollmacht stehen bleiben.
 */
import { renderEmail } from "./layout";

export type FolgejahrMailInput = {
  brand: { name: string; shortName: string };
  ansprechpartner: string | null;
  kanzleiName: string;
  /** Verbrauchsjahr, fuer das der Antrag jetzt moeglich ist */
  jahr: number;
  /** Link auf die Status-Seite des Vorjahres-Antrags (dort steht der Start-Knopf) */
  statusUrl: string;
  /** Ausschlussfrist, vorformatiert (TT.MM.JJJJ) */
  fristDatum: string;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderFolgejahrErinnerung(input: FolgejahrMailInput): { subject: string; html: string; text: string } {
  const subject = `Stromsteuer-Entlastung ${input.jahr}: Antrag jetzt vorbereiten`;
  const anrede = input.ansprechpartner?.trim() ? `Guten Tag ${esc(input.ansprechpartner.trim())},` : "Guten Tag,";
  const { html, text } = renderEmail({
    title: subject,
    preheader: `Das Verbrauchsjahr ${input.jahr} ist abgeschlossen. Ihre Stammdaten und die Vollmacht bleiben bestehen.`,
    bodyHtml: [
      `<p>${anrede}</p>`,
      `<p>das Verbrauchsjahr ${input.jahr} ist abgeschlossen. Damit können Sie die Entlastung von der Stromsteuer nach § 9b StromStG für ${input.jahr} beantragen, wie im Vorjahr.</p>`,
      `<p>Sie müssen nicht von vorn beginnen: Ihre Firmendaten, Ihre Lieferstellen und die Vollmacht im Zoll-Portal übernehmen wir. Neu sind nur die Stromrechnungen für ${input.jahr} und die Erklärungen. Für Folgejahre gilt ein reduzierter Festpreis, den Sie vor der Unterschrift sehen.</p>`,
      `<p>Der Antrag muss bis zum ${input.fristDatum} beim Hauptzollamt sein. Das ist eine Ausschlussfrist; ${esc(input.kanzleiName)} braucht für die Einreichung etwas Vorlauf. Starten Sie am besten jetzt.</p>`,
    ].join("\n"),
    cta: { href: input.statusUrl, label: `Antrag für ${input.jahr} starten` },
    brandName: input.brand.name,
    brandShortName: input.brand.shortName,
  });
  return { subject, html, text };
}
