import { describe, expect, it } from "vitest";

import {
  canonicalConsentText,
  CLAUSES,
  CONSENT_VERSION,
  renderClause,
} from "./legalTexts";

describe("legalTexts", () => {
  it("renderClause ersetzt den antragsjahr-Platzhalter", () => {
    const out = renderClause(CLAUSES.vollmachtGegenstand, { antragsjahr: 2024 });
    expect(out).toContain("Verbrauchsjahr 2024");
    expect(out).not.toContain("{{antragsjahr}}");
  });

  it("laesst Klauseln ohne Platzhalter unveraendert", () => {
    expect(renderClause(CLAUSES.verschwiegenheit, { antragsjahr: 2024 })).toBe(
      CLAUSES.verschwiegenheit,
    );
  });

  it("canonicalConsentText ist versions-stabil (Platzhalter bleiben erhalten)", () => {
    const text = canonicalConsentText();
    expect(text).toContain(`CONSENT_VERSION: ${CONSENT_VERSION}`);
    // Platzhalter NICHT ersetzt -> unabhaengig von den Instanzdaten.
    expect(text).toContain("{{antragsjahr}}");
  });

  it("canonicalConsentText ist deterministisch", () => {
    expect(canonicalConsentText()).toBe(canonicalConsentText());
  });
});
