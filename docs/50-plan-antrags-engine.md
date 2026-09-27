# Plan — Antrags-Engine für die Stromsteuer-App

> [!info] Stand 16.09.2026 — ersetzt die Fassung vom 15.09.2026
> Grundlage: Ist-Stand `C:\dev\stromsteuer-app` (gelesen 15.09.2026), die zehn
> Zoll-Formulare + Formular 1453 (hochgeladen 15./16.09.2026), Recherche zur
> Onlineverpflichtung und zum Entlastungssatz.
> Entscheidung aus dem Gespräch: **Die Partnerkanzlei reicht als Bevollmächtigte
> im Zoll-Portal ein.**
> Tags: #code/plan #status/vorschlag

---

## Teil I — Was die Formulare und die Recherche ergeben haben

### Befund 1 (kritisch): Dein 1453 trägt den falschen Entlastungssatz

In der Berechnungstabelle auf Seite 2 deines 1453 steht als Entlastungssatz
**5,13 € je MWh**. Nach Auskunft der Zollverwaltung gilt seit 2024 ein Satz von
**20,00 € je MWh**; 5,13 € war der Satz bis einschließlich 2023.

Das heißt: Entweder ist deine PDF-Fassung veraltet, oder der Vordruck ist an
dieser Stelle nicht nachgeführt. In beiden Fällen gilt dieselbe Konsequenz —
**der Satz darf niemals aus dem Formular übernommen werden.** Hätte jemand das
Formular so befüllt, hätte jeder Mandant rund ein Viertel der ihm zustehenden
Erstattung beantragt. Bei 800 MWh wären das 4.104 € statt 16.000 €.

Deine Rechen-Engine ist richtig: `ENTLASTUNGSSATZ_EUR_PRO_KWH = 0.02` entspricht
20,00 €/MWh, und der 250-€-Selbstbehalt stimmt ebenfalls. Der Test-Kommentar in
`calc/stromsteuer.ts` rechnet sauber durch (800.000 kWh → 13.529,25 €
Auszahlung). Behalte die Engine, wirf das Formular als Zahlenquelle weg.

Daraus folgt eine Konstruktionsregel, die weiter unten wiederkehrt: **Sätze,
Schwellen und Fristen gehören in eine datierte Tabelle mit Quellenangabe, nicht
in eine Konstante und erst recht nicht in ein Formular-Template.**

### Befund 2: Keines der elf PDFs ist ausfüllbar

Ich habe alle geprüft — null Formularfelder, keine AcroForm, kein XFA. Die 118
bis 260 „Annotations" pro Datei sind ausschließlich Hyperlinks. Das sind
Ansichts- und Druckfassungen aus dem Formular-Management-System der
Bundesfinanzverwaltung, nicht die interaktiven Vordrucke.

Programmatisch befüllen ließe sich so ein PDF nur über ein
Koordinaten-Overlay — Text an feste x/y-Positionen schreiben. Das bricht bei
jeder Layout-Änderung des Zolls, und zwar lautlos.

### Befund 3: § 9b ist seit dem 01.01.2025 online-pflichtig

Anträge nach § 9b StromStG müssen elektronisch über das Zoll-Portal gestellt
werden; Zugang über ein ELSTER-Unternehmenskonto. Papier ist für diesen
Tatbestand nicht mehr vorgesehen.

Das dreht die Aufgabenstellung um: Der abzugebende Antrag ist eine
**strukturierte Eingabe im Portal**, kein hochgeladenes PDF. Ein perfekt
ausgefülltes 1453 wäre also Arbeit an einem Artefakt, das gar nicht eingereicht
wird. Das Formular bleibt trotzdem wertvoll — als **Spezifikation**, welche
Angaben der Antrag verlangt.

### Befund 4: Formular 1402 ist entfallen

Die Vorlagepflicht für die Beschreibung der wirtschaftlichen Tätigkeiten ist für
Anträge ab dem 01.01.2025 weggefallen; sie wird nur noch auf Verlangen des
Hauptzollamts angefordert. Ein Wizard-Schritt weniger — aber die Angaben
solltest du trotzdem erheben und vorhalten, weil das HZA sie nachfordern kann.

### Befund 5: Die Frist ist scharf, und sie ist ein Vertriebsargument

Die Anleitung zu 1453 nennt eine **Ausschlussfrist zum 31. Dezember des Jahres,
das auf das Entnahmejahr folgt**. Heute ist der 16.09.2026. Damit gilt:

| Entnahmejahr | Frist | Status heute |
|---|---|---|
| 2024 | 31.12.2025 | **abgelaufen** |
| 2025 | 31.12.2026 | offen — noch rund 15 Wochen |
| 2026 | 31.12.2027 | offen |

Es gibt also derzeit genau zwei beantragbare Jahre, und für das umsatzstärkere
läuft die Uhr. Ein rückwirkendes Aufrollen mehrerer Jahre, wie es das
Geschäftsmodell an einer Stelle andeutet, ist nicht möglich. Das gehört sowohl
ins Marketing (Dringlichkeit) als auch in die App (Jahr 2024 gar nicht erst
anbieten).

### Befund 6: Die Mengen werden dreigeteilt — das fehlt in deinem Datenmodell

Die Tabelle auf Seite 2 des 1453 verlangt die Strommenge nicht als eine Zahl,
sondern aufgeteilt auf drei Spalten:

- **Spalte 3** — für betriebliche Zwecke entnommen, ohne die Mengen der Spalten
  4 und 5. Nutzenergie nur, soweit im **eigenen** Unternehmen genutzt.
- **Spalte 4** — Strom zur Erzeugung von Licht, Wärme, Kälte, mechanischer
  Energie, Druckluft, soweit diese Erzeugnisse von **anderen Unternehmen des
  Produzierenden Gewerbes** genutzt wurden.
- **Spalte 5** — dasselbe für **andere Unternehmen der Land- und
  Forstwirtschaft**.

Dein Prisma-Schema kennt pro `Lieferstelle` genau ein `jahresKwh`. Die
Dreiteilung existiert nicht. Solange kein Mandant Nutzenergie an Dritte abgibt,
fällt alles in Spalte 3 und niemand merkt etwas — beim ersten Fall mit
Wärmeabgabe an ein Nachbarunternehmen wird der Antrag falsch.

Und: Die Tabelle rechnet in **Megawattstunden**, deine Daten sind in kWh. Wo
gerundet wird, verschiebt sich der Erstattungsbetrag. Die Rundungsregel gehört
festgelegt und getestet, nicht dem Zufall überlassen.

### Befund 7: Die weiteren Felder des 1453 im Überblick

Als Spezifikation gelesen verlangt der Antrag:

| Abschnitt | Inhalt | Quelle im heutigen System |
|---|---|---|
| 1 | Anmelder: Name, Anschrift, E-Mail, **Rechtsform** | vorhanden |
| 1 | Zuständiges **Hauptzollamt** | fehlt (nur Freitext an Lieferstelle) |
| 1 | Antragsteller ist Produzierendes Gewerbe (§ 2 Nr. 3) **oder** Land-/Forstwirtschaft (§ 2 Nr. 5) | implizit über Branche |
| 1 | **Zeitraum** (Entlastungsabschnitt) | nur `antragsjahr` |
| 2 | Beschreibung wirtschaftl. Tätigkeit: bereits vorgelegt / liegt bei | fehlt |
| 4 | **Bankverbindung**: Kontoinhaber, IBAN, BIC | **fehlt komplett** |
| 5 | Schätzung nach § 17b Abs. 5 StromStV in Anspruch genommen | fehlt |
| 6 | Strom an Dritte geleistet / Nutzenergie an Dritte weitergegeben | teilweise (`triageEnergieAnDritte`) |
| 7 | Strom wird durch einen Dritten (kleinste rechtl. Einheit) entnommen — Ja/Nein | `triageKleinsteRechtsperson` |
| 8 | Versicherung, Ort, Datum, Unterschrift | Signatur vorhanden |
| 9 | Anlagen: Stromrechnungen, Zuordnungsaufstellung, **Anzahl** Selbsterklärungen, 1139, 1402, Sonstiges | Belege vorhanden, Rest fehlt |
| S. 2 | Mengen Spalte 3/4/5, Gesamtsumme, Selbstbehalt, zu entlasten, **Betrag in Buchstaben** | nur eine Menge |

Die auffälligste Lücke ist die **Bankverbindung**. Ohne IBAN kein Antrag — und
im Schema steht dazu nichts.

Dazu kommen die Pflicht-Anlagen: **1139** (Selbsterklärung zu staatlichen
Beihilfen) ist für den ersten Entlastungsabschnitt jedes Kalenderjahres
vorzulegen. **1456** (Selbsterklärung des Nutzers von Nutzenergie) wird je
drittem Unternehmen fällig, wenn Nutzenergie abgegeben wird — plus eine
Aufstellung, die die Mengen den Unternehmen zuordnet. **EnSTransV** (1462/1463)
greift ab 200.000 € Entlastung im Kalenderjahr, jährlich bis 30. Juni, über ein
eigenes Portal. Das betrifft erst Mandanten ab 10 Mio. kWh — für dich vorerst
eine Randnotiz, aber eine, die du kennen solltest, bevor ein Großkunde fragt.

---

## Teil II — Optionen

Vier Entscheidungen sind unabhängig voneinander zu treffen. Ich stelle sie
jeweils mit Aufwand und Risiko dar und gebe am Ende eine Empfehlung.

### Entscheidung A — Wie kommen die Daten ins Zoll-Portal?

**A1 — Kanzlei-Eingabeblatt (manuelle Übertragung)**
Die App erzeugt ein Dokument, das exakt der Feldreihenfolge des Portals folgt.
Die Kanzlei tippt ab.
*Aufwand: gering. Risiko: gering. Skaliert bis ~30 Anträge/Monat.*
Nachteil: Tippfehler beim Übertragen, und die Kanzlei-Zeit ist dein
Engpass — bei Erfolgshonorar zahlst am Ende du dafür.

**A2 — Copy-Paste-optimiertes Übergabeblatt**
Wie A1, aber als Web-Ansicht im Backoffice: jedes Feld mit
Kopieren-Knopf, in Portal-Reihenfolge, mit Fortschrittshaken. Die Kanzlei
arbeitet zwei Fenster nebeneinander ab.
*Aufwand: 2–3 Tage zusätzlich zu A1. Risiko: gering.*
Das ist der beste Ertrag pro investiertem Tag im ganzen Plan. Kein
Tippfehler mehr, und die Bearbeitungszeit pro Antrag sinkt spürbar.

**A3 — Browser-Assistent mit Autofill**
Ein Browser-Plugin oder Bookmarklet füllt die Portal-Felder direkt.
*Aufwand: hoch. Risiko: hoch.*
Rechtlich heikel, weil die Grenze zwischen „Werkzeug" und „Vertretung"
verschwimmt, und technisch fragil, weil das Portal sich ändert. Der
Absende-Klick müsste zwingend beim Menschen bleiben. Würde ich nicht vor
dem hundertsten Antrag anfassen.

**A4 — Offizielle Schnittstelle prüfen**
Klären, ob der Zoll eine Massendaten- oder Vertreter-Schnittstelle anbietet.
*Aufwand: ein Telefonat mit dem Service Desk (0800 8007-5452).*
Sollte vor allem anderen passieren — wenn es sie gibt, ändert das alles;
wenn nicht, weißt du es für 20 Minuten Aufwand.

### Entscheidung B — Was tut die App mit den PDF-Formularen?

**B1 — Gar nichts.** Nur strukturierte Daten, Belege, Prüfprotokoll.
*Am schnellsten. Lässt die Kanzlei allein, wenn das Portal ein
unterschriebenes 1139 als Upload verlangt.*

**B2 — Koordinaten-Overlay auf die Original-PDFs.**
Nur für die Selbsterklärungen, die als Upload gebraucht werden (1139, bei
Bedarf 1456), nie für 1453 selbst.
*Aufwand: 1–2 Tage pro Formular, plus Pflege bei jeder neuen Fassung.*
Vertretbar für zwei Formulare, nicht für elf.

**B3 — Eigene Dokumente im eigenen Layout.**
Statt das Zoll-PDF zu imitieren, ein sauberes eigenes Dokument mit allen
verlangten Angaben und Erklärungen.
*Robust, aber nur brauchbar, wo kein amtlich vorgeschriebener Vordruck
gefordert ist.* Für 1139 gilt „nach amtlich vorgeschriebenem Vordruck" —
da geht es nicht.

**B4 — Hybrid.** B1 als Kern, B2 für 1139 und 1456, B3 für alles
Interne (Prüfprotokoll, Mandats-PDF, Zuordnungsaufstellung).

### Entscheidung C — Wie tief geht die Datenerfassung beim Kunden?

**C1 — Schlank (heutiger Wizard plus die Lücken).**
Firma, Lieferstellen, Triage, Bankverbindung, Mandat. Alles, was selten
vorkommt, klärt die Kanzlei per Rückfrage.
*Schnellster Weg zum ersten Kunden. Erzeugt Kanzlei-Rückfragen bei
komplexen Fällen.*

**C2 — Vollständig (jedes Formularfeld hat eine Wizard-Quelle).**
Auch Nutzenergie-Abgabe, Drittmengen, Schätzung nach § 17b Abs. 5.
*Der Antrag ist ohne Rückfrage vollständig. Der Wizard wird länger, die
Abbruchquote steigt.*

**C3 — Adaptiv.** Standardfall bleibt kurz; die Zusatzfragen erscheinen
nur, wenn die Triage sie auslöst (Nutzenergie an Dritte → Spalte 4/5,
1456, Zuordnungsaufstellung).
*Mehr Logik, aber genau dafür ist die Triage schon gebaut.*

### Entscheidung D — Wo entsteht der Code?

**D1 — Chirurgisch im bestehenden Monorepo.** Neues Package
`packages/antrag`, der Rest bleibt.
*2–3 Wochen bis zum ersten echten Antrag.*

**D2 — Neues Package plus schrittweiser Umbau des Datenmodells.**
Wie D1, zusätzlich `Mandant` als eigene Entität, `Application` → `Antrag`
mit Mehrjahres-Historie.
*4–5 Wochen, dafür trägt das Modell Folgejahre und Wiederholungskunden.*

**D3 — Rewrite auf der grünen Wiese.**
*6–10 Wochen, löst keines der sieben Befunde oben, wirft getestete
Berechnung und reparierten OCR-Parser weg.* Ich rate weiterhin ab.

---

## Teil III — Empfehlung

**A2 + B4 + C3 + D2**, in dieser Reihenfolge gebaut:

Zuerst A4 abtelefonieren (20 Minuten, kann alles ändern). Dann D2 als Fundament,
weil die Bankverbindung und die Spalten 3/4/5 ohnehin ins Schema müssen und ein
zweiter Schema-Umbau später teurer wird als einer jetzt. Darauf A2, weil es die
Kanzlei-Zeit senkt, die dein eigentlicher Engpass ist. B2 für 1139 erst, wenn
geklärt ist, ob das Portal es als Upload verlangt. C3 wächst mit den Fällen, die
tatsächlich auftreten.

---

## Teil IV — Phasen

### Phase 0 — Aufräumen und klären (2–3 Tage)

- [ ] Service Desk Zoll anrufen: Gibt es eine Vertreter-/Massenschnittstelle für
      § 9b-Anträge? Wird 1139 im Portal als Datensatz erfasst oder als Upload
      verlangt? Kann die Kanzlei als Bevollmächtigte für fremde
      Unternehmensnummern einreichen?
- [ ] Mit der Kanzlei: Welches ELSTER-Unternehmenskonto, welche Vollmachtsform
      verlangt das Portal, und wie sieht deren Prüfschritt heute aus?
- [ ] Aktuelle Fassung aller Vordrucke frisch aus dem Formularcenter ziehen und
      mit Datum und Prüfsumme ablegen. Dein 1453 ist als Zahlenquelle
      verbrannt.
- [ ] Uncommitted Stand aus Juli in kleinen Commits sichern.
- [ ] Migrations auf die Supabase-DB anwenden.
- [ ] `Code_Plan.md` korrigieren: 1454 ist § 12a StromStV, nicht § 9a.

### Phase 1 — Datenmodell (4–6 Tage)

- [ ] `Mandant` einführen, 1:n zu `Antrag`. Firmendaten wandern dorthin.
      Zusätzlich Steuernummer, USt-IdNr., HRB, WZ-Code, Unternehmensnummer,
      zuständiges Hauptzollamt.
- [ ] **Bankverbindung** (Kontoinhaber, IBAN, BIC) — am Mandanten, mit
      IBAN-Prüfziffernvalidierung.
- [ ] `Lieferstelle`: `jahresKwh` ersetzen durch `kwhEigenbetrieblich`,
      `kwhNutzenergiePG`, `kwhNutzenergieLuF` (Spalten 3/4/5).
- [ ] `Antrag`: `entlastungsabschnitt` (Jahr/Halbjahr/Quartal/Monat),
      `schaetzungNach17b`, `beschreibungTaetigkeitVorgelegt`.
- [ ] `NutzenergieEmpfaenger` als eigene Tabelle (Name, Anschrift, Menge,
      Kategorie PG/LuF) — Grundlage für 1456 und die Zuordnungsaufstellung.
- [ ] Antragsjahre aus der Ausschlussfrist ableiten, nicht hart kodieren.

### Phase 2 — Sätze und Regeln als Daten (2 Tage)

- [ ] `rates.ts`: datierte Tabelle statt Konstante.
      `{ gueltigAb: "2024-01-01", entlastungEurProMwh: 20.00, quelle: "..." }`,
      dazu der Selbstbehalt und die Regelsteuersatz-Referenz.
- [ ] `calc` auf die Tabelle umstellen, Antragsjahr als Parameter. Die
      bestehenden Tests müssen unverändert grün bleiben.
- [ ] Rundungsregel kWh → MWh festlegen und testen.
- [ ] Fristenlogik: welche Entnahmejahre sind heute noch beantragbar.

### Phase 3 — Antragsdaten-Erzeugung (5–7 Tage)

- [ ] `packages/antrag`: aus einem `Antrag` einen geprüften, vollständigen
      Antragsdatensatz erzeugen — eine Struktur, die 1:1 der Feldreihenfolge
      des Portals folgt.
- [ ] `complete.ts`: **ein einziges** Vollständigkeits-Gate. Blockt den Submit
      und benennt jedes fehlende Pflichtfeld im Klartext.
- [ ] Zuordnungsaufstellung erzeugen, wenn Nutzenergie an Dritte geht.
- [ ] Kanzlei-Paket erweitern: Antragsdaten + Belege + Mandat + Prüfprotokoll.

### Phase 4 — Backoffice-Übergabe (3–4 Tage)

- [ ] Portal-Eingabeblatt im Admin: Felder in Portal-Reihenfolge, je Feld ein
      Kopieren-Knopf, Abhaken pro Feld, Beleg-Vorschau daneben.
- [ ] Prüfprotokoll: welche Werte kamen aus OCR, welche vom Kunden, welche
      berechnet — damit der Anwalt weiß, wo er hinschauen muss.
- [ ] Statuswechsel „im Portal eingereicht" mit Eingangsnummer, in den
      Audit-Trail.

### Phase 5 — Live-Blocker (parallel)

- [ ] Finale Mandatstexte von der Kanzlei.
- [ ] Bucket `belege` privat + RLS.
- [ ] `ADMIN_PASSWORD`, `CRON_SECRET` in Produktion.
- [ ] Impressum, AGB, Datenschutz, echte Kontaktadresse.
- [ ] Ein vollständiger Testfall, von der Kanzlei geprüft, vor dem ersten
      echten Mandanten.

---

## Teil V — Was das Ding robust macht

**Sätze sind Daten mit Gültigkeitsdatum und Quelle.** Befund 1 ist der Beweis:
Eine amtliche Primärquelle trug einen Satz, der um Faktor vier falsch war. Wenn
der Satz in einer datierten Tabelle mit Quellenlink steht, fällt so etwas beim
Nachschlagen auf statt beim Bescheid.

**Ein Gate, nicht drei Prüfungen.** Genau eine Funktion entscheidet, ob ein
Antrag einreichbar ist. Jede zweite Prüfstelle läuft irgendwann auseinander.

**Golden-File-Tests auf Werten, nicht auf Bytes.** Fixture-Fall rein,
Antragsdatensatz raus, gegen erwartetes JSON prüfen. Mindestens: Standardfall
einstandort, Mehrstandort, Nutzenergie an Dritte, knapp über dem Selbstbehalt,
knapp darunter.

**Prüfsummen auf allen Vordrucken.** Ändert der Zoll eine Datei, schlägt ein
Test fehl und erzwingt eine bewusste Prüfung. Im Antrag mitspeichern, welche
Fassung galt.

**Das Zwei-Augen-Prinzip bleibt hart.** Die Software bereitet vor, die Kanzlei
reicht ein. Der Absende-Vorgang im Portal ist und bleibt ein menschlicher Klick —
daran hängt die gesamte rechtliche Konstruktion.

**Jede HZA-Rückfrage wird ein Testfall.** Nach zehn Anträgen kennst du die
typischen Beanstandungen und fängst sie vorher ab.

---

## Teil VI — Offene Punkte

1. Erfasst das Portal 1139 als Datensatz oder verlangt es einen Upload? Davon
   hängt ab, ob B2 überhaupt gebraucht wird.
2. Wie weist die Kanzlei die Bevollmächtigung im Portal nach, und passt euer
   Mandatstext dazu?
3. Unterjährige Entlastungsabschnitte anbieten oder bewusst nur das
   Kalenderjahr? Die Anleitung lässt Halbjahr, Quartal und auf Antrag Monat zu,
   aber nur wenn der Betrag schon im ersten Abschnitt über 250 € liegt — und
   Folgeanträge sind dann auf dieselbe Taktung festgelegt.
4. Wie wird das zuständige Hauptzollamt bestimmt? Laut Anleitung nach Geschäfts-
   oder Wohnsitz des Antragstellers, nicht nach Standort der Lieferstelle. Das
   vereinfacht die Ableitung gegenüber dem heutigen Feld an der Lieferstelle.
5. EnSTransV ab 200.000 € Entlastung — Teil eures Leistungsversprechens oder
   ausdrücklich ausgenommen? Gehört in die AGB, bevor der erste Großkunde kommt.

---

## Quellen

- Formular 1453 (Fassung 07/2025), Seiten 1–4, inkl. Anleitung — vom Nutzer
  bereitgestellt
- Zoll: Steuerentlastung nach § 9b StromStG (Entlastungssatz 20,00 €/MWh ab
  2024, Selbstbehalt 250 €, Frist)
  https://www.zoll.de/DE/Fachthemen/Steuern/Verbrauchsteuern/Strom/Steuerbeguenstigung/Steuerentlastungen/Steuerentlastung-nach-Par-9b-StromStG/steuerentlastung-nach-par-9b-stromstg.html
- IHK Braunschweig: Onlinepflicht für Anträge nach § 9b StromStG und § 54
  EnergieStG ab 01.01.2025, Wegfall der Vorlagepflicht für 1402
  https://www.ihk.de/braunschweig/beratung-und-service/umwelt-und-energie/energie/energiepolitik/onlinepflicht-fuer-antraege-nach-9b-stromstg-und-54-energiestg-6398382
- Zoll-Portal Hilfe: Entlastung Energie/Strom für Unternehmen
  https://www.help.zoll-portal.de/DE/Hilfe/Dienstleistungen/entlastung-energie-strom-unternehmen/entlastung-energie-strom-unternehmen.html
