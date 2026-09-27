# TODO — Stromsteuer-App

Offene Punkte, gesammelt beim Status-Check am 2026-07-12. Es gibt (noch) keine
Priorisierung im Sinne von Sprints, aber Abschnitt 1 ist der bekannt kaputte
Kernprozess und sollte zuerst angegangen werden.

## 1. Rechnungs-Bot / Stromsteuer-Berechnung (kaputt — höchste Priorität)

- [x] **MWh-Erkennung fehlt komplett** — erledigt: `VERBRAUCH_REGEX` in
      `packages/api/src/ocr/parser.ts` erfasst jetzt `kWh` **und** `MWh`;
      MWh-Werte werden auf kWh normalisiert (× 1000).
- [x] **Fragile Verbrauchs-Erkennung** — erledigt: `detectJahresKwh` nutzt
      jetzt Keyword-Scoring (bevorzugt „Jahresverbrauch/Gesamtverbrauch…“,
      schließt Zählerstände/Vorjahres-/Vergleichswerte aus dem Fallback-max
      aus).
- [x] **Doppelte, inkonsistente Berechnung** — erledigt: die manuelle
      Euro-Vorschau (`kwh*0.02 - 250`) in `LieferstelleCard.tsx` wurde
      entfernt. Die Upload-Karte zeigt nur noch erkannte kWh + Stromsteuer
      lt. Rechnung; der Erstattungsbetrag wird ausschließlich in
      schritt-1/-3 über die getestete `calculateErstattung` (über die Summe
      aller Lieferstellen) berechnet.
- [x] **Stiller Fallback bei fehlendem OCR** — erledigt: `uploadAndOcrAction`
      liefert jetzt `extractionStatus` (`ok`/`empty`/`unavailable`), und
      `LieferstelleCard` zeigt dazu klare Hinweise (Bilddatei ohne
      Cloud-OCR → „Automatische Erkennung nicht verfügbar“; gescanntes PDF
      ohne Textlayer → „Konnte keine Werte lesen“).

## 2. Mandanten-Datenbank

- [ ] Kein eigenständiges Mandanten/Kunden-Model — Firmendaten hängen nur am
      `Application`-Datensatz (`packages/db/prisma/schema.prisma:17-86`),
      keine Verknüpfung mehrerer Anträge/Jahre derselben Firma.
- [ ] Fehlende Felder: Steuernummer/USt-IdNr., Handelsregister/HRB.
- [ ] Keine Honorar-/Rechnungsbuchhaltung (keine Invoice-Entität, kein
      Zahlungsstatus über die berechneten Felder hinaus).
- [ ] Kein Dokumentenstatus-Tracking pro einzelnem Beleg (nur
      `belegFileKeys[]`-Array ohne Metadaten).
- [ ] Keine CRM-/Kontakthistorie (nur technischer Audit-Trail).
- [ ] Entscheidung nötig: eigenes `Mandant`-Model einführen (1:n zu
      `Application`) oder bewusst beim Partnerkanzlei-Modell ohne Accounts
      bleiben?

## 3. Website-Design

- [ ] UI-Kit ist unverändertes shadcn-Skelett (`packages/ui/src/*.tsx`),
      Theme in `apps/web/src/app/globals.css` /
      `packages/config/tailwind/index.js` ist 100% Default-Grau — keine
      eigene Markenfarbe. Landing-Page-Komponenten nutzen stattdessen ad-hoc
      Tailwind-Farben (`text-blue-700`, `bg-slate-50` etc.).
- [ ] Kein `public/`-Ordner in `apps/web` — kein Logo, kein Favicon, keine
      Bilder.
- [ ] `apps/web/src/components/landing/PartnerStrip.tsx:5-6` — Partner-Logos
      sind nur Text-Platzhalter ("MVP: Text-Stubs").
- [ ] Landing Page hat nur Hero/PartnerStrip/AnsprechpartnerBar/WarumCards —
      kein Footer, keine Testimonials, kein FAQ.

## 4. Mandat-Dokument muss nach Wizard-Abschluss versandfertig sein

- [ ] Sobald der Mandant im Wizard alles ausgefüllt hat, muss das Mandats-/
      Vollmachts-Dokument automatisch vollständig ausgefüllt und
      versandfertig vorliegen — es soll **nur noch der Kanzlei-Stempel
      fehlen** (kein manuelles Nacharbeiten der Felder).
- [ ] Prüfen/umsetzen in `packages/api/src/forms/mandat.ts` (PDF-Erzeugung)
      und `packages/api/src/forms/kanzleiPaket.ts` (Übergabe-Paket an die
      Kanzlei): sicherstellen, dass alle Wizard-Daten (Firma,
      Ansprechpartner, Unterschrift, Antragsdaten) korrekt ins PDF
      übernommen werden und das Dokument am Ende des Flows
      (`antrag/danke`) bereits final/druckfertig ist.
- [ ] Hängt mit Punkt 5 zusammen: der aktuelle Mandatstext ist noch
      Platzhalter — muss vor Live durch finale Kanzlei-Vorlage ersetzt
      werden, sonst ist auch das automatisch ausgefüllte Dokument inhaltlich
      nicht fertig.

## 5. Bereits vorher bekannt

- [ ] `packages/api/src/forms/mandat.ts` — Mandatstext ist Platzhalter, muss
      vor Live durch finale Kanzlei-Vorlage ersetzt werden.
- [ ] Rechtliche Platzhalter in Impressum/AGB/Datenschutz sowie in
      `MandatForm.tsx`, `FirmaForm.tsx`, `TriageCard.tsx`,
      `StatusActions.tsx`.
- [ ] Fast der gesamte aktuelle Stand ist uncommitted (nur 1 Commit "scaffold
      monorepo skeleton" im Log) — Commit-Hygiene nachholen.
- [ ] `.env`: Supabase/Resend/AWS Textract sind lokal nur Fallback, für
      Produktion noch nicht befüllt/getestet.
