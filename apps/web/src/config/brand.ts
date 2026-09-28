/**
 * Brand-Config — zentrale Stelle fuer Name, Telefon, Kanzlei.
 * Aendern, sobald der Markenname endgueltig steht.
 *
 * Die Partnerkanzlei ist noch nicht ausgewaehlt (TODO 0.4). Bis dahin stehen
 * ueberall Platzhalter; sie landen auch in Mandat-PDF und Kanzlei-Paket.
 */
export const BRAND = {
  name: "Stromsteuer-Erstattung",
  shortName: "Stromsteuer",
  phone: "[TELEFON]",
  email: "info@example.de",
  kanzlei: {
    name: "[KANZLEI]",
    anwalt: "[ANSPRECHPARTNER KANZLEI]",
    rolle: "Rechtsanwalt oder Steuerberater",
    kammer: "[KAMMER]",
  },
} as const;
