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

export function formatMwh(value: number): string {
  return `${kwhFormatter.format(value)} MWh`;
}

/**
 * Erstattung, die beim Kunden ankommt: Entlastung minus Selbstbehalt.
 * Gegen diesen Betrag vergleicht der Kunde unseren Festpreis (docs/10).
 */
export function erstattungNachSelbstbehalt(result: {
  bruttoErstattung: number;
  sockel: number;
}): number {
  return Math.max(
    0,
    Math.round((result.bruttoErstattung - result.sockel) * 100) / 100,
  );
}
