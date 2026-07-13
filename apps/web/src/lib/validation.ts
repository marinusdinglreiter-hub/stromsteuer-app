/** Pragmatische Client-Validierung. Der Server validiert via Zod erneut. */

// Verlangt: lokaler Teil ohne Whitespace, @, Domain mit Punkt und TLD >= 2.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** 5-stellige deutsche Postleitzahl. */
export function isValidPlz(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}
