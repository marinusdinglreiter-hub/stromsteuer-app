/**
 * Kanzlei-Paket-Generator.
 *
 * Erzeugt aus einer SIGNED Application:
 *   - Excel-Workbook (Übersicht + Lieferstellen + Triage)
 *   - ZIP mit Excel + Mandat-PDF + allen Original-Belegen + README
 *
 * Die ZIP wird in den `generated`-Bucket geschoben; der Storage-Key landet im
 * Application-Record (kanzleiPaketKey) und steht der Kanzlei via Signed-URL zur
 * Verfuegung.
 */

import ExcelJS from "exceljs";
import JSZip from "jszip";

import type { Application, Lieferstelle } from "@stromsteuer/db";

import { downloadBeleg, downloadGenerated } from "../storage/supabase";

export type KanzleiPaketInput = {
  application: Application & { lieferstellen: Lieferstelle[] };
  brand: {
    name: string;
    shortName: string;
  };
  kanzlei: {
    name: string;
    anwalt: string;
  };
};

function eur(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function dateString(d: Date | null | undefined): string {
  return d
    ? d.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
}

async function buildWorkbook(input: KanzleiPaketInput): Promise<Uint8Array> {
  const { application: a } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = input.brand.name;
  wb.created = new Date();

  // --- Sheet 1: Übersicht ---
  const ws1 = wb.addWorksheet("Übersicht", {
    properties: { defaultRowHeight: 18 },
  });
  ws1.columns = [
    { header: "Feld", key: "label", width: 38 },
    { header: "Wert", key: "value", width: 60 },
  ];
  ws1.getRow(1).font = { bold: true };
  ws1.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  const rows: Array<[string, string]> = [
    ["Vorgang", a.id],
    ["Status", a.status],
    ["Antragsjahr", String(a.antragsjahr ?? "—")],
    ["Signiert am", dateString(a.mandatSignedAt)],
    ["", ""],
    ["Mandant — Firmenname", a.firmenname ?? "—"],
    ["Mandant — Rechtsform", a.rechtsform ?? "—"],
    ["Mandant — Vertreten durch", a.geschaeftsfuehrer ?? "—"],
    ["Mandant — Vorname / Nachname", `${a.vorname ?? "—"} ${a.nachname ?? ""}`.trim()],
    ["Mandant — Telefon", a.telefon ?? "—"],
    ["Mandant — Adresse", `${a.strasse ?? "—"}, ${a.plz ?? ""} ${a.ort ?? ""}`.trim()],
    ["Mandant — E-Mail", a.email ?? "—"],
    ["", ""],
    ["Brutto-kWh (Summe Lieferstellen)", String(a.bruttoKwh ?? "—")],
    ["Netto-kWh (nach Abzügen)", String(a.nettoKwh ?? "—")],
    ["Brutto-Erstattung", a.bruttoErstattung ? eur(Number(a.bruttoErstattung)) : "—"],
    ["Erfolgshonorar", a.honorar ? eur(Number(a.honorar)) : "—"],
    ["Voraussichtliche Auszahlung", a.nettoAuszahlung ? eur(Number(a.nettoAuszahlung)) : "—"],
    ["", ""],
    ["Triage — Kleinste Rechtsperson", boolStr(a.triageKleinsteRechtsperson)],
    ["Triage — Keine finanziellen Schwierigkeiten (UiS)", boolStr(a.triageKeineFinanzschwierig)],
    ["Triage — Keine EU-Rückforderung", boolStr(a.triageKeineEuRueckforderung)],
    ["Triage — Privatnutzung", boolStr(a.triagePrivatnutzung)],
    ["Triage — Privatnutzung kWh", a.triagePrivatnutzungKwh ? String(a.triagePrivatnutzungKwh) : "—"],
    ["Triage — E-Auto-Ladung", boolStr(a.triageEAutoLaden)],
    ["Triage — E-Auto kWh", a.triageEAutoKwh ? String(a.triageEAutoKwh) : "—"],
    ["Triage — Energielieferung an Dritte", boolStr(a.triageEnergieAnDritte)],
    ["", ""],
    ["⚠ FORMULAR 1456 erforderlich?", a.triageEnergieAnDritte ? "JA — bitte mitliefern" : "Nein"],
    ["Kanzlei", `${input.kanzlei.name} — ${input.kanzlei.anwalt}`],
  ];
  for (const [label, value] of rows) {
    ws1.addRow({ label, value });
  }

  // --- Sheet 2: Lieferstellen ---
  const ws2 = wb.addWorksheet("Lieferstellen");
  ws2.columns = [
    { header: "#", key: "nr", width: 4 },
    { header: "Firmenname", key: "firmenname", width: 32 },
    { header: "Adresse", key: "adresse", width: 44 },
    { header: "PLZ", key: "plz", width: 8 },
    { header: "Jahres-kWh", key: "kwh", width: 16 },
    { header: "Belege", key: "belege", width: 8 },
    { header: "OCR-Confidence", key: "ocr", width: 16 },
  ];
  ws2.getRow(1).font = { bold: true };
  ws2.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  let nr = 1;
  for (const l of a.lieferstellen) {
    ws2.addRow({
      nr: nr++,
      firmenname: l.firmenname,
      adresse: l.adresse,
      plz: l.plz ?? "",
      kwh: l.jahresKwh,
      belege: l.belegFileKeys.length,
      ocr:
        l.ocrConfidence !== null
          ? `${Math.round(l.ocrConfidence * 100)} %`
          : "—",
    });
  }
  ws2.getColumn("kwh").numFmt = "#,##0";

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function boolStr(v: boolean | null | undefined): string {
  if (v === true) return "Ja";
  if (v === false) return "Nein";
  return "—";
}

function readme(input: KanzleiPaketInput): string {
  const { application: a } = input;
  return [
    `Antrags-Paket — ${a.firmenname ?? "Mandant"}`,
    `Vorgang: ${a.id}`,
    `Signiert am: ${dateString(a.mandatSignedAt)}`,
    "",
    "Inhalt:",
    "  uebersicht.xlsx        — Stammdaten, Berechnung, Triage-Antworten, Lieferstellen-Tabelle",
    "  mandat.pdf             — Vom Mandanten unterschriebene Vollmacht/Mandatsvereinbarung",
    "  belege/                — Original-Stromrechnungen pro Lieferstelle",
    "",
    a.triageEnergieAnDritte
      ? "Hinweis: Formular 1456 (Selbsterklärung Drittnutzer) erforderlich."
      : "",
    "",
    `Generiert: ${new Date().toISOString()}`,
    `Plattform: ${input.brand.name}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export async function generateKanzleiPaket(
  input: KanzleiPaketInput,
): Promise<Uint8Array> {
  const zip = new JSZip();

  // README
  zip.file("README.txt", readme(input));

  // Übersicht-Excel
  const xlsx = await buildWorkbook(input);
  zip.file("uebersicht.xlsx", xlsx);

  // Mandat-PDF (falls vorhanden)
  if (input.application.mandatPdfKey) {
    try {
      const bytes = await downloadGenerated(input.application.mandatPdfKey);
      zip.file("mandat.pdf", bytes);
    } catch (err) {
      zip.file(
        "mandat-FEHLER.txt",
        `Mandat-PDF konnte nicht heruntergeladen werden: ${err instanceof Error ? err.message : "unbekannt"}`,
      );
    }
  }

  // Belege aus allen Lieferstellen
  const belegeFolder = zip.folder("belege");
  if (belegeFolder) {
    let lsIdx = 1;
    for (const ls of input.application.lieferstellen) {
      if (ls.belegFileKeys.length === 0) {
        lsIdx++;
        continue;
      }
      const lsFolder = belegeFolder.folder(
        `${String(lsIdx).padStart(2, "0")}_${sanitize(ls.firmenname || "lieferstelle")}`,
      );
      if (!lsFolder) {
        lsIdx++;
        continue;
      }
      for (const key of ls.belegFileKeys) {
        try {
          const bytes = await downloadBeleg(key);
          const fileName = key.split("/").pop() ?? "beleg";
          lsFolder.file(fileName, bytes);
        } catch (err) {
          lsFolder.file(
            `FEHLER-${key.split("/").pop() ?? "beleg"}.txt`,
            `Download fehlgeschlagen: ${err instanceof Error ? err.message : "unbekannt"}`,
          );
        }
      }
      lsIdx++;
    }
  }

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  return zipBytes;
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "lieferstelle";
}
