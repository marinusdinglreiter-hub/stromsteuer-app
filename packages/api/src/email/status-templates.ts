import { renderEmail } from "./layout";

type Brand = { name: string; shortName: string };

function eur(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export type StatusUpdateInput = {
  brand: Brand;
  firmenname: string;
  antragsjahr: number;
  statusUrl: string;
  /** Optionaler HZA-Bescheid-Betrag, fuer APPROVED/PAID. */
  hzaAmount?: number;
};

export function renderStatusSubmitted(input: StatusUpdateInput) {
  return renderEmail({
    title: "Antrag beim Hauptzollamt eingereicht",
    preheader: `Ihr § 9b-Antrag fuer ${input.antragsjahr} ist beim HZA.`,
    bodyHtml: `
      <p>guten Tag,</p>
      <p>Ihr Antrag auf Stromsteuer-Erstattung nach § 9b StromStG für das Verbrauchsjahr <strong>${input.antragsjahr}</strong> wurde soeben elektronisch beim zuständigen Hauptzollamt eingereicht.</p>
      <p>Erfahrungsgemäß dauert die Bearbeitung 4–8 Wochen. Wir melden uns, sobald der Bescheid vorliegt.</p>
      <p>Antragsteller: <strong>${input.firmenname}</strong></p>
    `,
    cta: { href: input.statusUrl, label: "Status ansehen" },
    brandName: input.brand.name,
    brandShortName: input.brand.shortName,
  });
}

export function renderStatusApproved(input: StatusUpdateInput) {
  return renderEmail({
    title: "Bescheid: Ihr Antrag wurde bewilligt",
    preheader: input.hzaAmount
      ? `Bewilligt: ${eur(input.hzaAmount)}.`
      : "Bewilligt — Auszahlung folgt.",
    bodyHtml: `
      <p>gute Nachricht,</p>
      <p>das Hauptzollamt hat Ihren Antrag auf Stromsteuer-Entlastung nach § 9b StromStG <strong>positiv beschieden</strong>.</p>
      ${
        input.hzaAmount
          ? `<p>Bewilligter Brutto-Betrag: <strong>${eur(input.hzaAmount)}</strong>. Nach Abzug des Erfolgshonorars (gemäß Vereinbarung) erfolgt die Auszahlung auf Ihr Firmenkonto.</p>`
          : "<p>Die Auszahlung wird zeitnah veranlasst.</p>"
      }
      <p>Antragsteller: <strong>${input.firmenname}</strong> · Verbrauchsjahr ${input.antragsjahr}</p>
    `,
    cta: { href: input.statusUrl, label: "Status & Bescheid ansehen" },
    brandName: input.brand.name,
    brandShortName: input.brand.shortName,
  });
}

export function renderStatusPaid(input: StatusUpdateInput) {
  return renderEmail({
    title: "Erstattung ausgezahlt",
    preheader: input.hzaAmount
      ? `Auszahlung erfolgt: ${eur(input.hzaAmount)}.`
      : "Auszahlung erfolgt.",
    bodyHtml: `
      <p>guten Tag,</p>
      <p>die Stromsteuer-Erstattung für das Verbrauchsjahr <strong>${input.antragsjahr}</strong> wurde auf Ihr Firmenkonto überwiesen.</p>
      ${input.hzaAmount ? `<p>Überwiesener Netto-Betrag: <strong>${eur(input.hzaAmount)}</strong>.</p>` : ""}
      <p>Vielen Dank, dass Sie uns vertraut haben. Im nächsten Verbrauchsjahr erinnern wir Sie automatisch — der Antrag muss jährlich neu gestellt werden.</p>
    `,
    cta: { href: input.statusUrl, label: "Vorgang ansehen" },
    brandName: input.brand.name,
    brandShortName: input.brand.shortName,
  });
}

export function renderStatusRejected(input: StatusUpdateInput) {
  return renderEmail({
    title: "Antrag abgelehnt — kein Honorar fällig",
    preheader: "Bescheid erhalten — keine Kosten fuer Sie.",
    bodyHtml: `
      <p>guten Tag,</p>
      <p>leider hat das Hauptzollamt Ihren Antrag auf Stromsteuer-Entlastung nach § 9b StromStG <strong>abgelehnt</strong>.</p>
      <p>Gemäß unserer Erfolgshonorar-Vereinbarung entstehen Ihnen <strong>keinerlei Kosten</strong> — Sie zahlen 0 €. Die Partnerkanzlei meldet sich kurzfristig mit den Bescheid-Details und prüft, ob ein Einspruch sinnvoll ist.</p>
      <p>Antragsteller: <strong>${input.firmenname}</strong> · Verbrauchsjahr ${input.antragsjahr}</p>
    `,
    cta: { href: input.statusUrl, label: "Status ansehen" },
    brandName: input.brand.name,
    brandShortName: input.brand.shortName,
  });
}
