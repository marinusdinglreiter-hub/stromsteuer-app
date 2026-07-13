/**
 * Rechtsform-Dropdown fuer Schritt 3a (Firmendaten).
 * Reihenfolge nach Haeufigkeit im Mittelstand.
 */
export const RECHTSFORMEN: ReadonlyArray<{ value: string; label: string }> = [
  { value: "GmbH", label: "GmbH" },
  { value: "UG", label: "UG (haftungsbeschränkt)" },
  { value: "GmbH & Co. KG", label: "GmbH & Co. KG" },
  { value: "AG", label: "AG" },
  { value: "KG", label: "KG" },
  { value: "OHG", label: "OHG" },
  { value: "GbR", label: "GbR" },
  { value: "e.K.", label: "e.K. / Einzelkaufmann" },
  { value: "eG", label: "eG (Genossenschaft)" },
  { value: "Einzelunternehmen", label: "Einzelunternehmen" },
  { value: "Limited", label: "Limited" },
  { value: "Sonstige", label: "Sonstige" },
];
