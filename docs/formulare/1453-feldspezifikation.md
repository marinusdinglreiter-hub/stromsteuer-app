# Formular 1453 — Feldspezifikation

Antrag auf Steuerentlastung für Unternehmen nach § 9b StromStG.
Ausgelesen aus der Fassung 07/2025, vier Seiten (Seite 1–2 Antrag, Seite 3–4
Anleitung).

**Dieses Formular ist die Spezifikation des Datenmodells.** Jedes Pflichtfeld
hier braucht eine Quelle im System: Wizard-Eingabe, aus Beleg/OCR, berechnet
oder von der Kanzlei nachgetragen. Eine fünfte Kategorie gibt es nicht.

## Zwei Warnungen

**Der abgedruckte Entlastungssatz ist falsch.** In der Tabelle auf Seite 2 steht
`5,13` €/MWh. Gültig sind seit 2024 **20,00 €/MWh**. Sätze kommen aus
`packages/api/src/calc/rates.ts`, niemals aus dem Formular.

**Das PDF ist nicht ausfüllbar.** Geprüft: keine AcroForm, kein XFA, null
Formularfelder. Die vorhandenen Annotationen sind reine Hyperlinks. Ein
programmatisches Befüllen wäre nur über Koordinaten-Overlay möglich. Wird nicht
gebraucht, weil § 9b seit 01.01.2025 online über das Zoll-Portal eingereicht
wird — der Antrag ist eine strukturierte Eingabe, kein hochgeladenes PDF.

## Seite 1 — Abschnitte 1 bis 9

### Abschnitt 1 — Anmelder und Rahmen

| Feld | Inhalt | Quelle |
|---|---|---|
| Anmelder/in | Name, Anschrift, ggf. E-Mail, **Rechtsform** | `Mandant` |
| Hauptzollamt | zuständiges HZA | `Mandant.hauptzollamt` |
| Unternehmensart | Ankreuzfeld: Unternehmen des Produzierenden Gewerbes i. S. d. § 2 Nr. 3 StromStG **oder** Unternehmen der Land- und Forstwirtschaft i. S. d. § 2 Nr. 5 StromStG | `Mandant.unternehmensart` |
| Zeitraum | Entlastungsabschnitt | `Antrag.antragsjahr` + `entlastungsabschnitt` |

Für zollamtliche Zwecke (nicht von uns zu füllen): Unternehmensnummer,
Bearbeiter/in, Telefon.

**Zuständigkeit:** Laut Anleitung das Hauptzollamt, in dessen Bezirk der
Antragsteller seinen Geschäfts- oder Wohnsitz hat — **nicht** nach Standort der
Lieferstelle. Deshalb gehört das Feld an den `Mandant`, nicht an die
`Lieferstelle`.

### Abschnitt 2 — Beschreibung der wirtschaftlichen Tätigkeit

Ankreuzfeld: „wurde bereits vorgelegt" oder „wird mit diesem Antrag vorgelegt".
→ `Antrag.beschreibungTaetigkeitVorgelegt`

Die Vorlagepflicht (Vordruck 1402) ist für Anträge ab 01.01.2025 entfallen; das
HZA fordert die Angaben nur noch auf Verlangen an. Die Daten trotzdem erheben
und vorhalten.

### Abschnitt 3 — Steuererklärung

Feste Erklärung: „Ich beantrage die Entlastung von der Stromsteuer nach § 9b des
Stromsteuergesetzes (StromStG)." Kein Eingabefeld.

### Abschnitt 4 — Bankverbindung

| Feld | Quelle |
|---|---|
| Kontoinhaber | `Mandant.kontoinhaber` |
| IBAN | `Mandant.iban` |
| BIC | `Mandant.bic` |

**Ohne IBAN kein Antrag.** Im alten Schema fehlte das komplett.

### Abschnitt 5 — Schätzung

Ankreuzfeld: „Ich habe von der Schätzung nach § 17b Abs. 5 StromStV Gebrauch
gemacht." → `Antrag.schaetzungNach17b`

### Abschnitt 6 — Leistungen an Dritte

Zwei getrennte Ankreuzfelder:

- „Ich leiste Strom an Dritte." → `Antrag.stromAnDritteGeleistet`
- „Ich gebe Nutzenergie (Licht, Wärme, Kälte, mechanische Energie oder
  Druckluft, nicht in Druckflaschen oder anderen Behältern) an Dritte weiter."
  → `Antrag.nutzenergieAnDritteWeitergegeben`

Das zweite Feld löst Spalte 4/5 der Tabelle, Formular 1456 je Empfänger und die
Zuordnungsaufstellung aus.

### Abschnitt 7 — Entnahme durch Dritte

Ja/Nein: „Der Strom, für den ich diese Entlastung beantrage, wird durch einen
Dritten (kleinste rechtlich selbständige Einheit) entnommen."
→ `Antrag.entnahmeDurchDritten`, bestehendes Triage-Feld
`triageKleinsteRechtsperson`

Laut Anleitung ist zu bestätigen, dass **kein** anderes Unternehmen (etwa eine
Betriebsführungsgesellschaft oder ein Werkvertragsunternehmen) beauftragt wurde,
an eigener Stelle den Strom zu entnehmen. Abgestellt wird auf die kleinste
rechtlich selbständige Einheit, unabhängig von Konzernverbund oder
Organgesellschaft.

### Abschnitt 8 — Versicherung und Unterschrift

„Ich versichere, dass ich die Angaben nach bestem Wissen und Gewissen
vollständig und richtig gemacht habe." Plus Ort, Datum, Unterschrift.

Laut Anleitung zu Punkt 8: Die angemeldeten Mengen müssen mit den für
steuerliche Zwecke geführten Aufzeichnungen übereinstimmen.

### Abschnitt 9 — Anlagen

Mit Anzahl bzw. Ankreuzfeld:

- Stromrechnungen
- Aufstellung, in der die für die Nutzenergieerzeugung entnommenen Strommengen
  den anderen Unternehmen jeweils zugeordnet werden
- Anzahl der Selbsterklärungen (Vordruck 1456)
- Selbsterklärung zu staatlichen Beihilfen (Vordruck 1139)
- Beschreibung der wirtschaftlichen Tätigkeit (Vordruck 1402)
- Sonstige Unterlagen

## Seite 2 — Berechnungstabelle

Sechs Spalten, vier Zeilen. Die Mengen werden in **Megawattstunden** eingetragen.

| Spalte | Inhalt |
|---|---|
| 1 | Entlastungsgegenstand: „Elektrischer Strom, § 3 StromStG" |
| 2 | Entlastungssatz in EUR für 1 MWh — **im PDF 5,13, gültig 20,00** |
| 3 | Entnahme für entlastungsfähige Zwecke, **ohne** die Mengen der Spalten 4 und 5 |
| 4 | Entnahme zur Erzeugung von Nutzenergie, genutzt durch andere Unternehmen des **Produzierenden Gewerbes** |
| 5 | dasselbe, genutzt durch andere Unternehmen der **Land- und Forstwirtschaft** |
| 6 | Betrag in EUR und Cent |

Zeilen: 1 Elektrischer Strom · 2 Gesamtsumme · 3 ggf. abzüglich Selbstbehalt
nach § 9b Abs. 2 StromStG · 4 zu entlasten. Dazu der Betrag in Buchstaben.

### Was in welche Spalte gehört (aus der Anleitung)

**Spalte 3:** Die für betriebliche Zwecke entnommene Menge ohne die Mengen der
Spalten 4 und 5. Strom zur Erzeugung von Licht, Wärme, Kälte, mechanischer
Energie und Druckluft nur, soweit diese Erzeugnisse durch das **eigene**
Unternehmen genutzt wurden. Strom zur Erzeugung von Druckluft darf immer hier
eingetragen werden, soweit sie in Druckflaschen oder anderen Behältern abgegeben
wurde.

**Spalte 4:** Menge zur Erzeugung von Nutzenergie, soweit durch andere
Unternehmen des Produzierenden Gewerbes genutzt.

**Spalte 5:** dito für Land- und Forstwirtschaft.

→ `Lieferstelle.kwhEigenbetrieblich`, `kwhNutzenergiePG`, `kwhNutzenergieLuF`

### Was nicht in den Antrag darf

Laut Anleitung ausdrücklich keine Mengen, die

- an andere geleistet wurden,
- zu nicht betrieblichen Zwecken entnommen wurden,
- steuerfrei entnommen wurden.

Entlastet wird nur Strom, der nachweislich zum Regelsteuersatz von 20,50 €/MWh
versteuert wurde.

### Selbstbehalt (Zeile 3)

250 € pro Kalenderjahr. Bei unterjährigen Entlastungsabschnitten ist er beim
**ersten** Antrag in voller Höhe abzuziehen; ist er für das Kalenderjahr bereits
abgezogen, entfällt ein erneuter Abzug.

### Rundung

Die Tabelle rechnet in MWh, unsere Daten liegen in kWh. Festgelegt: kWh-Summe →
MWh mit drei Dezimalstellen (verlustfrei), Euro-Betrag danach auf zwei Stellen
kaufmännisch. **Nicht** auf ganze MWh runden — bei 500 MWh sind das bis zu 10 €
Differenz.

## Fristen und Abschnitte (aus der Anleitung)

Die Entlastung wird nur gewährt, wenn der Antrag spätestens bis zum
**31. Dezember des Jahres gestellt wird, das auf das Kalenderjahr folgt, in dem
der Strom entnommen worden ist** (Ausschlussfrist). Erfolgte die Festsetzung der
Steuer beim Steuerschuldner erst nach der Entnahme, zählt das Jahr der
Festsetzung.

Entlastungsabschnitt ist grundsätzlich das Kalenderjahr. Halbjahr oder
Vierteljahr sind wählbar, wenn die Zuordnung des Unternehmens anhand der
Tätigkeiten des Vorjahres erfolgt (§ 15 Abs. 3 Satz 1 StromStV); auf Antrag kann
das HZA den Kalendermonat zulassen. Unterjährig nur, wenn der Entlastungsbetrag
den Selbstbehalt von 250 € **bereits im ersten Abschnitt** des Kalenderjahres
übersteigt. Wurde einmal unterjährig gewählt, sind Folgeanträge auf dieselbe
Taktung festgelegt.

Die Höhe der Entlastung berechnet der Antragsteller selbst. Ein
Festsetzungsbescheid ergeht nur, wenn von der Berechnung abgewichen wird.

## Pflicht-Anlagen im Detail

**1139 — Selbsterklärung zu staatlichen Beihilfen.** Die Entlastung nach § 9b
ist eine staatliche Beihilfe. Sie darf nur gewährt werden, wenn das Unternehmen
sich im Verwendungszeitraum und bei Antragstellung nicht in wirtschaftlichen
Schwierigkeiten befindet, und wenn eine zu Unrecht erhaltene Beihilfe nach
Aufforderung zurückgezahlt wurde. Vorzulegen **für den ersten
Entlastungsabschnitt jedes Kalenderjahres**; weiteren Anträgen nur beizufügen,
wenn sich Änderungen ergeben haben. Merkblatt dazu: 1139a.

**1456 — Selbsterklärung des Nutzers von Nutzenergie.** Je anderem Unternehmen
beizufügen, wenn Entlastung für Nutzenergie beantragt wird, die ein anderes
Unternehmen des Produzierenden Gewerbes oder der Land-/Forstwirtschaft verwendet
hat. Nicht erforderlich, wenn sie dem HZA für diesen Abschnitt schon vorliegt.
Zusätzlich ist eine **Aufstellung** beizufügen, die die Mengen den Unternehmen
eindeutig zuordnet.

**EnSTransV (1462/1463/1464).** Einmal jährlich bis spätestens **30. Juni** für
das vorangegangene Kalenderjahr, wenn die Entlastung nach § 9b im Kalenderjahr
**200.000 € oder mehr** beträgt. Pflichtig elektronisch über
https://enstransv.zoll.de. Das entspricht etwa 10.000 MWh Jahresverbrauch.

## Sonstige Hinweise aus dem Formular

Bei Erstattung an eine Person, die in einem anderen Mitgliedstaat niedergelassen
oder wohnhaft ist, wird dieser Mitgliedstaat nach § 6 Abs. 2 EUBeitrG
informiert; die Auszahlung kann sich dadurch verzögern.
