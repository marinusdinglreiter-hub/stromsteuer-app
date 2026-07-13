/**
 * Branchen-Dropdown fuer den Landing-Calculator und Wizard Schritt 1.
 *
 * Bewusst Klartext statt WZ-Codes (Konflikt WZ-2003 vs WZ-2008 in der Doku
 * ungeklaert — siehe Stromsteuer_Kontext.md Abschnitt 5.5). Die Kanzlei
 * ordnet im Backoffice den korrekten WZ-Code zu, sobald der Antrag eingeht.
 *
 * Die Reihenfolge orientiert sich an typischer Erstattungs-Sweet-Spot-Haeufigkeit.
 */
export type Branche = {
  value: string;
  label: string;
  /** Anspruch nach § 9b grundsaetzlich gegeben (alle UdPG-Branchen). */
  anspruchsberechtigt: boolean;
};

export const BRANCHEN: ReadonlyArray<Branche> = [
  {
    value: "verarbeitendes-gewerbe",
    label: "Verarbeitendes Gewerbe / Produktion",
    anspruchsberechtigt: true,
  },
  {
    value: "maschinenbau",
    label: "Maschinen- und Anlagenbau",
    anspruchsberechtigt: true,
  },
  {
    value: "metall",
    label: "Metallerzeugung und -bearbeitung",
    anspruchsberechtigt: true,
  },
  {
    value: "chemie-kunststoff",
    label: "Chemie- und Kunststoffindustrie",
    anspruchsberechtigt: true,
  },
  {
    value: "nahrungsmittel",
    label: "Nahrungs- und Futtermittelindustrie",
    anspruchsberechtigt: true,
  },
  {
    value: "holz-papier",
    label: "Holz, Papier, Druck",
    anspruchsberechtigt: true,
  },
  {
    value: "textil",
    label: "Textil- und Bekleidungsindustrie",
    anspruchsberechtigt: true,
  },
  {
    value: "land-forst",
    label: "Land- und Forstwirtschaft",
    anspruchsberechtigt: true,
  },
  {
    value: "handwerk-produktion",
    label: "Produzierendes Handwerk",
    anspruchsberechtigt: true,
  },
  {
    value: "bergbau",
    label: "Bergbau und Gewinnung von Steinen / Erden",
    anspruchsberechtigt: true,
  },
  {
    value: "andere",
    label: "Andere produzierende Branche",
    anspruchsberechtigt: true,
  },
];

export const DEFAULT_BRANCHE = BRANCHEN[0]!.value;
