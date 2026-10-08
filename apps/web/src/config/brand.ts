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
  // Echte Nummer nur ueber die Umgebung (Vercel/.env), nicht im Repo.
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "[TELEFON]",
  email: "info@example.de",
  kanzlei: {
    name: "[KANZLEI]",
    anwalt: "[ANSPRECHPARTNER KANZLEI]",
    rolle: "Rechtsanwalt oder Steuerberater",
    kammer: "[KAMMER]",
  },
} as const;
