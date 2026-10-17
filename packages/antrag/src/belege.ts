/**
 * Belege je Lieferstelle: Summen bilden und das Pruefprotokoll erzeugen.
 *
 * Rein, ohne IO. Die Software bewertet nichts steuerlich — sie zeigt der
 * Kanzlei, wo sie hinschauen muss (Zeitraum passt nicht zum Antragsjahr,
 * Stromsteuer passt nicht zur Menge, OCR unsicher, Menge von Hand geaendert).
 */

import type { Beleg, Lieferstelle } from "@stromsteuer/db";

export type BelegWerte = Pick<
  Beleg,
  "kwh" | "zeitraumVon" | "zeitraumBis" | "stromsteuerEur" | "ocrConfidence"
>;

export type BelegAggregat = {
  /** Summe der erkannten Mengen; null, wenn kein Beleg eine Menge hat */
  kwh: number | null;
  zeitraumVon: Date | null;
  zeitraumBis: Date | null;
  stromsteuerEur: number | null;
  /** Schwaechster Beleg zaehlt */
  ocrConfidence: number | null;
};

/** Unter dieser OCR-Konfidenz soll die Kanzlei den Beleg ansehen. */
export const OCR_PRUEFSCHWELLE = 0.75;

/** Erlaubte Abweichung der Stromsteuer vom Regelsatz, bevor gewarnt wird. */
export const STROMSTEUER_TOLERANZ = 0.05;

/** Rand- und Luecken-Toleranz in Tagen (Ablesetermine liegen selten exakt am 1.1.). */
const TOLERANZ_TAGE = 3;

const TAG_MS = 86_400_000;

function zahl(v: BelegWerte["stromsteuerEur"]): number | null {
  return v === null ? null : Number(v);
}

function minDate(dates: (Date | null)[]): Date | null {
  const known = dates.filter((d): d is Date => d !== null);
  return known.length === 0 ? null : new Date(Math.min(...known.map((d) => d.getTime())));
}

function maxDate(dates: (Date | null)[]): Date | null {
  const known = dates.filter((d): d is Date => d !== null);
  return known.length === 0 ? null : new Date(Math.max(...known.map((d) => d.getTime())));
}

export function aggregiereBelege(belege: BelegWerte[]): BelegAggregat {
  const mitKwh = belege.filter((b) => b.kwh !== null);
  const steuer = belege.map((b) => zahl(b.stromsteuerEur)).filter((v): v is number => v !== null);
  const konfidenz = belege.map((b) => b.ocrConfidence).filter((v): v is number => v !== null);
  return {
    kwh: mitKwh.length === 0 ? null : mitKwh.reduce((s, b) => s + b.kwh!, 0),
    zeitraumVon: minDate(belege.map((b) => b.zeitraumVon)),
    zeitraumBis: maxDate(belege.map((b) => b.zeitraumBis)),
    stromsteuerEur: steuer.length === 0 ? null : Math.round(steuer.reduce((s, v) => s + v, 0) * 100) / 100,
    ocrConfidence: konfidenz.length === 0 ? null : Math.min(...konfidenz),
  };
}

/**
 * Neue Menge fuer Spalte 3 nach einem weiteren Beleg. Die Menge folgt der
 * Belegsumme nur, solange der Kunde sie nicht von Hand geaendert hat (aktuell
 * 0 oder gleich der bisherigen Summe). Sonst `undefined` = nicht anfassen.
 */
export function mengeNachBeleg(
  aktuellKwh: number,
  belegeVorher: BelegWerte[],
  belegeNachher: BelegWerte[],
): number | undefined {
  const vorher = aggregiereBelege(belegeVorher).kwh ?? 0;
  const nachher = aggregiereBelege(belegeNachher).kwh;
  if (nachher === null) return undefined;
  if (aktuellKwh === 0 || aktuellKwh === vorher) return nachher;
  return undefined;
}

export type Hinweis = {
  stufe: "warnung" | "info";
  text: string;
};

export type LieferstelleMitBelegen = Lieferstelle & {
  belege: (BelegWerte & Pick<Beleg, "dateiname" | "extraktion">)[];
};

export type PruefOptionen = {
  antragsjahr: number | null;
  /** Regelsteuersatz in EUR/MWh; ohne Angabe keine Plausibilitaetspruefung */
  regelsatzEurProMwh?: number;
};

function tag(d: Date): number {
  return Math.floor(d.getTime() / TAG_MS);
}

function datum(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getUTCFullYear()}`;
}

function kwhText(kwh: number): string {
  return `${kwh.toLocaleString("de-DE")} kWh`;
}

function eurText(eur: number): string {
  return `${eur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** Zeitraeume der Belege gegen das Kalenderjahr des Antrags pruefen. */
function pruefeZeitraum(
  belege: LieferstelleMitBelegen["belege"],
  jahr: number,
  hinweise: Hinweis[],
): void {
  const mitZeitraum = belege
    .filter((b) => b.zeitraumVon !== null && b.zeitraumBis !== null)
    .map((b) => ({ dateiname: b.dateiname, von: b.zeitraumVon!, bis: b.zeitraumBis! }))
    .sort((a, b) => a.von.getTime() - b.von.getTime());
  if (mitZeitraum.length === 0) return;

  const jahresBeginn = tag(new Date(Date.UTC(jahr, 0, 1)));
  const jahresEnde = tag(new Date(Date.UTC(jahr, 11, 31)));
  const erster = mitZeitraum[0]!;
  const spaetestesEnde = mitZeitraum.reduce((m, z) => (z.bis > m ? z.bis : m), erster.bis);

  if (tag(erster.von) < jahresBeginn - TOLERANZ_TAGE || tag(spaetestesEnde) > jahresEnde + TOLERANZ_TAGE) {
    hinweise.push({
      stufe: "warnung",
      text: `Rechnungszeitraum ${datum(erster.von)} – ${datum(spaetestesEnde)} reicht über das Kalenderjahr ${jahr} hinaus. Menge auf ${jahr} abgrenzen.`,
    });
  }
  if (tag(erster.von) > jahresBeginn + TOLERANZ_TAGE) {
    hinweise.push({
      stufe: "warnung",
      text: `Rechnungen beginnen erst am ${datum(erster.von)}. Für ${jahr} fehlt der Zeitraum davor.`,
    });
  }
  if (tag(spaetestesEnde) < jahresEnde - TOLERANZ_TAGE) {
    hinweise.push({
      stufe: "warnung",
      text: `Rechnungen enden bereits am ${datum(spaetestesEnde)}. Für ${jahr} fehlt der Zeitraum danach.`,
    });
  }

  let bisher = erster;
  for (const z of mitZeitraum.slice(1)) {
    if (tag(z.von) <= tag(bisher.bis) - TOLERANZ_TAGE) {
      hinweise.push({
        stufe: "warnung",
        text: `Zeiträume überlappen: ${bisher.dateiname} (bis ${datum(bisher.bis)}) und ${z.dateiname} (ab ${datum(z.von)}). Doppelt gezählt?`,
      });
    } else if (tag(z.von) > tag(bisher.bis) + 1 + TOLERANZ_TAGE) {
      hinweise.push({
        stufe: "warnung",
        text: `Lücke zwischen ${datum(bisher.bis)} und ${datum(z.von)}. Rechnung fehlt?`,
      });
    }
    if (z.bis > bisher.bis) bisher = z;
  }
}

/**
 * Pruefprotokoll einer Lieferstelle. Reihenfolge: Warnungen vor Infos,
 * sonst in der Reihenfolge der Pruefung.
 */
export function pruefeLieferstelle(l: LieferstelleMitBelegen, opts: PruefOptionen): Hinweis[] {
  const hinweise: Hinweis[] = [];
  const belege = l.belege;

  if (belege.length === 0) {
    hinweise.push(
      l.belegFileKeys.length === 0
        ? { stufe: "warnung", text: "Keine Rechnung hochgeladen, Menge manuell erfasst." }
        : { stufe: "info", text: "Rechnung ohne ausgelesene Werte, Beleg ansehen." },
    );
  }

  for (const b of belege) {
    if (b.kwh === null) {
      hinweise.push({
        stufe: "warnung",
        text:
          b.extraktion === "keine"
            ? `${b.dateiname}: nicht automatisch lesbar (Bild oder Scan), Werte aus dem Beleg übernehmen.`
            : `${b.dateiname}: Menge nicht erkannt, Beleg ansehen.`,
      });
    } else if (b.ocrConfidence !== null && b.ocrConfidence < OCR_PRUEFSCHWELLE) {
      hinweise.push({
        stufe: "warnung",
        text: `${b.dateiname}: Erkennung unsicher (${Math.round(b.ocrConfidence * 100)} %), Werte mit dem Beleg abgleichen.`,
      });
    }
    if (b.kwh !== null && (b.zeitraumVon === null || b.zeitraumBis === null)) {
      hinweise.push({ stufe: "warnung", text: `${b.dateiname}: Abrechnungszeitraum nicht erkannt.` });
    }

    const steuer = zahl(b.stromsteuerEur);
    if (b.kwh !== null && b.kwh > 0 && steuer !== null && opts.regelsatzEurProMwh !== undefined) {
      const satz = steuer / (b.kwh / 1000);
      if (Math.abs(satz - opts.regelsatzEurProMwh) / opts.regelsatzEurProMwh > STROMSTEUER_TOLERANZ) {
        hinweise.push({
          stufe: "warnung",
          text: `${b.dateiname}: Stromsteuer ${eurText(steuer)} bei ${kwhText(b.kwh)} entspricht ${eurText(satz)}/MWh statt ${eurText(opts.regelsatzEurProMwh)}/MWh. Menge oder Betrag falsch gelesen?`,
        });
      }
    } else if (b.kwh !== null && steuer === null) {
      hinweise.push({ stufe: "info", text: `${b.dateiname}: Stromsteuer-Betrag nicht erkannt.` });
    }
  }

  if (opts.antragsjahr !== null) pruefeZeitraum(belege, opts.antragsjahr, hinweise);

  const summe = aggregiereBelege(belege).kwh;
  const menge = l.kwhEigenbetrieblich + l.kwhNutzenergiePG + l.kwhNutzenergieLuF;
  if (summe !== null && summe !== menge) {
    hinweise.push({
      stufe: "warnung",
      text: `Menge der Lieferstelle (${kwhText(menge)}) weicht von der Summe der Rechnungen (${kwhText(summe)}) ab, von Hand geändert.`,
    });
  }

  return [...hinweise.filter((h) => h.stufe === "warnung"), ...hinweise.filter((h) => h.stufe === "info")];
}
