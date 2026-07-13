import { renderEmail } from "./layout";

type Brand = {
  name: string;
  shortName: string;
};

function eur(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export type AntragBestaetigtInput = {
  brand: Brand;
  firmenname: string;
  antragsjahr: number;
  bruttoErstattung: number;
  honorar: number;
  nettoAuszahlung: number;
  statusUrl: string;
  kanzleiName: string;
};

export function renderAntragBestaetigt(input: AntragBestaetigtInput) {
  const body = `
    <p>vielen Dank — Ihr Antrag auf Stromsteuer-Erstattung nach § 9b StromStG für das Verbrauchsjahr <strong>${input.antragsjahr}</strong> ist bei uns eingegangen.</p>
    <p>Wir haben Ihre Unterlagen an unsere Partnerkanzlei <strong>${input.kanzleiName}</strong> übergeben. Die Kanzlei prüft Ihren Antrag, reicht ihn beim zuständigen Hauptzollamt ein und begleitet das Verfahren bis zur Auszahlung.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;border:1px solid #e2e8f0;border-radius:8px;">
      <tr><td style="padding:10px 14px;color:#64748b;font-size:12px;">Antragsteller</td><td style="padding:10px 14px;font-size:13px;text-align:right;">${input.firmenname}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:12px;border-top:1px solid #f1f5f9;">Brutto-Erstattungsanspruch</td><td style="padding:10px 14px;font-size:13px;text-align:right;border-top:1px solid #f1f5f9;">${eur(input.bruttoErstattung)}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:12px;border-top:1px solid #f1f5f9;">Erfolgshonorar (nur bei Erfolg)</td><td style="padding:10px 14px;font-size:13px;text-align:right;border-top:1px solid #f1f5f9;">-${eur(input.honorar)}</td></tr>
      <tr><td style="padding:10px 14px;color:#0f172a;font-size:13px;font-weight:600;border-top:1px solid #e2e8f0;">Voraussichtliche Auszahlung</td><td style="padding:10px 14px;font-size:15px;font-weight:700;text-align:right;color:#1d4ed8;border-top:1px solid #e2e8f0;">${eur(input.nettoAuszahlung)}</td></tr>
    </table>
    <p>Im Status-Portal können Sie jederzeit nachschauen, wie weit Ihr Antrag fortgeschritten ist:</p>
  `;

  return renderEmail({
    title: "Ihr Antrag ist eingegangen",
    preheader: `Antragsnummer eingetragen — Auszahlung ${eur(input.nettoAuszahlung)} voraussichtlich.`,
    bodyHtml: body,
    cta: { href: input.statusUrl, label: "Status meines Antrags ansehen" },
    footerNote:
      "Sie haben den Antrag bei uns erfolgsbasiert beauftragt — bei Ablehnung fallen keine Kosten an. Bei Rueckfragen einfach auf diese Mail antworten.",
    brandName: input.brand.name,
    brandShortName: input.brand.shortName,
  });
}

export type NeuerAntragKanzleiInput = {
  brand: Brand;
  applicationId: string;
  firmenname: string;
  geschaeftsfuehrer: string;
  antragsjahr: number;
  bruttoErstattung: number;
  honorar: number;
  nettoAuszahlung: number;
  needs1456: boolean;
  paketDownloadUrl: string;
  kundenEmail: string;
};

export function renderNeuerAntragKanzlei(input: NeuerAntragKanzleiInput) {
  const body = `
    <p>ein neuer Mandant hat den § 9b-Antrag unterzeichnet und alle Unterlagen vollständig hochgeladen.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;border:1px solid #e2e8f0;border-radius:8px;">
      <tr><td style="padding:10px 14px;color:#64748b;font-size:12px;">Mandant</td><td style="padding:10px 14px;font-size:13px;text-align:right;">${input.firmenname}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:12px;border-top:1px solid #f1f5f9;">Vertreten durch</td><td style="padding:10px 14px;font-size:13px;text-align:right;border-top:1px solid #f1f5f9;">${input.geschaeftsfuehrer}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:12px;border-top:1px solid #f1f5f9;">Verbrauchsjahr</td><td style="padding:10px 14px;font-size:13px;text-align:right;border-top:1px solid #f1f5f9;">${input.antragsjahr}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:12px;border-top:1px solid #f1f5f9;">Brutto / Honorar / Auszahlung</td><td style="padding:10px 14px;font-size:13px;text-align:right;border-top:1px solid #f1f5f9;">${eur(input.bruttoErstattung)} / ${eur(input.honorar)} / ${eur(input.nettoAuszahlung)}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:12px;border-top:1px solid #f1f5f9;">Formular 1456 erforderlich</td><td style="padding:10px 14px;font-size:13px;text-align:right;border-top:1px solid #f1f5f9;">${input.needs1456 ? "Ja" : "Nein"}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:12px;border-top:1px solid #f1f5f9;">Mandanten-Mail</td><td style="padding:10px 14px;font-size:13px;text-align:right;border-top:1px solid #f1f5f9;">${input.kundenEmail}</td></tr>
      <tr><td style="padding:10px 14px;color:#64748b;font-size:12px;border-top:1px solid #f1f5f9;">Vorgang</td><td style="padding:10px 14px;font-family:monospace;font-size:12px;text-align:right;border-top:1px solid #f1f5f9;">${input.applicationId}</td></tr>
    </table>
    <p>Das vollständige Antrags-Paket (Belege, Excel-Übersicht, signiertes Mandat-PDF, Triage-Antworten) liegt zum Download bereit — der Link ist 15 Minuten gültig, der Inhalt bleibt im Storage:</p>
  `;

  return renderEmail({
    title: `Neuer § 9b-Mandant: ${input.firmenname}`,
    preheader: `${input.firmenname} · ${eur(input.bruttoErstattung)} brutto · ${input.needs1456 ? "1456 erforderlich" : "kein 1456"}`,
    bodyHtml: body,
    cta: { href: input.paketDownloadUrl, label: "Antrags-Paket herunterladen" },
    footerNote:
      "Bitte den Status im Backoffice nach Eingang im Zoll-Portal aktualisieren — der Mandant bekommt automatisch eine Status-Mail.",
    brandName: input.brand.name,
    brandShortName: input.brand.shortName,
  });
}
