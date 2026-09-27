# TODO — Stromsteuer-App

Stand 27.09.2026. Arbeitsliste für Coding-Sessions. Die Fassung vom 12.07. liegt
als `TODO.md.bak-20260927` daneben.

**Diese Datei ist die verbindliche Quelle für Geschäftsregeln.** `CLAUDE.md` und
`Code_Plan.md` enthalten überholte Annahmen (Erfolgshonorar, Partnerkanzlei
WINDORFER RODE, ELSTER-XML). Bei Widerspruch gilt diese Datei. Aufgabe 0.4
bringt die anderen Dokumente nach.

**Wo lesen:** `docs/00-README.md` ist die Leseanleitung — sie sagt, welches
Dokument zu welcher Aufgabe gehört. Alle Hintergrunddokumente liegen unter
`docs/` im Repo, nicht in einer externen Ablage. Externe Web-Quellen mit
Abrufdatum in `docs/90-quellen.md`.

Die wichtigsten für die Arbeit:

| Datei | Inhalt |
|---|---|
| `docs/formulare/1453-feldspezifikation.md` | Feldstruktur des Hauptantrags — die Spezifikation des Datenmodells |
| `docs/10-entscheidung-abrechnungsstruktur.md` | Preismodell und warum es kein Erfolgshonorar mehr gibt |
| `docs/20-vollmachts-onboarding.md` | Portal-Onboarding inkl. aller Textvorlagen |
| `docs/30-wettbewerb-und-einreichungsmodelle.md` | Markt und Einreichungsmodelle |
| `docs/40-vertrieb-outsourcing.md` | Vertriebskanäle, Provisionsrecht |
| `docs/50-plan-antrags-engine.md` | Architektur-Hintergrund und Optionen |
| `docs/60-geschaeftsmodell-historie.md` | Historie, **keine Arbeitsanweisung** |
| `docs/70-code-plan-ueberholt.md` | Stand 17.06.2026, überholt; Implementierungstabelle noch nützlich |

## Faktenblatt (nichts hiervon erraten oder nachrechnen)

| Größe | Wert | Quelle |
|---|---|---|
| Entlastungssatz ab Verbrauchsjahr 2024 | 20,00 €/MWh | zoll.de § 9b StromStG |
| Entlastungssatz bis 2023 | 5,13 €/MWh | § 9b Abs. 2 StromStG a. F. |
| Regelsteuersatz | 20,50 €/MWh | Anleitung Formular 1453 |
| Selbstbehalt | 250 € pro Kalenderjahr | § 9b Abs. 2 Satz 2 StromStG |
| Ausschlussfrist | 31.12. des Jahres nach dem Entnahmejahr | Anleitung Formular 1453 |
| Rechnerische Untergrenze | 12.500 kWh (= 250 € Erstattung) | abgeleitet |
| Wirtschaftliche Untergrenze neu | 150.000 kWh | Preismodell, siehe 1.2 |

**Achtung Falle:** Im PDF von Formular 1453 (Fassung 07/2025) steht in der
Berechnungstabelle als Entlastungssatz `5,13`. Das ist veraltet. Sätze niemals
aus Formularen übernehmen, immer aus `rates.ts`.

## Geänderte Grundannahmen

- **Kein Erfolgshonorar.** Zwei getrennte Rechnungen: wir für die Aufbereitung
  (Festpreis nach Verbrauchsband), die Kanzlei separat für die Vertretung.
  Grund: Gebührenteilung mit Berufsträgern ist unzulässig (§ 49b BRAO,
  § 9 StBerG); ein Prozentsatz der Erstattung in der eigenen Rechnung gefährdet
  die § 6-StBerG-Zone.
- **Partnerkanzlei offen.** WINDORFER RODE ist vom Tisch. Überall Platzhalter.
- **§ 9b ist seit 01.01.2025 online-pflichtig.** Der Antrag ist eine
  strukturierte Eingabe im Zoll-Portal durch die bevollmächtigte Kanzlei. Es
  wird kein 1453 befüllt und kein ELSTER-XML erzeugt. Falls im Code Reste davon
  auftauchen: löschen, nicht reparieren.
- **Formular 1402 entfällt** als Pflichtanlage (nur auf Verlangen des HZA).
- **Verbrauchsjahr 2024 ist verfallen** (Frist war 31.12.2025).

## 0. Blocker — zuerst, in dieser Reihenfolge

### 0.1 Uncommitted Stand sichern

Es liegen 9 modifizierte und 6 neue Dateien uncommitted im Repo, darunter die
gesamte Signatur-Integritätsarbeit.

- [ ] `git status` prüfen, in thematischen Commits sichern:
      `crypto.ts` + Test, `forms/legalTexts.ts` + Test, `forms/verify.ts`,
      Migration `2_signature_integrity`, Schema-Änderung, `mandat.ts`.
- [ ] Conventional Commits (`feat:`, `fix:`, `chore:`).

Akzeptanz: `git status` ist leer, `git log` zeigt mehr als drei Commits.

### 0.2 Baseline verifizieren

- [ ] `pnpm install`
- [ ] `pnpm db:generate`
- [ ] `pnpm typecheck` — alle 5 Pakete grün
- [ ] `pnpm lint` — alle 5 Pakete grün
- [ ] `pnpm --filter @stromsteuer/api test` — 24 Tests grün

Akzeptanz: alles grün. Wenn nicht, hier stoppen und melden, nichts weiterbauen.

### 0.3 Migrations anwenden

- [ ] `pnpm --filter @stromsteuer/db exec prisma migrate deploy`
- [ ] Falls die Tabellen per `db push` schon existieren, schlägt das fehl. Dann:
      `pnpm --filter @stromsteuer/db exec prisma migrate resolve --applied 0_init`
      und die DDL aus `prisma/migrations/1_audit_immutable/migration.sql` sowie
      `2_signature_integrity/migration.sql` einmalig manuell in der
      Supabase-SQL-Konsole ausführen.

Akzeptanz: `prisma migrate status` meldet keine ausstehenden Migrations, und die
Tabelle `AuditEvent` existiert mit dem UPDATE/DELETE-Trigger.

### 0.4 Überholte Vorgaben entfernen

- [ ] `CLAUDE.md`: Abschnitt „Verbindliche Geschaeftsregeln" Punkt 2
      (Erfolgshonorar 14,1 %) ersetzen durch die Festpreisregel. Im Abschnitt
      „Was wir bauen" die Kanzlei durch `[KANZLEI]` ersetzen. Den Satz „Das alte
      Self-Submit-/Festpreis-Modell ist ueberholt — nicht zurueckbauen"
      streichen, er sagt jetzt das Gegenteil des Richtigen.
- [ ] `Code_Plan.md`: Honorarzeilen und Kanzleiname; außerdem die falsche
      Zuordnung „1454 = § 9a" korrigieren (1454 ist § 12a StromStV).
- [ ] `apps/web/src/config/brand.ts`: Kanzleiname und Anwalt auf Platzhalter.

Akzeptanz: `grep -ri "windorfer\|14,1\|erfolgshonorar" CLAUDE.md Code_Plan.md
apps/web/src/config/brand.ts` findet nichts.

## 1. MVP — Pflicht für Kunde Nummer eins

### 1.1 Schema erweitern

Datei: `packages/db/prisma/schema.prisma`

Heute hängen alle Firmendaten direkt am `Application`-Record, es gibt kein
Mandanten-Modell und damit keine Mehrjahres-Historie.

- [ ] Neues Modell `Mandant`:

```prisma
model Mandant {
  id                String   @id @default(cuid())
  firmenname        String
  rechtsform        String?
  geschaeftsfuehrer String?
  vorname           String?
  nachname          String?
  email             String?
  telefon           String?
  strasse           String?
  plz               String?
  ort               String?

  // Neu — für Formular 1453 Abschnitt 1 zwingend
  steuernummer      String?
  ustIdNr           String?
  handelsregister   String?   // HRB
  wzCode            String?   // Klassifikation der Wirtschaftszweige
  unternehmensnummer String?  // Zoll-Unternehmensnummer
  hauptzollamt      String?   // nach Geschäftssitz, NICHT nach Lieferstelle

  // Neu — Formular 1453 Abschnitt 4, ohne IBAN kein Antrag
  kontoinhaber      String?
  iban              String?
  bic               String?

  // § 2 Nr. 3 StromStG (Produzierendes Gewerbe) oder Nr. 5 (Land-/Forstwirtschaft)
  unternehmensart   Unternehmensart?

  antraege          Antrag[]
  portalZugang      PortalZugang?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum Unternehmensart {
  PRODUZIERENDES_GEWERBE
  LAND_FORSTWIRTSCHAFT
}
```

- [ ] `Application` in `Antrag` umbenennen, `mandantId` als Relation ergänzen,
      die oben nach `Mandant` gewanderten Felder entfernen. Neu am `Antrag`:

```prisma
  antragsjahr                    Int?
  entlastungsabschnitt           Entlastungsabschnitt @default(KALENDERJAHR)
  schaetzungNach17b              Boolean?  // Formular 1453 Punkt 5
  beschreibungTaetigkeitVorgelegt BeschreibungStatus?  // Punkt 2
  stromAnDritteGeleistet         Boolean?  // Punkt 6, erste Zeile
  nutzenergieAnDritteWeitergegeben Boolean? // Punkt 6, zweite Zeile
  entnahmeDurchDritten           Boolean?  // Punkt 7

  // Preis nach Preistabelle, eingefroren bei Vertragsschluss
  preisEur                       Decimal? @db.Decimal(12, 2)
  preisTabelleVersion            String?
  istFolgejahr                   Boolean  @default(false)

enum Entlastungsabschnitt { KALENDERJAHR HALBJAHR QUARTAL MONAT }
enum BeschreibungStatus { BEREITS_VORGELEGT LIEGT_BEI }
```

- [ ] `honorar` und `nettoAuszahlung` aus dem Schema entfernen, `bruttoErstattung`
      bleibt.
- [ ] `Lieferstelle`: `jahresKwh` ersetzen durch die drei Spalten aus Formular
      1453 Seite 2. Die Tabelle dort verlangt die Menge dreigeteilt, nicht als
      eine Zahl:

```prisma
  kwhEigenbetrieblich  Int   // Spalte 3: betriebliche Zwecke, ohne Sp. 4 und 5
  kwhNutzenergiePG     Int   @default(0)  // Spalte 4: Nutzenergie, genutzt von anderen Unternehmen des Produzierenden Gewerbes
  kwhNutzenergieLuF    Int   @default(0)  // Spalte 5: dito Land-/Forstwirtschaft
```

- [ ] Neues Modell `NutzenergieEmpfaenger` (Grundlage für Formular 1456 und die
      Zuordnungsaufstellung):

```prisma
model NutzenergieEmpfaenger {
  id            String  @id @default(cuid())
  antrag        Antrag  @relation(fields: [antragId], references: [id], onDelete: Cascade)
  antragId      String
  firmenname    String
  adresse       String
  kategorie     Unternehmensart
  mengeKwh      Int
  selbsterklaerungVorhanden Boolean @default(false)
  @@index([antragId])
}
```

- [ ] Migration erzeugen:
      `pnpm --filter @stromsteuer/db exec prisma migrate dev --name 3_mandant_bankverbindung_mengen`

Akzeptanz: `prisma validate` grün, Migration angewandt, `pnpm db:generate` läuft,
`pnpm typecheck` zeigt die erwarteten Folgefehler in den Routern (werden in 1.2
und 1.4 behoben).

**Nicht tun:** Keine Datenmigration alter Records erfinden — die Datenbank
enthält nur Testdaten. Bei Konflikten neu aufsetzen.

### 1.2 Berechnung und Preise trennen

Datei: `packages/api/src/calc/stromsteuer.ts` (heute 102 Zeilen)

Heute vermischt eine Funktion zwei Dinge: die gesetzliche Erstattung und das
Honorar. Das wird getrennt. Die Erstattungsberechnung ist korrekt und getestet —
ihre Logik bleibt inhaltlich unverändert.

- [ ] Neue Datei `packages/api/src/calc/rates.ts`:

```ts
export type EntlastungsSatz = {
  /** Erstes Verbrauchsjahr, für das dieser Satz gilt. */
  gueltigAbJahr: number;
  eurProMwh: number;
  selbstbehaltEur: number;
  quelle: string;
};

/** Absteigend nach gueltigAbJahr sortiert. */
export const ENTLASTUNGS_SAETZE: EntlastungsSatz[] = [
  {
    gueltigAbJahr: 2024,
    eurProMwh: 20.0,
    selbstbehaltEur: 250,
    quelle: "zoll.de, Steuerentlastung nach § 9b StromStG, abgerufen 2026-09-16",
  },
  {
    gueltigAbJahr: 2011,
    eurProMwh: 5.13,
    selbstbehaltEur: 250,
    quelle: "§ 9b Abs. 2 StromStG in der bis 2023 geltenden Fassung",
  },
];

export function satzFuer(verbrauchsjahr: number): EntlastungsSatz {
  const satz = ENTLASTUNGS_SAETZE.find((s) => verbrauchsjahr >= s.gueltigAbJahr);
  if (!satz) throw new Error(`Kein Entlastungssatz für ${verbrauchsjahr}`);
  return satz;
}
```

- [ ] `ENTLASTUNGSSATZ_EUR_PRO_KWH` und `SOCKEL_EUR` als Konstanten entfernen.
      `calculateErstattung` bekommt `verbrauchsjahr: number` in `CalcInput` und
      liest Satz und Selbstbehalt über `satzFuer()`.
- [ ] Rundung: Der Antrag wird in MWh gestellt, die Daten liegen in kWh.
      Festlegen und dokumentieren: kWh-Summe → MWh mit **drei Dezimalstellen**
      (1 kWh = 0,001 MWh, verlustfrei), Euro-Betrag danach auf 2 Stellen
      kaufmännisch. Nicht auf ganze MWh runden — das verschiebt bei 500 MWh
      bis zu 10 €.
- [ ] `HONORAR_QUOTE`, `HONORAR_FLOOR_EUR`, `honorar`, `honorarSatz`,
      `nettoAuszahlung` aus `stromsteuer.ts` und `CalcResult` entfernen.
- [ ] `MINDEST_KWH_WIRTSCHAFTLICH` von `40_000` auf `150_000` anheben. Der
      Kommentar nennt eine EnergyIQ-Schwelle — die ist irrelevant, neu begründen
      mit dem Preismodell: unter 150 MWh liegt der Preis effektiv über 25 % der
      Erstattung.

- [ ] Neue Datei `packages/api/src/calc/preise.ts`:

```ts
export type PreisBand = {
  vonMwh: number;
  /** null = offen nach oben */
  bisMwh: number | null;
  /** null = individuell zu verhandeln */
  preisEur: number | null;
};

export type PreisTabelle = {
  version: string;
  /** Ab diesem Vertragsschlussdatum gilt die Tabelle (ISO). */
  gueltigAb: string;
  baender: PreisBand[];
  /** Faktor für den zweiten und jeden weiteren Antrag desselben Mandanten. */
  folgejahrFaktor: number;
};

export const PREIS_TABELLEN: PreisTabelle[] = [
  {
    version: "2026-09",
    gueltigAb: "2026-09-27",
    folgejahrFaktor: 0.6,
    baender: [
      { vonMwh: 150,   bisMwh: 250,   preisEur: 690 },
      { vonMwh: 250,   bisMwh: 400,   preisEur: 1090 },
      { vonMwh: 400,   bisMwh: 600,   preisEur: 1590 },
      { vonMwh: 600,   bisMwh: 900,   preisEur: 2190 },
      { vonMwh: 900,   bisMwh: 1300,  preisEur: 2890 },
      { vonMwh: 1300,  bisMwh: 2000,  preisEur: 3790 },
      { vonMwh: 2000,  bisMwh: 3000,  preisEur: 4990 },
      { vonMwh: 3000,  bisMwh: null,  preisEur: null },
    ],
  },
];
```

Bandgrenzen sind unten einschließend, oben ausschließend: 250 MWh fällt in
`250–400`. `preisEur: null` bedeutet, dass die App keinen Preis anzeigt, sondern
auf ein individuelles Angebot verweist.

- [ ] `preisFuer(mwh, opts?: { istFolgejahr?: boolean; tabelleVersion?: string })`
      liefert `{ preisEur: number | null, version: string, band: PreisBand }`.
      Ohne `tabelleVersion` die neueste Tabelle; mit Version die historische,
      damit ein Altvertrag zu seinem Preis abgerechnet wird.

- [ ] Tests in `packages/api/src/calc/stromsteuer.test.ts` anpassen. Die
      Erstattungs-Assertions bleiben inhaltlich, die Honorar-Assertions werden
      ersetzt:
      - Zeile 19–21: `honorar` / `honorarSatz` / `nettoAuszahlung` entfernen,
        `bruttoErstattung` für 800.000 kWh muss weiterhin `16_000` sein.
      - Zeile 24–30 („Honorar-Floor greift"): durch einen Preistabellen-Test
        ersetzen.
      - Zeile 78–85 (Floor-Schwelle): löschen, es gibt keinen Floor mehr.
      - Zeile 96: `MINDEST_KWH_WIRTSCHAFTLICH` auf `150_000` anpassen.
- [ ] Neue Tests: Satzwechsel 2023 → 2024 (5,13 vs. 20,00), Bandgrenzen
      exakt bei 250 und 400 MWh, Folgejahresfaktor, `preisEur: null` über
      3.000 MWh, historische Tabellenversion.

Akzeptanz: `pnpm --filter @stromsteuer/api test` grün. `calculateErstattung`
enthält kein Wort „Honorar" mehr. Ein Antrag für Verbrauchsjahr 2023 rechnet mit
5,13 €/MWh.

**Nicht tun:** Keinen Preis je MWh einführen. Weil die Erstattung genau
20 €/MWh beträgt, wäre ein Betrag je MWh mathematisch ein fester Prozentsatz der
Erstattung — genau das, was rechtlich vermieden werden soll. Nur Bänder.

### 1.3 Aufrufer nachziehen

`honorar` und `nettoAuszahlung` stecken in 26 Dateien. Reihenfolge von unten
nach oben, damit `typecheck` als Wegweiser dient.

- [ ] `packages/api/src/index.ts` Zeile 10–16: Exporte anpassen, `rates` und
      `preise` mit aufnehmen.
- [ ] `packages/api/src/routers/application.ts` Zeilen 110–121, 152, 195–216,
      381–382, 523–524, 535–536: `honorar`/`nettoAuszahlung` durch `preisEur`
      und `preisTabelleVersion` ersetzen. `calculateErstattung` braucht jetzt
      `verbrauchsjahr`.
- [ ] `packages/api/src/routers/admin.ts` Zeile 53–54 (select) und 186
      (Statusmeldung „kein Honorar faellig").
- [ ] `packages/api/src/email/templates.ts` Zeilen 20–21, 33–34, 41, 58–59, 72:
      Tabellenzeile „Erfolgshonorar (nur bei Erfolg)" wird
      „Aufbereitungspauschale", „Voraussichtliche Auszahlung" wird „Erstattung".
- [ ] `packages/api/src/email/status-templates.ts` Zeile 48 (Abzug des
      Erfolgshonorars) und 79–84 (Ablehnung → „kein Honorar fällig"). Neuer
      Text: Der Preis ist unabhängig vom Bescheid fällig; bei Ablehnung prüft
      die Kanzlei einen Einspruch.
- [ ] `packages/api/src/forms/kanzleiPaket.ts` Zeile 87–88: Zeilen
      „Erfolgshonorar" und „Voraussichtliche Auszahlung" ersetzen.
- [ ] `packages/api/src/forms/legalTexts.ts` Zeile 52–53 und 81: Klausel
      `erfolgshonorar` entfernen, zwei neue Klauseln (siehe 1.4).
- [ ] `packages/api/src/forms/mandat.ts` Zeilen 37–38, 302–316, 355: Seite 3
      wird neu aufgebaut, siehe 1.4.
- [ ] `apps/web/src/components/landing/Calculator.tsx` Zeilen 31–37, 119–139:
      zeigt künftig Erstattung **und** Festpreis getrennt, nicht mehr
      `nettoAuszahlung`. Slider-Minimum folgt der neuen Schwelle 150.000 kWh.
- [ ] `apps/web/src/components/wizard/AnspruchKarte.tsx` Zeilen 2–3, 16, 29,
      48–72: Zeile „Erfolgshonorar (x %)" wird „Aufbereitungspauschale
      (Festpreis)". Import von `ENTLASTUNGSSATZ_EUR_PRO_KWH` und `SOCKEL_EUR`
      auf `satzFuer(antragsjahr)` umstellen.
- [ ] `apps/web/src/components/wizard/MandatForm.tsx` Zeilen 24–26, 110,
      355–359: Props `honorar`/`honorarSatz`/`nettoAuszahlung` → `preisEur`.
- [ ] `apps/web/src/app/(wizard)/antrag/schritt-3/vollmacht/page.tsx` Zeilen
      66–68.
- [ ] `apps/web/src/app/(wizard)/antrag/schritt-1/page.tsx` Zeile 53.
- [ ] `apps/web/src/app/admin/[id]/page.tsx` Zeilen 133–140,
      `apps/web/src/app/admin/eingang/page.tsx` Zeile 132.
- [ ] `apps/web/src/app/status/[token]/page.tsx` Zeilen 34–35 und 87
      („Erfolgshonorar-Vereinbarung").
- [ ] `apps/web/src/components/landing/WarumCards.tsx` Zeile 16 („Rein
      erfolgsbasiertes Honorar") — neuer Nutzen: Festpreis, vorab bekannt.
- [ ] `apps/web/src/lib/format.ts` Zeilen 42–48: `wochenKostenloserStrom`
      rechnet mit `nettoAuszahlung`; auf die Erstattung nach Selbstbehalt
      umstellen oder die Funktion entfernen, falls die Darstellung wegfällt.
- [ ] `apps/web/src/app/(marketing)/agb/page.tsx` Zeile 35–36: Erfolgshonorar
      nach § 4a RVG und Mindesthonorar streichen.
- [ ] `apps/web/src/components/wizard/LieferstelleCard.tsx` Zeile 432–434:
      Kommentar erwähnt den Honorar-Floor, anpassen.

`apps/web/src/config/antrag.ts` bleibt inhaltlich richtig und wird **nicht**
angefasst: `antragsfaehigeJahre()` gibt korrekt nur das Vorjahr zurück, weil der
Entlastungsabschnitt das abgeschlossene Kalenderjahr ist, und `fristDatum()`
bildet die Ausschlussfrist richtig ab. Nur der re-exportierte Schwellwert ändert
sich über `calc`.

Akzeptanz: `pnpm typecheck`, `pnpm lint`, `pnpm --filter @stromsteuer/api test`
grün. `grep -ri "erfolgshonorar\|nettoAuszahlung\|honorarSatz" apps packages`
(ohne node_modules) findet nichts.

### 1.4 Zwei getrennte Verträge

Heute erzeugt `forms/mandat.ts` ein Dokument, das Mandat und Honorar vermischt.
Rechtlich müssen es zwei Willenserklärungen sein.

- [ ] `packages/api/src/forms/aufbereitungsvertrag.ts` — unser Vertrag:
      Leistung ist Datenaufbereitung und Antragsvorbereitung, Festpreis nach
      Band, Preis vorab bekannt und unabhängig vom Bescheid fällig, kostenlose
      Vorprüfung vorab. **Keine Zusage eines Erstattungserfolgs.**
- [ ] `packages/api/src/forms/kanzleimandat.ts` — Mandat und Vollmacht für die
      Kanzlei. Enthält den Hinweis, dass nach Vollmachtserteilung im Zoll-Portal
      alle Bescheide ausschließlich in das Portal-Profil der Kanzlei gehen und
      nicht mehr beim Mandanten eingehen.
- [ ] `forms/legalTexts.ts`: Klausel `erfolgshonorar` entfernen, `festpreis` und
      `bescheidzustellung` ergänzen. `CONSENT_VERSION` hochziehen, weil sich der
      zugestimmte Wortlaut ändert — die bestehende Hash-Prüfung in
      `forms/verify.ts` und die Felder `consentVersion` / `consentTextSha256`
      bleiben unverändert in Gebrauch.
- [ ] Wizard Schritt 3: zwei getrennte Zustimmungen mit je eigener Checkbox und
      eigenem Signaturvorgang. Nicht ein Häkchen für beides.
- [ ] Schema: `mandatPdfKey` / `mandatPdfSha256` aufteilen in
      `aufbereitungPdfKey`/`-Sha256` und `kanzleimandatPdfKey`/`-Sha256`.

Akzeptanz: Nach Abschluss des Wizards liegen zwei PDFs im `generated`-Bucket,
beide mit Signatur und Hash im Audit-Log. Tests für `legalTexts` grün.

**Nicht tun:** Keine finalen Vertragstexte erfinden. Platzhalter mit
`[JURISTISCH ZU PRÜFEN]` markieren — die Texte kommen von der noch nicht
ausgewählten Kanzlei und sind Live-Blocker.

### 1.5 Vollständigkeits-Gate

Neues Paket `packages/antrag`, Aufbau analog zu `packages/api`
(`package.json`, `tsconfig.json` von `packages/config/tsconfig/library.json`,
Vitest-Config).

- [ ] `packages/antrag/src/complete.ts`:

```ts
export type FehlendesFeld = {
  /** Pfad im Datenmodell, z. B. "mandant.iban" */
  feld: string;
  /** Klartext für Kunde oder Kanzlei */
  label: string;
  quelle: "kunde" | "kanzlei" | "berechnet";
  /** Abschnitt in Formular 1453, für die Rückverfolgung */
  formularAbschnitt?: string;
};

export function pruefeVollstaendigkeit(antrag: AntragMitRelationen): FehlendesFeld[];
export function istEinreichbar(antrag: AntragMitRelationen): boolean;
```

Pflichtfelder mindestens: Firmenname, Anschrift, Rechtsform, Unternehmensart,
Steuernummer, Hauptzollamt, Kontoinhaber, IBAN, Antragsjahr, mindestens eine
Lieferstelle mit Menge, Beihilfe-Selbsterklärung vorhanden, beide Verträge
signiert, Portal-Vollmacht aktiv. Wenn `nutzenergieAnDritteWeitergegeben`, dann
zusätzlich mindestens ein `NutzenergieEmpfaenger` je Kategorie mit Menge und
vorliegender Selbsterklärung.

- [ ] Die Funktion wirft nicht, sondern gibt die Liste zurück. Der Aufrufer
      entscheidet über die Darstellung.
- [ ] `submit` in `routers/application.ts` ruft `istEinreichbar` und bricht mit
      der Liste ab, wenn sie nicht leer ist.

Akzeptanz: Tests mit Fixtures für Standardfall vollständig, IBAN fehlt,
Nutzenergie ohne Empfänger, Portal-Vollmacht fehlt. `submit` lässt einen
unvollständigen Antrag nicht durch.

**Nicht tun:** Keine zweite Prüfstelle anlegen. Wenn irgendwo im Wizard oder
Admin schon eine Teilvalidierung existiert, ruft sie diese Funktion auf, statt
eigene Regeln zu führen.

### 1.6 Antragsdatensatz und Vorprüfung

- [ ] `packages/antrag/src/datensatz.ts`: erzeugt aus einem `Antrag` eine flache
      Struktur in der Feldreihenfolge des Formulars 1453 (Abschnitt 1 bis 9,
      dann Tabelle Seite 2 mit Spalte 3/4/5, Gesamtsumme, Selbstbehalt, zu
      entlasten). Diese Reihenfolge ist später die Reihenfolge im
      Portal-Eingabeblatt.
- [ ] `forms/kanzleiPaket.ts` erweitern: Excel bekommt ein Blatt
      „Antragsdatensatz" aus dieser Struktur, plus ein Blatt „Fehlend" aus
      `pruefeVollstaendigkeit`.
- [ ] Vorprüfung mit Hardstop vor Vertragsschluss: keine der beiden
      Unternehmensarten → Abbruch; Erstattung unter Selbstbehalt → Abbruch;
      offene EU-Rückforderung (`triageKeineEuRueckforderung === false`) →
      Abbruch. In allen drei Fällen ohne Rechnung, mit Begründung im Klartext.

Akzeptanz: Für einen vollständigen Fixture-Antrag liefert `datensatz.ts` alle
Pflichtfelder gefüllt; das Kanzlei-Paket enthält beide neuen Blätter; ein
nicht-anspruchsberechtigter Fall erreicht den Vertragsschluss nicht.

## 2. Nach dem ersten Kunden

### 2.1 Portal-Onboarding

Vollständige Spezifikation inklusive Textvorlagen in
`docs/20-vollmachts-onboarding.md`. Der Ablauf im Zoll-Portal ist dort verifiziert.

- [ ] `PortalZugang`-Modell am Mandanten:

```prisma
model PortalZugang {
  id                      String   @id @default(cuid())
  mandant                 Mandant  @relation(fields: [mandantId], references: [id], onDelete: Cascade)
  mandantId               String   @unique
  elsterStatus            ElsterStatus    @default(UNBEKANNT)
  portalKontoStatus       PortalKontoStatus @default(OFFEN)
  vollmachtStatus         VollmachtStatus @default(OFFEN)
  beteiligtenNummer       String?
  zugangscodeEingeloestAt DateTime?
  scopeGeprueftAt         DateTime?
  scopeGeprueftVon        String?
  bescheidZustellungAktiv Boolean  @default(false)
  eskalationsstufe        Int      @default(0)
  letzteErinnerungAt      DateTime?
  notizen                 String?
}

enum ElsterStatus { UNBEKANNT VORHANDEN BEIM_STB FEHLT BEANTRAGT }
enum PortalKontoStatus { OFFEN REGISTRIERT }
enum VollmachtStatus { OFFEN ERTEILT CODE_EINGELOEST AKTIV ABGELAUFEN SCOPE_FALSCH }
```

- [ ] Kundenseite unter `/status/<token>`: fünf Schritte mit Screenshot des
      echten Portal-Bildschirms, Direktlink, Zeitschätzung, Haken. Der Wortlaut
      der zu wählenden Dienstleistung — **„Sonstige steuerliche Anträge"** —
      hervorgehoben. Die Vollmacht gilt pro Dienstleistung; bei falscher Wahl
      kann die Kanzlei nicht einreichen, und das Portal meldet keinen Fehler.
- [ ] Zwei parallele Fortschrittsspuren (Daten / Portal-Zugang), damit der Kunde
      sieht, dass nur der Zugang fehlt. Die Spuren sind unabhängig — nicht
      seriell verketten, sonst bricht die Postlaufzeit des
      ELSTER-Aktivierungscodes den Trichter.
- [ ] Formular für Zugangscode und Beteiligten-Nummer auf dieser Seite. Nicht per
      E-Mail einsammeln, Code nach dem Einlösen nicht speichern.
- [ ] Scope-Prüfung durch die Kanzlei nach dem Einlösen, bevor der Kunde
      „fertig" sieht.
- [ ] Erinnerungs-Cron (Tag 2, 5, 10, 14) analog `api/cron/expire`, mit
      `CRON_SECRET`. Wartezustand `FEHLT`/`BEANTRAGT` pausiert die Zählung,
      `BEIM_STB` nicht.
- [ ] Stichtagsregel: ab dem 10.11. ohne ELSTER-Zertifikat, ab dem 24.11. mit
      Zertifikat werden Neukunden auf das nächste Verbrauchsjahr gelenkt statt
      auf das laufende. Rückrechnung in `docs/20-vollmachts-onboarding.md`.

### 2.2 Backoffice

- [ ] Portal-Eingabeblatt unter `/admin/<id>/portal`: Felder in der Reihenfolge
      aus `datensatz.ts`, je Feld ein Kopieren-Knopf, Abhaken pro Feld,
      Belegvorschau daneben.
- [ ] Prüfprotokoll: je Wert die Herkunft (OCR, Kunde, berechnet) mit
      OCR-Konfidenz, damit der Anwalt weiß, wo er hinschauen muss.
- [ ] Statuswechsel „im Portal eingereicht" mit Eingangsnummer, als
      `AuditEvent`.
- [ ] Rückmeldeweg für den Bescheid mit der Kanzlei abstimmen — Status,
      Folgejahres-Erinnerung und Rechnungsstellung hängen daran. Die Bescheide
      gehen in ihr Portal-Profil, nicht in unser System.

### 2.3 Folgejahre

- [ ] Vorjahres-Kopie: Stammdaten, Lieferstellen und Portal-Vollmacht
      übernehmen, nur Verbrauch und Beihilfe-Selbsterklärung neu abfragen.
      `istFolgejahr = true` setzen, damit `preisFuer` den Faktor anwendet.
- [ ] Januar-Erinnerung an Bestandskunden als Cron.

### 2.4 Aus der alten Liste übernommen

- [ ] Dokumentenstatus pro Beleg — heute nur `belegFileKeys[]` ohne Metadaten.
- [ ] Kontakthistorie am Mandanten — heute nur der technische Audit-Trail.
- [ ] UI-Kit ist unverändertes shadcn-Skelett, Theme in
      `apps/web/src/app/globals.css` und `packages/config/tailwind/index.js` ist
      Default-Grau; Landing-Komponenten nutzen Ad-hoc-Farben wie `text-blue-700`.
      Eigene Markenfarbe fehlt.
- [ ] Kein `public/` in `apps/web` — kein Logo, kein Favicon.
- [ ] `components/landing/PartnerStrip.tsx` Zeile 5–6: Logos sind Text-Stubs.
- [ ] Landingpage hat keinen Footer und kein FAQ.
- [ ] Die zwei getrennten Rechnungen offen auf Website und im Angebot erklären.
      Ein Kunde, der die zweite Rechnung nicht erwartet, fühlt sich getäuscht,
      auch wenn alles korrekt war.
- [ ] Rechtliche Platzhalter in Impressum, AGB, Datenschutz sowie in
      `MandatForm.tsx`, `FirmaForm.tsx`, `TriageCard.tsx`, `StatusActions.tsx`.
- [ ] Sentry (`@sentry/nextjs` + DSN), Rate-Limiting instanzübergreifend über
      Upstash statt In-Memory — beides optional.

## 3. Live-Blocker

- [ ] Finale Vertragstexte von der noch zu wählenden Kanzlei.
- [ ] Supabase-Bucket `belege` privat + RLS. Stromrechnungen sind
      personenbezogene Daten.
- [ ] `ADMIN_PASSWORD` und `CRON_SECRET` in Produktion setzen.
- [ ] Echte Kontaktadresse statt `info@example.de` in `config/brand.ts`.
- [ ] Ein vollständiger Testfall End-to-End, von der Kanzlei geprüft, bevor ein
      echter Antrag eingereicht wird.

## 4. Nicht selbst bauen

- Rechnungsstellung über Lexoffice oder sevdesk anbinden, keine eigene
  Buchhaltung.
- Terminbuchung für die geführten Onboarding-Termine über Cal.com.
- OCR bleibt AWS Textract mit manuellem Fallback. Der Parser in
  `packages/api/src/ocr/parser.ts` wurde im Juli überarbeitet (MWh-Erkennung,
  Keyword-Scoring) und funktioniert — nicht ersetzen.
- E-Mail bleibt Resend mit Console-Fallback.
- Kein Stripe, kein Auth.js, kein ELSTER-XML.

## 5. Extern blockiert — nicht vorher bauen

Service Desk Zoll, 0800 8007-5452, Mo–Fr 8–17 Uhr:

- [ ] Gibt es eine Vertreter- oder Massendatenschnittstelle für § 9b-Anträge?
- [ ] Erfasst das Portal die Beihilfe-Selbsterklärung 1139 als Datensatz, oder
      wird sie als PDF-Upload verlangt? **Davon hängt ab, ob ein
      Koordinaten-Overlay für 1139 gebraucht wird. Vorher nicht bauen.** Die
      PDFs haben keine Formularfelder (geprüft: keine AcroForm, kein XFA), ein
      Befüllen wäre nur über Koordinaten möglich und bricht bei jeder
      Layout-Änderung.
- [ ] Zählt „Entlastung Energie/Strom für Unternehmen" zu den Dienstleistungen,
      bei denen eine gesonderte Bevollmächtigung genügt und nur der Vertreter
      ein Portal-Konto braucht? Falls ja, entfällt für den Kunden die eigene
      Registrierung und Abschnitt 2.1 schrumpft drastisch.
- [ ] Wie lange ist der Zugangscode gültig?

Anwalt:

- [ ] Geht die Verbrauchsstaffel als aufwandsbezogener Werklohn durch, oder gilt
      sie als verdecktes Erfolgshonorar? Zentrale Frage für das ganze
      Preismodell.
- [ ] Grenzt die kostenlose Vorprüfung mit anschließend festem Preis sauber ab?
- [ ] Formulierung der Leistungsbeschreibung im Aufbereitungsvertrag.
- [ ] Ist die Empfehlung der Kanzlei unbedenklich, solange in keine Richtung Geld
      für die Zuführung fließt?

## Formularsatz zur Orientierung

| Nr. | Inhalt | Rolle |
|---|---|---|
| 1453 | Hauptantrag § 9b StromStG | Kerngeschäft, Spezifikation des Datenmodells |
| 1139 / 1139a | Selbsterklärung zu staatlichen Beihilfen | Pflichtanlage je Kalenderjahr |
| 1456 | Selbsterklärung des Nutzers von Nutzenergie | je drittem Unternehmen |
| 1402 | Beschreibung der wirtschaftlichen Tätigkeiten | Vorlagepflicht entfallen |
| 1452 | Antrag § 9a StromStG | anderer Tatbestand, nicht Kerngeschäft |
| 1454 | Strom zur Stromerzeugung, § 12a StromStV | in Code_Plan.md falsch § 9a zugeordnet |
| 1115 | § 51 EnergieStG | Energiesteuer, andere Steuer, evtl. Zusatzprodukt |
| 1462 / 1463 / 1464 | EnSTransV | ab 200.000 € Entlastung im Kalenderjahr, bis 30.06. |
