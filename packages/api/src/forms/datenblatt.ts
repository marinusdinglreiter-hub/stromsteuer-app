/**
 * Datenblatt fuer den § 9b-Antrag (TODO 1.6): Excel mit
 *   - "Antragsdatensatz": alle Felder in der Reihenfolge von Formular 1453,
 *     fertig formatiert zum Uebertragen ins Zoll-Portal
 *   - "Lieferstellen":    Pruefprotokoll je Lieferstelle (Mengen nach Spalte,
 *                         Versorger, Zeitraum, OCR-Konfidenz)
 *   - "Fehlend":          was noch fehlt, aus `pruefeVollstaendigkeit`
 *
 * Wird nach jedem Rechnungs-Upload neu erzeugt (Backoffice-Download) und ist
 * Teil des Kanzlei-Pakets.
 */

import {
  erzeugeDatensatz,
  pruefeVollstaendigkeit,
  type AntragMitRelationen,
  type Antragsdatensatz,
  type FehlendesFeld,
  type Phase,
} from "@stromsteuer/antrag";
import ExcelJS from "exceljs";

import { calculateErstattung } from "../calc/stromsteuer";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" },
};
const LUECKE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF4E5" },
};

const HERKUNFT_LABEL = {
  kunde: "Kunde",
  ocr: "Rechnung (OCR)",
  berechnet: "berechnet",
  kanzlei: "Kanzlei",
  fest: "feste Formularangabe",
} as const;

/** Rechnet die Erstattung fuer den Antrag und baut den Datensatz. */
export function datensatzFuer(antrag: AntragMitRelationen, erzeugtAm: Date = new Date()): Antragsdatensatz {
  const bruttoKwh = antrag.lieferstellen.reduce(
    (s, l) => s + l.kwhEigenbetrieblich + l.kwhNutzenergiePG + l.kwhNutzenergieLuF,
    0,
  );
  const berechnung = calculateErstattung({
    verbrauchsjahr: antrag.antragsjahr ?? erzeugtAm.getFullYear() - 1,
    bruttoKwh,
    privatnutzungKwh: antrag.triagePrivatnutzung ? (antrag.triagePrivatnutzungKwh ?? 0) : 0,
    eAutoKwh: antrag.triageEAutoLaden ? (antrag.triageEAutoKwh ?? 0) : 0,
  });
  return erzeugeDatensatz(antrag, berechnung, erzeugtAm);
}

function kopfzeile(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true };
  row.fill = HEADER_FILL;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

/** Haengt die drei Datenblatt-Blaetter an ein bestehendes Workbook an. */
export function addDatenblattSheets(
  wb: ExcelJS.Workbook,
  datensatz: Antragsdatensatz,
  fehlend: FehlendesFeld[],
): void {
  // --- Antragsdatensatz ---
  const ws = wb.addWorksheet("Antragsdatensatz");
  ws.columns = [
    { header: "Abschnitt", key: "abschnitt", width: 11 },
    { header: "Feld", key: "label", width: 52 },
    { header: "Wert", key: "wert", width: 58 },
    { header: "Herkunft", key: "herkunft", width: 20 },
    { header: "Erledigt", key: "erledigt", width: 10 },
  ];
  kopfzeile(ws);
  for (const feld of datensatz.felder) {
    const row = ws.addRow({
      abschnitt: feld.abschnitt,
      label: feld.label,
      wert: feld.wert === "" ? "— fehlt —" : feld.wert,
      herkunft: HERKUNFT_LABEL[feld.herkunft],
      erledigt: "",
    });
    if (feld.wert === "") row.getCell("wert").fill = LUECKE_FILL;
  }
  ws.addRow({});
  ws.addRow({
    label: `Erzeugt am ${datensatz.erzeugtAm.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`,
  });
  ws.addRow({ label: "Saetze aus rates.ts, nicht aus dem PDF-Formular (dort veraltet 5,13 EUR/MWh)." });

  // --- Lieferstellen / Pruefprotokoll ---
  const ls = wb.addWorksheet("Lieferstellen");
  ls.columns = [
    { header: "#", key: "nr", width: 4 },
    { header: "Lieferstelle", key: "bezeichnung", width: 28 },
    { header: "Adresse", key: "adresse", width: 36 },
    { header: "Versorger", key: "versorger", width: 18 },
    { header: "Zeitraum", key: "zeitraum", width: 24 },
    { header: "Sp. 3 betrieblich (kWh)", key: "sp3", width: 18 },
    { header: "Sp. 4 Nutzenergie PG (kWh)", key: "sp4", width: 18 },
    { header: "Sp. 5 Nutzenergie LuF (kWh)", key: "sp5", width: 18 },
    { header: "Stromsteuer lt. Rechnung (EUR)", key: "stromsteuer", width: 18 },
    { header: "Belege", key: "belege", width: 8 },
    { header: "OCR-Konfidenz", key: "ocr", width: 14 },
    { header: "Pruefen", key: "pruefen", width: 30 },
  ];
  kopfzeile(ls);
  for (const z of datensatz.lieferstellen) {
    const pruefen: string[] = [];
    if (z.ocrConfidence === null) pruefen.push("manuell erfasst");
    else if (z.ocrConfidence < 0.75) pruefen.push("OCR unsicher, Beleg ansehen");
    if (z.belege === 0) pruefen.push("kein Beleg");
    ls.addRow({
      nr: z.nr,
      bezeichnung: z.bezeichnung,
      adresse: z.adresse,
      versorger: z.versorger,
      zeitraum: z.zeitraum,
      sp3: z.kwhEigenbetrieblich,
      sp4: z.kwhNutzenergiePG,
      sp5: z.kwhNutzenergieLuF,
      stromsteuer: z.stromsteuerGezahltEur,
      belege: z.belege,
      ocr: z.ocrConfidence === null ? "—" : `${Math.round(z.ocrConfidence * 100)} %`,
      pruefen: pruefen.join(", "),
    });
  }
  for (const key of ["sp3", "sp4", "sp5"]) ls.getColumn(key).numFmt = "#,##0";
  ls.getColumn("stromsteuer").numFmt = "#,##0.00";
  const t = datensatz.tabelle;
  ls.addRow({});
  ls.addRow({ bezeichnung: "Summe (MWh)", sp3: t.spalte3Mwh, sp4: t.spalte4Mwh, sp5: t.spalte5Mwh }).font = { bold: true };
  const summe = ls.lastRow;
  if (summe) for (const key of ["sp3", "sp4", "sp5"]) summe.getCell(key).numFmt = "#,##0.000";

  // --- Fehlend ---
  const fw = wb.addWorksheet("Fehlend");
  fw.columns = [
    { header: "Feld", key: "label", width: 60 },
    { header: "Wer liefert", key: "quelle", width: 14 },
    { header: "Formular-Abschnitt", key: "abschnitt", width: 18 },
    { header: "Pfad", key: "feld", width: 44 },
  ];
  kopfzeile(fw);
  if (fehlend.length === 0) {
    fw.addRow({ label: "Nichts — der Antrag ist vollstaendig." });
  }
  for (const f of fehlend) {
    fw.addRow({ label: f.label, quelle: f.quelle, abschnitt: f.formularAbschnitt ?? "", feld: f.feld });
  }
}

export type DatenblattErgebnis = {
  bytes: Uint8Array;
  datensatz: Antragsdatensatz;
  fehlend: FehlendesFeld[];
  dateiname: string;
};

/** Eigenstaendiges Datenblatt (Backoffice-Download nach Rechnungseingang). */
export async function generateDatenblatt(
  antrag: AntragMitRelationen,
  opts: { brandName: string; phase?: Phase; erzeugtAm?: Date },
): Promise<DatenblattErgebnis> {
  const datensatz = datensatzFuer(antrag, opts.erzeugtAm);
  const fehlend = pruefeVollstaendigkeit(antrag, opts.phase ?? "einreichung");
  const wb = new ExcelJS.Workbook();
  wb.creator = opts.brandName;
  wb.created = datensatz.erzeugtAm;
  addDatenblattSheets(wb, datensatz, fehlend);
  const buffer = await wb.xlsx.writeBuffer();
  const name = (antrag.mandant?.firmenname ?? "antrag").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
  return {
    bytes: new Uint8Array(buffer),
    datensatz,
    fehlend,
    dateiname: `datenblatt-9b-${antrag.antragsjahr ?? "jahr"}-${name}.xlsx`,
  };
}
