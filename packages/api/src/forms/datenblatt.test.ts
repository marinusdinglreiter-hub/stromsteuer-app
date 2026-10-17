import { antrag, beleg, lieferstelle, mandant } from "@stromsteuer/antrag/fixtures";
import type { Beleg } from "@stromsteuer/db";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { datensatzFuer, generateDatenblatt } from "./datenblatt";

async function lade(bytes: Uint8Array) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
  return wb;
}

function zeileMitFeld(ws: ExcelJS.Worksheet, label: string): ExcelJS.Row | undefined {
  let treffer: ExcelJS.Row | undefined;
  ws.eachRow((row) => {
    if (row.getCell(2).value === label) treffer = row;
  });
  return treffer;
}

describe("datensatzFuer", () => {
  it("rechnet mit dem Satz des Verbrauchsjahres aus rates.ts", () => {
    const d2025 = datensatzFuer(antrag());
    expect(d2025.tabelle.satzEurProMwh).toBe(20);
    expect(d2025.tabelle.zuEntlastenEur).toBe(15_750);

    const d2023 = datensatzFuer(antrag({ antragsjahr: 2023 }));
    expect(d2023.tabelle.satzEurProMwh).toBe(5.13);
    expect(d2023.tabelle.gesamtsummeEur).toBe(4_104);
  });

  it("zieht Privatnutzung von der Menge ab", () => {
    const d = datensatzFuer(
      antrag({ triagePrivatnutzung: true, triagePrivatnutzungKwh: 10_000 }),
    );
    expect(d.tabelle.gesamtMwh).toBe(790);
    expect(d.tabelle.spalte3Mwh).toBe(790);
  });
});

describe("generateDatenblatt", () => {
  it("erzeugt Antragsdatensatz, Lieferstellen und Fehlend als Excel", async () => {
    const res = await generateDatenblatt(antrag(), { brandName: "Test" });
    const wb = await lade(res.bytes);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "Antragsdatensatz",
      "Lieferstellen",
      "Belege",
      "Fehlend",
    ]);

    const ds = wb.getWorksheet("Antragsdatensatz")!;
    expect(zeileMitFeld(ds, "IBAN")?.getCell(3).value).toBe("DE02120300000000202051");
    expect(zeileMitFeld(ds, "zu entlasten (EUR)")?.getCell(3).value).toBe("15.750,00");

    const fehlend = wb.getWorksheet("Fehlend")!;
    expect(fehlend.getRow(2).getCell(1).value).toBe("Nichts — der Antrag ist vollstaendig.");
    expect(res.fehlend).toEqual([]);
    expect(res.dateiname).toBe("datenblatt-9b-2025-Muster_Metallbau_GmbH.xlsx");
  });

  it("markiert Luecken und listet sie im Blatt Fehlend", async () => {
    const res = await generateDatenblatt(
      antrag({ mandant: mandant({ iban: null }, null) }),
      { brandName: "Test" },
    );
    const wb = await lade(res.bytes);
    const ds = wb.getWorksheet("Antragsdatensatz")!;
    expect(zeileMitFeld(ds, "IBAN")?.getCell(3).value).toBe("— fehlt —");

    const fehlendLabels: unknown[] = [];
    wb.getWorksheet("Fehlend")!.eachRow((row, nr) => {
      if (nr > 1) fehlendLabels.push(row.getCell(1).value);
    });
    expect(fehlendLabels).toContain("IBAN");
    expect(res.fehlend.map((f) => f.feld)).toContain("mandant.portalZugang.vollmachtStatus");
  });

  it("kennzeichnet unsichere OCR-Werte im Pruefprotokoll", async () => {
    const res = await generateDatenblatt(
      antrag({ lieferstellen: [lieferstelle({ belege: [beleg({ ocrConfidence: 0.5 })] })] }),
      { brandName: "Test" },
    );
    const ls = (await lade(res.bytes)).getWorksheet("Lieferstellen")!;
    expect(ls.getRow(2).getCell(13).value).toBe(
      "• rechnung.pdf: Erkennung unsicher (50 %), Werte mit dem Beleg abgleichen.",
    );
    expect(ls.getRow(2).getCell(7).value).toBe(800_000);
  });

  it("vollstaendige Jahresrechnung: Pruefprotokoll ok, Beleg mit Satz je MWh", async () => {
    const res = await generateDatenblatt(antrag(), { brandName: "Test" });
    const wb = await lade(res.bytes);
    expect(wb.getWorksheet("Lieferstellen")!.getRow(2).getCell(13).value).toBe("ok");
    const bw = wb.getWorksheet("Belege")!;
    expect(bw.getRow(2).getCell(2).value).toBe("rechnung.pdf");
    expect(bw.getRow(2).getCell(6).value).toBe(20.5);
    expect(bw.getRow(2).getCell(8).value).toBe("51238696781");
  });

  it("warnt, wenn die Stromsteuer nicht zur Menge passt", async () => {
    const res = await generateDatenblatt(
      antrag({
        lieferstellen: [
          lieferstelle({ belege: [beleg({ stromsteuerEur: 20.5 as unknown as Beleg["stromsteuerEur"] })] }),
        ],
      }),
      { brandName: "Test" },
    );
    const z = res.datensatz.lieferstellen[0]!;
    expect(z.hinweise[0]?.text).toContain("statt 20,50 €/MWh");
  });
});
