/**
 * Kanzlei-Paket-Generator.
 *
 * Erzeugt aus einem signierten Antrag:
 *   - Excel-Workbook: Uebersicht, Antragsdatensatz (Formular-Reihenfolge),
 *     Lieferstellen-Pruefprotokoll, Fehlend
 *   - ZIP mit Excel + beiden Vertrags-PDFs + allen Original-Belegen + README
 *
 * Die ZIP wird in den `generated`-Bucket geschoben; der Storage-Key landet im
 * Antrag (kanzleiPaketKey) und steht der Kanzlei via Signed-URL zur Verfuegung.
 */

import { pruefeVollstaendigkeit, type AntragMitRelationen } from "@stromsteuer/antrag";
import ExcelJS from "exceljs";
import JSZip from "jszip";

import { downloadBeleg, downloadGenerated } from "../storage/supabase";

import { addDatenblattSheets, datensatzFuer } from "./datenblatt";

export type KanzleiPaketInput = {
  antrag: AntragMitRelationen;
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

function boolStr(v: boolean | null | undefined): string {
  if (v === true) return "Ja";
  if (v === false) return "Nein";
  return "—";
}

async function buildWorkbook(input: KanzleiPaketInput): Promise<Uint8Array> {
  const { antrag: a } = input;
  const m = a.mandant;
  const wb = new ExcelJS.Workbook();
  wb.creator = input.brand.name;
  wb.created = new Date();

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
    ["Aufbereitungsvertrag signiert am", dateString(a.aufbereitungSignedAt)],
    ["Kanzleimandat signiert am", dateString(a.kanzleimandatSignedAt)],
    ["", ""],
    ["Mandant — Firmenname", m?.firmenname ?? "—"],
    ["Mandant — Vertreten durch", m?.geschaeftsfuehrer ?? "—"],
    ["Mandant — Ansprechpartner", `${m?.vorname ?? "—"} ${m?.nachname ?? ""}`.trim()],
    ["Mandant — Telefon", m?.telefon ?? "—"],
    ["Mandant — E-Mail", m?.email ?? "—"],
    ["", ""],
    ["Brutto-kWh (Summe Lieferstellen)", String(a.bruttoKwh ?? "—")],
    ["Netto-kWh (nach Abzügen)", String(a.nettoKwh ?? "—")],
    ["Gesamtsumme Entlastung", a.bruttoErstattung ? eur(Number(a.bruttoErstattung)) : "—"],
    ["Aufbereitungspauschale (unsere Rechnung)", a.preisEur ? eur(Number(a.preisEur)) : "—"],
    ["Preistabelle", a.preisTabelleVersion ?? "—"],
    ["", ""],
    ["Triage — Kleinste Rechtsperson", boolStr(a.triageKleinsteRechtsperson)],
    ["Triage — Keine finanziellen Schwierigkeiten (UiS)", boolStr(a.triageKeineFinanzschwierig)],
    ["Triage — Keine EU-Rückforderung", boolStr(a.triageKeineEuRueckforderung)],
    ["Triage — Privatnutzung kWh", a.triagePrivatnutzungKwh ? String(a.triagePrivatnutzungKwh) : "—"],
    ["Triage — E-Auto kWh", a.triageEAutoKwh ? String(a.triageEAutoKwh) : "—"],
    ["", ""],
    ["⚠ FORMULAR 1456 erforderlich?", a.nutzenergieAnDritteWeitergegeben ? "JA — je Empfänger" : "Nein"],
    ["Kanzlei", `${input.kanzlei.name} — ${input.kanzlei.anwalt}`],
  ];
  for (const [label, value] of rows) {
    ws1.addRow({ label, value });
  }

  addDatenblattSheets(wb, datensatzFuer(a), pruefeVollstaendigkeit(a, "einreichung"));

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function readme(input: KanzleiPaketInput): string {
  const { antrag: a } = input;
  return [
    `Antrags-Paket — ${a.mandant?.firmenname ?? "Mandant"}`,
    `Vorgang: ${a.id}`,
    "",
    "Inhalt:",
    "  uebersicht.xlsx              — Übersicht, Antragsdatensatz (Formular 1453), Lieferstellen, Fehlend",
    "  aufbereitungsvertrag.pdf     — Vertrag über die Aufbereitung (Festpreis), signiert",
    "  kanzleimandat.pdf            — Mandat und Vollmacht für die Kanzlei, signiert",
    "  belege/                      — Original-Stromrechnungen pro Lieferstelle",
    "",
    "Das Blatt \"Fehlend\" nennt, was vor der Einreichung im Zoll-Portal noch fehlt.",
    a.nutzenergieAnDritteWeitergegeben
      ? "Hinweis: Formular 1456 je Nutzenergie-Empfänger und Zuordnungsaufstellung erforderlich."
      : "",
    "",
    `Generiert: ${new Date().toISOString()}`,
    `Plattform: ${input.brand.name}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

async function addPdf(zip: JSZip, key: string | null, name: string) {
  if (!key) return;
  try {
    zip.file(name, await downloadGenerated(key));
  } catch (err) {
    zip.file(
      `${name}-FEHLER.txt`,
      `PDF konnte nicht heruntergeladen werden: ${err instanceof Error ? err.message : "unbekannt"}`,
    );
  }
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

  await addPdf(zip, input.antrag.aufbereitungPdfKey, "aufbereitungsvertrag.pdf");
  await addPdf(zip, input.antrag.kanzleimandatPdfKey, "kanzleimandat.pdf");

  // Belege aus allen Lieferstellen
  const belegeFolder = zip.folder("belege");
  if (belegeFolder) {
    let lsIdx = 1;
    for (const ls of input.antrag.lieferstellen) {
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
