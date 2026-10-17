import { describe, expect, it } from "vitest";

import { renderPortalErinnerung, renderVollmachtAktiv, steuerberaterAnschreiben, type PortalMailInput } from "./portal-templates";

const INPUT: PortalMailInput = {
  brand: { name: "Stromsteuer-Erstattung", shortName: "Stromsteuer" },
  ansprechpartner: "Erika Muster",
  kanzleiName: "[KANZLEI]",
  antragsjahr: 2025,
  erstattung: 3810,
  statusUrl: "https://app.example/status/abc",
  terminUrl: "https://cal.example/portal",
  fristDatum: "31.12.2026",
  vollmachtBisDatum: "01.12.2026",
};

describe("Portal-Mails", () => {
  it("Betreff je Stufe nach Konzept", () => {
    expect(renderPortalErinnerung(1, INPUT).subject).toBe("Nur noch der Portal-Zugang fehlt");
    expect(renderPortalErinnerung(2, INPUT).subject).toBe("Sollen wir den Portal-Zugang gemeinsam einrichten?");
    expect(renderPortalErinnerung(3, INPUT).subject).toBe("Frist 31. Dezember: Zugang bis 01.12.2026 nötig");
    expect(renderPortalErinnerung(4, INPUT).subject).toBe("Wir halten Ihnen einen Termin frei");
    expect(renderVollmachtAktiv(INPUT).subject).toBe("Vollmacht ist aktiv");
  });

  it("nennt Betrag, Frist und Link", () => {
    const m = renderPortalErinnerung(3, INPUT);
    expect(m.text).toContain("31.12.2026");
    expect(m.text).toMatch(/3\.810,00\s€/);
    expect(m.html).toContain("https://app.example/status/abc");
  });

  it("Stufe 2 verweist auf den Terminlink, sonst auf Antwort per Mail", () => {
    expect(renderPortalErinnerung(2, INPUT).html).toContain("https://cal.example/portal");
    const ohne = renderPortalErinnerung(2, { ...INPUT, terminUrl: null });
    expect(ohne.html).not.toContain("cal.example");
    expect(ohne.text).toContain("Wunschtermin");
  });

  it("Aktiv-Mail enthaelt den Hinweis zur Bescheid-Zustellung an die Kanzlei", () => {
    expect(renderVollmachtAktiv(INPUT).text).toContain("Portal-Profil von [KANZLEI]");
  });

  it("maskiert HTML in Namen (Kunde kann Firmen- und Personennamen frei eintragen)", () => {
    const m = renderPortalErinnerung(1, { ...INPUT, ansprechpartner: "<script>x</script>", kanzleiName: "A&B" });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.html).toContain("A&amp;B");
  });

  it("ohne Betrag steht kein 'null' in der Mail", () => {
    const m = renderPortalErinnerung(1, { ...INPUT, erstattung: null });
    expect(m.text).not.toContain("null");
  });

  it("Steuerberater-Anschreiben nennt Jahr, Kanzlei und die Dienstleistung", () => {
    const a = steuerberaterAnschreiben({ kanzleiName: "Kanzlei X", antragsjahr: 2025 });
    expect(a.text).toContain("für 2025");
    expect(a.text).toContain("Kanzlei X");
    expect(a.text).toContain("Sonstige steuerliche Anträge");
    expect(a.text).toContain("ELSTER-Zertifikat");
  });
});
