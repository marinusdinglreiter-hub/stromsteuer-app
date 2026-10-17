/**
 * Kontakthistorie am Mandanten (TODO 2.4): Mails, Telefonate und Notizen in
 * einer Zeitleiste. Getrennt vom technischen Audit-Trail, den es weiter gibt.
 * Das Mitschreiben darf nie einen Vorgang blockieren (best effort).
 */
import { prisma, type KontaktKanal, type KontaktRichtung } from "@stromsteuer/db";

export type KontaktEingabe = {
  mandantId: string | null | undefined;
  antragId?: string | null;
  kanal: KontaktKanal;
  richtung: KontaktRichtung;
  betreff: string;
  text?: string | null;
  /** true = vom System erzeugt */
  automatisch?: boolean;
  erstelltVon?: string | null;
};

export async function logKontakt(eingabe: KontaktEingabe): Promise<void> {
  if (!eingabe.mandantId) return;
  try {
    await prisma.kontakt.create({
      data: {
        mandantId: eingabe.mandantId,
        antragId: eingabe.antragId ?? null,
        kanal: eingabe.kanal,
        richtung: eingabe.richtung,
        betreff: eingabe.betreff.slice(0, 300),
        text: eingabe.text ? eingabe.text.slice(0, 5000) : null,
        automatisch: eingabe.automatisch ?? false,
        erstelltVon: eingabe.erstelltVon ?? null,
      },
    });
  } catch (err) {
    console.error("[kontakt] Eintrag fehlgeschlagen:", err);
  }
}

/** Kurzform fuer eine vom System versendete Mail an den Kunden. */
export function logMailAnKunde(
  mandantId: string | null | undefined,
  antragId: string,
  betreff: string,
): Promise<void> {
  return logKontakt({ mandantId, antragId, kanal: "EMAIL", richtung: "AUSGEHEND", betreff, automatisch: true });
}
