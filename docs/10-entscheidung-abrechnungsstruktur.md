# Entscheidung: Abrechnungsstruktur und Preismodell

Stand 27.09.2026. Rechtliche Einschätzungen sind Arbeitsstand, keine
Rechtsberatung; die mit „abzusegnen" markierten Punkte gehören vor den ersten
Kunden zum Anwalt.

## Beschlossen

Zwei Verträge, zwei Rechnungen. Wir rechnen die Aufbereitung direkt beim Kunden
ab. Die Kanzlei rechnet die Vertretung und Einreichung separat beim Kunden ab. Es
gibt keine Gebührenteilung.

Die Partnerkanzlei wird nicht WINDORFER RODE sein, weil EnergyIQ als
nächstliegender Wettbewerber mit dieser Kanzlei arbeitet. Welche es wird, ist
offen.

## Warum diese Struktur

Ein Rechtsanwalt darf Gebührenanteile nicht mit Berufsfremden teilen
(§ 49b BRAO), ein Steuerberater ebenso nicht (§ 9 StBerG). Jedes Modell, in dem
die Kanzlei ein Erfolgshonorar einzieht und davon etwas weitergibt, läuft in
dieses Verbot. Die getrennte Abrechnung umgeht es, indem nichts geteilt wird.

Nebeneffekt: Die Kundenbeziehung liegt bei uns, nicht bei der Kanzlei.

## Konsequenz: kein Prozenthonorar

Wer selbst gegenüber dem Kunden abrechnet, darf sein Honorar nicht am
Erstattungsbetrag festmachen. Reine Datenaufbereitung ist unter § 6 StBerG
zulässig, aber ein Prozentsatz vom Steuerergebnis ist das stärkste Indiz dafür,
dass doch in Steuersachen beraten wird.

Damit ist das bisherige Modell — 14,1 % nach Sockel, Mindesthonorar 500 € —
hinfällig. Es steckt in `packages/api/src/calc/stromsteuer.ts`, im Rechner der
Landingpage und als Geschäftsregel in `CLAUDE.md` und `Code_Plan.md`.

## Der Test, den der Preis bestehen muss

Der Preis steht vor der Einreichung fest und ist dem Kunden bekannt. Er ändert
sich nicht, wenn der Bescheid anders ausfällt als berechnet. Er ist über den
Aufwand begründbar, nicht über das Ergebnis.

Aus der zweiten Eigenschaft folgt: Die Rechnung ist auch bei Ablehnung fällig.

## Erfolg zweimal definiert

„Erfolg" kann ein positiver Bescheid heißen oder ein vollständiger,
einreichbarer Antrag. Das Erste ist das Steuerergebnis, das Zweite unsere eigene
Leistung. An das Zweite darf das Honorar gebunden werden.

Also: Die Prüfung der Anspruchsberechtigung ist kostenlos. Ergibt sie, dass der
Betrieb nicht antragsberechtigt ist oder unter dem Selbstbehalt bleibt, zahlt er
nichts. Danach ist der Preis fest und fällig.

Für den Kunden fühlt sich das fast identisch an, weil die echte Unsicherheit
vorne liegt — ob er als Unternehmen des produzierenden Gewerbes gilt.

## Preismodell

Staffel nach Jahresverbrauch. Bandgrenzen unten einschließend, oben
ausschließend: 250 MWh fällt in das Band 250–400.

| Jahresverbrauch | Preis | Auszahlung Bandanfang | effektiv | Bandende | effektiv |
|---|---|---|---|---|---|
| 150–250 MWh | 690 € | 2.750 € | 25,1 % | 4.750 € | 14,5 % |
| 250–400 MWh | 1.090 € | 4.750 € | 22,9 % | 7.750 € | 14,1 % |
| 400–600 MWh | 1.590 € | 7.750 € | 20,5 % | 11.750 € | 13,5 % |
| 600–900 MWh | 2.190 € | 11.750 € | 18,6 % | 17.750 € | 12,3 % |
| 900–1.300 MWh | 2.890 € | 17.750 € | 16,3 % | 25.750 € | 11,2 % |
| 1.300–2.000 MWh | 3.790 € | 25.750 € | 14,7 % | 39.750 € | 9,5 % |
| 2.000–3.000 MWh | 4.990 € | 39.750 € | 12,6 % | 59.750 € | 8,4 % |
| über 3.000 MWh | individuell | | | | |

Auszahlung heißt Erstattung minus 250 € Selbstbehalt, also der Betrag, den der
Kunde bekommt und gegen den er den Preis vergleicht.

**Was nicht funktioniert:** ein Preis je MWh. Weil die Erstattung genau
20 €/MWh beträgt, wäre ein Betrag je MWh mathematisch ein fester Prozentsatz der
Erstattung. Bänder sind gröber und deshalb besser verteidigbar.

Vollständig unangreifbar wäre eine Preisbildung nur nach Arbeitstreibern
(Grundgebühr, Zuschlag je weiterer Lieferstelle, Zuschlag für Nutzenergie an
Dritte). Die entkoppelt aber von der Kundengröße. Die Verbrauchsstaffel ist der
gewählte Mittelweg.

## Was das gegenüber dem alten Modell kostet

| MWh | Auszahlung | alt (14,1 %, Floor 500) | neu | Differenz |
|---|---|---|---|---|
| 150 | 2.750 € | 500 € | 690 € | +190 € |
| 250 | 4.750 € | 670 € | 1.090 € | +420 € |
| 400 | 7.750 € | 1.093 € | 1.090 € | ±0 |
| 600 | 11.750 € | 1.657 € | 1.590 € | −67 € |
| 900 | 17.750 € | 2.503 € | 2.190 € | −313 € |
| 1.300 | 25.750 € | 3.631 € | 2.890 € | −741 € |
| 2.000 | 39.750 € | 5.605 € | 3.790 € | −1.815 € |
| 3.000 | 59.750 € | 8.425 € | 4.990 € | −3.435 € |

Bis etwa 400 MWh verdient die Staffel mehr als das alte Erfolgshonorar, darüber
weniger, bei Großkunden deutlich weniger. Der Schwerpunkt verschiebt sich damit
in das Segment 150 bis 600 MWh.

Über 3.000 MWh gilt ein individuell verhandelter Preis. Dort ist der Mehraufwand
real — mehr Lieferstellen, genauere Prüfung, ab 200.000 € Entlastung zusätzlich
die EnSTransV-Erklärung.

## Folgejahre

Der zweite Antrag desselben Mandanten kostet 60 % des Erstjahrespreises, weil
Stammdaten, Lieferstellen und Portal-Vollmacht vorliegen und nur Verbrauch und
Beihilfe-Selbsterklärung neu sind.

| Jahresverbrauch | Folgejahr |
|---|---|
| 150–250 MWh | 410 € |
| 250–400 MWh | 650 € |
| 400–600 MWh | 950 € |
| 600–900 MWh | 1.310 € |
| 900–1.300 MWh | 1.730 € |
| 1.300–2.000 MWh | 2.270 € |
| 2.000–3.000 MWh | 2.990 € |

Das ist Begründung des Nachlasses und Beschreibung des Geschäftsmodells: Der
Bestand trägt sich, weil die Arbeit pro Folgejahr gegen Null geht.

## Kunden unter 150 MWh

Bei 150 MWh liegt der effektive Satz bei 25 %. Darunter deckt kein vertretbarer
Preis den Akquise- und Onboarding-Aufwand. Zwei Möglichkeiten: nicht bedienen,
oder ein Selbstbedienungstarif um 149 bis 199 €, bei dem der Kunde selbst
einreicht und nur Berechnung, Formularhilfe und Anleitung bekommt. Entscheidung
offen.

## Regeln auf der Kanzlei-Seite

Der Kunde mandatiert die Kanzlei selbst und unterschreibt dort direkt. Wir
empfehlen, wir vermitteln nicht in seinem Namen — sonst verschaffen wir
Steuervertretung und rücken in den Vorbehalt.

In keine Richtung Geld für die Zuführung. Keine Provision von der Kanzlei an
uns, keine von uns an die Kanzlei.

Die Kanzlei ist im Zoll-Portal die Bevollmächtigte. Bescheide gehen in ihr
Portal-Profil, nicht zum Kunden und nicht in unser System. Es braucht eine
Absprache, wie sie den Ausgang zurückmeldet — Statusanzeige,
Folgejahres-Erinnerung und Rechnungsstellung hängen daran.

Anforderungen an die zu suchende Kanzlei: nimmt Mandate in dieser Konstruktion
an, rechnet ihren Teil als überschaubare Pauschale ab, kann Volumen abbilden,
und führt die Portal-Vollmachten zentral. Erst suchen, wenn die Struktur steht.

## Was der Kunde sieht

Zwei Rechnungen, und unsere ist die größere, obwohl die Kanzlei eingereicht hat.
Vorbereitete Antwort: Wir haben die Verbräuche erhoben, die Voraussetzungen
geprüft, den Antrag aufgebaut und die Anlagen erstellt; die Kanzlei hat den
rechtlichen Schritt gemacht. Der Aufwand liegt in der Datenarbeit.

Diese Aufteilung gehört offen auf die Website und ins Angebot, nicht ins
Kleingedruckte.

## Abzusegnen durch den Anwalt

- Geht die Verbrauchsstaffel als aufwandsbezogener Werklohn durch, oder gilt sie
  als verdecktes Erfolgshonorar? Zentrale Frage für das Preismodell.
- Grenzt die kostenlose Vorprüfung mit anschließend festem Preis sauber ab?
- Wie muss die Leistungsbeschreibung formuliert sein, damit sie Aufbereitung
  beschreibt und keine Steuerberatung verspricht? Keine Zusage eines
  Erstattungserfolgs in Angebot, Website und Vertrag.
- Ist die Empfehlung der Kanzlei unbedenklich, solange in keine Richtung Geld
  fließt?

## Offene Punkte

- Selbstbedienungstarif unter 150 MWh: ja oder nein
- Preis der Kanzlei für ihren Teil
- Wann wird unsere Rechnung fällig — vor oder nach Auszahlung durch das HZA?
  Nach Bescheid ist kundenfreundlicher, darf aber nicht als Erfolgsbedingung
  formuliert sein
- Kanzleiauswahl, erst nach Freigabe der Struktur
