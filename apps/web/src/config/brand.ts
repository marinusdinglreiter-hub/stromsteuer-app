/**
 * Brand-Config — zentrale Stelle fuer Name, Telefon, Kanzlei.
 * Aendern, sobald der Markenname endgueltig steht.
 */
export const BRAND = {
  name: "Stromsteuer-Erstattung",
  shortName: "Stromsteuer",
  phone: "[TELEFON]",
  email: "info@example.de",
  kanzlei: {
    name: "Steuerkanzlei Dinglreiter",
    anwalt: "Winfred Dinglreiter",
    rolle: "Steuerberater",
    kammer: "BRAK Düsseldorf",
  },
  /** Threshold ueber dem die Sales-Bar im Marketing-Header sichtbar wird. */
  premiumBeratungAbKwh: 1_000_000,
} as const;
