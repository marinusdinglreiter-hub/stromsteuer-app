/** Deutsche Locale-Formatierer fuer das gesamte Frontend. */

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const eurFormatterRund = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const kwhFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0,
});

export function formatEur(value: number): string {
  return eurFormatter.format(value);
}

export function formatEurRund(value: number): string {
  return eurFormatterRund.format(value);
}

export function formatKwh(value: number): string {
  return `${kwhFormatter.format(value)} kWh`;
}

/**
 * Marketing-Framing: wie viele Wochen "kostenloser Strom" entspricht die
 * Nettoerstattung (bei einem ueberschlaegigen Industriestrompreis von 0,18 €/kWh).
 * Faustformel — bewusst grob, dient nur dem Lead-Hook auf der Landing-Page.
 */
const INDUSTRIE_STROMPREIS_EUR_PRO_KWH = 0.18;
const WOCHEN_PRO_JAHR = 52;

export function wochenKostenloserStrom(
  bruttoKwh: number,
  nettoAuszahlungEur: number,
): number {
  if (bruttoKwh <= 0 || nettoAuszahlungEur <= 0) return 0;
  const kostenProWoche =
    (bruttoKwh * INDUSTRIE_STROMPREIS_EUR_PRO_KWH) / WOCHEN_PRO_JAHR;
  if (kostenProWoche <= 0) return 0;
  return Math.round(nettoAuszahlungEur / kostenProWoche);
}
