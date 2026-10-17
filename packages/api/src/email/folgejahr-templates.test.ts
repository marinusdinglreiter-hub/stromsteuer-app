import { describe, expect, it } from "vitest";

import { renderFolgejahrErinnerung } from "./folgejahr-templates";

const INPUT = {
  brand: { name: "Stromsteuer-Erstattung", shortName: "Stromsteuer" },
  ansprechpartner: "Erika Muster",
  kanzleiName: "[KANZLEI]",
  jahr: 2026,
  statusUrl: "https://app.example/status/abc",
  fristDatum: "31.12.2027",
};

describe("renderFolgejahrErinnerung", () => {
  it("nennt Jahr, Frist und was uebernommen wird", () => {
    const m = renderFolgejahrErinnerung(INPUT);
    expect(m.subject).toBe("Stromsteuer-Entlastung 2026: Antrag jetzt vorbereiten");
    expect(m.text).toContain("31.12.2027");
    expect(m.text).toContain("Firmendaten");
    expect(m.text).toContain("Vollmacht");
    expect(m.html).toContain("https://app.example/status/abc");
  });

  it("maskiert HTML in Namen", () => {
    const m = renderFolgejahrErinnerung({ ...INPUT, ansprechpartner: "<b>x</b>", kanzleiName: "A&B" });
    expect(m.html).not.toContain("<b>x</b>");
    expect(m.html).toContain("A&amp;B");
  });

  it("ohne Ansprechpartner: neutrale Anrede", () => {
    expect(renderFolgejahrErinnerung({ ...INPUT, ansprechpartner: null }).text).toContain("Guten Tag,");
  });
});
