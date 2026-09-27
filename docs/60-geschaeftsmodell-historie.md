# Stromsteuererstattung — Geschäftsmodell-Analyse (Zusammenfassung)

> [!success] Update 17.06.2026 — Modell gebaut: Partnerkanzlei statt Self-Submit
> Das Produkt ist umgesetzt als **Partnerkanzlei-Modell** (Code: `C:\dev\stromsteuer-app`):
> - **Kein Self-Submit** mehr. Der Kunde unterschreibt online ein **Mandat**, eine
>   echte **Partnerkanzlei** (WINDORFER RODE Rechtsanwälte) reicht beim Hauptzollamt ein.
> - **Honorar = Erfolgshonorar 14,1 % (§ 4a RVG)** der Erstattung nach 250-€-Sockel,
>   **Mindesthonorar 500 €**, nur im Erfolgsfall.
> - Damit ist die alte „nie % der Erstattung"-Regel **bewusst abgelöst**: Sie galt
>   für das reine Software-Modell (§ 6 StBerG). Weil jetzt eine zugelassene Kanzlei
>   einreicht, ist ein RVG-Erfolgshonorar der legale Weg.
> - **Überholt:** Festpreis-Tiers, Stripe, ELSTER-XML/Formular 1453, Energieberater-Provision.
> - Implementierungs-Status & Roadmap stehen in `Code_Plan.md`.
> Tags: #produkt/partnerkanzlei #status/gebaut
>
> Die folgende Analyse bleibt als rechtliche Herleitung erhalten — sie erklärt,
> warum der reine Software-Weg gewählt und dann zur Kanzlei-Konstruktion verfeinert wurde.

> [!info] Update 01.06.2026 — Geschäftsmodell geschärft
> **Neue Entscheidungen:**
> - Produkt = reine **B2B-SaaS-Web-App** (Next.js + Supabase, EU-gehostet)
> - **Zwei-Modi-Logik**: Self-Submit (DIY) + StB-Handover-Paket (komplexe Fälle)
> - **Positionierung**: „Dein Steuerberater macht das nicht, weil sich's für ihn nicht lohnt — mit unserem Tool in 15 Min selbst oder als Vorbereitung für den StB"
> - **Primärer Vertriebskanal**: Energieberater-Provisionsmodell (50 € Bounty + 20 % recurring)
> - **Neue Pricing-Struktur**: 149 € / 199 € / 499 € / 1.490 € Jahres-Abo
> - **Plan B im Hinterkopf**: § 54 EnergieStG + ESG-Reporting als zweite Säule wegen Politik-Risiko bei § 9b
>
> Tags: #status/in-planning #produkt/saas #vertrieb/energieberater

---

## Ausgangsidee
Dienstleistung anbieten: Kunden helfen, Stromsteuererstattung nach § 9b StromStG zu bekommen, dafür 30 % der Erstattung als Honorar nehmen.

## Rechtliche Probleme der Ursprungsidee

**Steuerberatervorbehalt (§§ 2, 3, 5 StBerG):** Die Stromsteuer ist eine Steuer. Antrag beim Hauptzollamt = „geschäftsmäßige Hilfeleistung in Steuersachen". Darf nur, wer in §§ 3, 3a, 4 StBerG genannt ist (StB, RA, WP). Bußgeld bis 50.000 € (§ 160 StBerG). Verträge nichtig (§ 134 BGB).

**Provisionsverbot (§ 9 StBerG):** Steuerberater dürfen niemandem Anteile der Vergütung für Mandantenvermittlung geben oder nehmen. Kennt keine Ausnahmen. OLG Köln, 6 U 143/21, 08.04.2022: auch versteckte Modelle erfasst. Das ist der eigentliche Sargnagel des 30-%-Modells in Kombination mit einem Partner-StB.

**Erfolgshonorar (§ 9a StBerG):** Beim StB nur ausnahmsweise zulässig (Mandant würde sonst von Rechtsverfolgung absehen). Bei Routine-Stromsteuererstattung praktisch nie erfüllt.

**Berufsordnung BOStB:** Berufsfremde dürfen nicht am wirtschaftlichen Ergebnis eines StB beteiligt sein. Sozietät/Kooperation mit Gewerblichem nicht zulässig.

**RDG keine Hintertür:** § 1 Abs. 2 RDG weist Steuersachen ausdrücklich dem StBerG zu.

**UWG-Risiko:** Wettbewerbszentrale, Kammern und Konkurrenten können abmahnen.

## Geprüfte Alternativ-Modelle

**Partner-StB-Gesellschaft (Kunden weiterleiten gegen Provision):** Fällt auf § 9 StBerG. Auch wenn man es „Marketing-Kooperation" o. Ä. nennt — Gerichte schauen auf wirtschaftliche Substanz.

**Eigene StB-Berufsausübungsgesellschaft (§§ 49 ff., 53a StBerG seit 1.8.2022):** Funktioniert. Berufsfremde dürfen Minderheits-Gesellschafter sein. Mehrheit der Stimm-/Geschäftsanteile muss bei aktiv tätigen StB/RA/WP liegen. Vorteil: Mandantenbeziehung gehört der Gesellschaft, an der man beteiligt ist.

**Reine Datenvorbereitung + Kunde reicht selbst ein:** Funktioniert dem Grunde nach (mechanische Vorarbeit nach § 6 Nr. 3 StBerG ist kein Vorbehalt), aber: Honorar darf **nicht** prozentual am Erstattungsbetrag hängen — sonst wird das gesamte Modell als verdeckte Steuerberatung gewertet.

## Bevorzugtes Modell: Software/SaaS

Funktioniert rechtlich sauber über § 6 Nr. 2 StBerG („Erteilung allgemeiner Auskünfte"). Vorbild: Taxfix, Smartsteuer, WISO.

**So sieht der saubere Flow aus:**
1. Kunde bekommt Online-Formular (z. B. per E-Mail-Link)
2. Kunde lädt Stromrechnungen hoch / trägt Werte ein
3. Kunde beantwortet selbst die bewertenden Fragen (z. B. „Produzierendes Gewerbe nach WZ 2008 ja/nein") — mit Erklär-Link auf die offizielle BMF-Liste
4. Software addiert kWh, multipliziert mit 2 ct/kWh (Entlastungssatz 2026: 20 €/MWh), prüft 250 €-Sockel
5. Software erzeugt fertig ausgefüllten Zoll-Antrag (Formular 1453 nach § 9b StromStG) als PDF oder ELSTER-XML
6. **Kunde reicht selbst ein** über Zoll-Portal (mit eigenem ELSTER-Zertifikat) — 1-Klick-Upload der XML

**Was nicht geht:** Vollautomatische Abgabe durch den Anbieter. Das wäre „Vertretung in Steuersachen" → wieder Steuerberatervorbehalt. Die Abgabe-Aktion muss zwingend beim Kunden bleiben.

**Vier Regeln, um in der § 6-Zone zu bleiben:**
1. Positionierung als Software-Anbieter, nicht als Berater. Marketing: „Tool zur Antragsvorbereitung", nicht „Wir holen Ihre Stromsteuer zurück".
2. Kein individueller Support, der über Software-Bedienung hinausgeht. Keine telefonische Bewertung von Einzelfällen.
3. Steuerlich bewertende Fragen beantwortet der Kunde, nicht die Software.
4. Honorar: SaaS-Abo, Festpreis pro Antrag, oder Staffel nach kWh-Verbrauch. **Nicht** Prozentsatz der Erstattung.

### Update Juni 2026 — Zwei-Modi-Produktlogik

Statt einem Single-Path-Flow gibt es jetzt **zwei Ausgänge**, abhängig von Fall-Komplexität:

| Modus | Self-Submit (DIY) | StB-Handover |
|---|---|---|
| Zielkunde | Standardfall, klare WZ-Klassifizierung | Mischbetrieb, Mehrstandorte, Eigenstrom |
| Wizard-Schritte | Alle 8 Schritte | 1–6 + alternativer Export-Schritt |
| Output | Formular 1453 PDF + ELSTER-XML + Einreich-Anleitung | StB-Übergabe-Paket: Excel-Übersicht + sortierte Belege als ZIP + Mandanten-Brief-Template |
| Preis | 199 € | 149 € |
| Wer reicht ein | Kunde | Steuerberater |

Der Modus wird **nicht vorab gewählt** — die Software führt den Kunden anhand von Komplexitäts-Triggern hin (mehrere WZ-Codes? Eigenstrom? > 1 Standort? → Empfehlung StB-Handover).

**Strategischer Effekt:** TAM wächst erheblich, weil komplexe Fälle nicht mehr abgewiesen werden müssen. Steuerberater werden zu Verbündeten (Datenarbeit abgenommen), nicht zu Gegnern.

### Update Juni 2026 — Kern-Positionierung (verbindlich)

> „Dein Steuerberater macht das nicht, weil sich der Aufwand pro Mandat für ihn nicht lohnt. Mit unserem Tool hast du in 15 Minuten deine Stromsteuer-Erstattung — oder zumindest geordnete Daten, die dein Steuerberater in 30 Minuten einreichen kann."

Entwaffnet die häufigste Einwand-Maschine („mein StB macht das eh"). Positioniert das Produkt **neben** dem StB, nicht **gegen** ihn.

## Honorarmodell — verbindliche Regel

> [!warning] Update 17.06.2026 — gilt nur fürs reine Software-Modell
> Die folgende „nie % der Erstattung"-Regel galt, solange der Anbieter **Software**
> ist (§ 6 StBerG). Im jetzt gebauten **Partnerkanzlei-Modell** rechnet die **Kanzlei**
> ein **RVG-Erfolgshonorar (14,1 %, Floor 500 €)** ab — das ist zulässig, weil eine
> zugelassene Kanzlei die Vertretung übernimmt. Die Software selbst nimmt kein
> erfolgsabhängiges Honorar.

Niemals % der Erstattung (für ein **reines Software-Angebot**). Stattdessen:
- Festpreis pro Antrag (z. B. 99 € / 199 € / 399 €)
- Staffel nach Verbrauchsklasse (skaliert linear mit Erstattung, ohne Bezug zum Steuerergebnis)
- SaaS-Abo

### Update Juni 2026 — Aktuelle Pricing-Tiers

| Tier | Preis | Inhalt | Zielkunde |
|---|---|---|---|
| **StB-Handover** | 149 € | Daten-Aufbereitung, Excel + Belege-ZIP | Komplexe Fälle, StB übernimmt |
| **Self-Submit Standard** | 199 € | 1 Antrag, bis 250 MWh, eigene Einreichung | Sweet-Spot |
| **Business (Sales-Channel)** | 499 € | 1 Antrag unbegrenzt MWh, Team, DATEV-Export | Über Energieberater verkauft |
| **Auto-Pilot Jahres-Abo** | 1.490 €/Jahr | Antrag + Reminder + Vorjahres-Kopie + Premium-Support | Wiederkehrer, Mittelstand |
| **Kanzlei-Whitelabel** | 990–2.490 €/Jahr | bis 20 Mandanten verwalten | Steuerberater-Kanzleien |

**Rationale für höhere Tiers:** Damit Energieberater-Provision (50 € + 20 % recurring) wirtschaftlich darstellbar bleibt.

## Ökonomie
- Mindest-Antrag: 12.500 kWh × 0,02 € = 250 € Erstattung
- Sweet Spot: Kunden mit 50.000–500.000 kWh → Erstattung 1.000–10.000 €, eigene Gebühr 199–499 €
- Sehr kleine Verbraucher (~12.500 kWh): nicht profitabel, weil Erstattung knapp über Schwelle

## Vertriebsmodell — Energieberater-Channel (NEU Juni 2026)

**Primärer Channel:** Energieberater empfehlen das Tool an ihre Industriekunden. Sie sind eh vor Ort, sehen die Stromrechnung, können in 5 Min vorführen.

**Provisionsstruktur** (juristisch sauber, § 9 StBerG nicht einschlägig da kein StB):
- **50 € Bounty** bei erstem bezahltem Antrag
- **20 % recurring** auf alle Folgeanträge desselben Kunden (lifetime)
- **Auszahlung**: monatlich per Gutschriftverfahren (du erstellst Gutschrift)
- **Tracking**: persönlicher Link `app.de/e/[name]`, 90-Tage-Cookie, eigene Mini-Landingpage mit Foto + Telefon

**Pitch an Energieberater:**
> „Du bist eh bei deinen Industriekunden vor Ort. 70 % davon haben Anspruch auf Stromsteuer-Erstattung, aber nur die Hälfte beantragt sie. Mit unserem Tool zeigst du in 5 Min die potenzielle Rückzahlung. Bei Zugriff: 50 € sofort + 20 % auf jeden Folgeantrag. Du bist der Held, machst null Arbeit, der Kunde sieht dich als kompletteren Berater."

**Unit Economics:** Bei 199 € AOV → 50 € Bounty + ~10 € variable Kosten = 139 € DB pro Erstkunde. Bei 60 % Retention LTV ca. 350 €, CAC 50 € → sehr gesundes Verhältnis.

**Realistische Erwartung:** Von 20 angesprochenen Beratern werden ~3 aktiv verkaufen, 1 davon regelmäßig. Channel skaliert über Masse.

### Sekundäre Channels (Phase 2+)
- Kanzlei-Whitelabel (990–2.490 €/Jahr) → ein guter Deal = 20 Mandanten auf einen Schlag
- Stadtwerke-Whitelabel als „Mehrwertservice für Gewerbekunden" → der wahre Skalierungs-Hebel (1 Pilot = 500 potenzielle Kunden)
- SEO (Pillar + Long-Tail) — wirkt ab Monat 9–12
- LinkedIn-Founder-Content (Build-in-public-Narrativ)

## Erweiterte Monetarisierungspfade (NEU Juni 2026)

Über den reinen Stromsteuer-Antrag hinaus identifizierte Erlösquellen, priorisiert:

**Phase 1 (mit MVP):** nur § 9b StromStG + Energieberater-Provision. Nicht ablenken lassen.

**Phase 2 (Monat 6–12):**
- **§ 54 EnergieStG** dazu (selbe Kunden, gleicher Funnel, doppelter Revenue, +149 € pro Kunde)
- **Lead-Verkauf mit Opt-in**: PV-Anlagen (80–250 €), Energie-Audit (100–300 €), Wärmepumpe (60–150 €), LED-Sanierung (30–80 €), Smart Meter (40–100 €), Strom-Tarifwechsel (50–150 €)
- Realistisch: 30–80 € extra pro Antrag-Kunde durch Lead-Monetarisierung

**Phase 3 (Monat 12–18):**
- **Kanzlei-Whitelabel** (990–2.490 €/Jahr)
- **Stadtwerke-Pilot** als Whitelabel (5.000–20.000 €/Jahr + Per-Use)
- **§ 51, § 55 EnergieStG** (Spitzenausgleich-Nachfolgeregelungen, falls politisch wieder relevant)
- **Mehrjahres-Anträge** rückwirkend bis 4 Jahre (+450 € beim Onboarding)

**Phase 4 (Monat 18+):**
- **Anonymisierte Branchen-Benchmarks** verkaufen (1.500–5.000 € pro Report)
- **CO2-/ESG-Reporting-Add-On** für Mittelstand (CSRD-light, 990 €/Jahr)
- **Energie-Monitoring-Tool** mit Smart-Meter-Anbindung (49 €/Monat)
- **Online-Kurs / Zertifikat** „Energie-Verantwortlicher Industriebetrieb" (199–499 €)

### Red Flags — was NICHT monetarisiert werden darf
- Steuerberater-Vermittlung mit Provision → § 9 StBerG, Bußgeld
- Vorfinanzierung der Erstattung → Bankerlaubnis nach KWG nötig
- Vollservice „wir machen das für Sie" → bricht § 6 Nr. 2, ganzes Modell kippt
- Provisionen auf % der Erstattung an Vertriebler → Lobby-Angriffsfläche

---

## Realistische Risiken (NEU Juni 2026)

### Strategische Killer
1. **Stromsteuer-Politik-Risiko (höchste Priorität).** Spitzenausgleich wurde 2024 abgeschafft, § 9b kostet den Staat 1,8 Mrd. €/Jahr und steht regelmäßig auf der Streichliste. Ein Bundestagsbeschluss kann das Produkt in 12 Monaten obsolet machen. → **Mitigation:** Produkt von Anfang an als „Energie-Compliance-Plattform" denken, nicht als „Stromsteuer-App".
2. **Steuerberater-Kammer-Klage** wegen Wording. Selbst Abmahnung kostet 2.000–8.000 €. → **Mitigation:** 5.000 € Anwalts-Budget einplanen, Marketing-Texte vorab freigeben lassen.
3. **Channel-Wette stirbt:** Energieberater verkaufen nicht aktiv. → **Mitigation:** in Woche 4 mit 5 echten Beratern validieren, bevor Code geschrieben wird.

### Operative Realitäten
- **Q4-Saisonalität extrem**: 60–70 % Umsatz Okt–Dez (Frist 31.12.), Jan–Sep Cashflow miserabel
- **OCR-Hölle**: ~900 deutsche Versorger, alle anders, 10–20 % Belege müssen manuell nachbearbeitet werden
- **Mischbetriebe & Eigenstrom**: juristisch grenzwertige Aufteilungsfragen → Self-Submit unmöglich, → StB-Handover-Mode rettet
- **Support-Versuchung**: Kunde fragt „passt mein WZ-Code?" → Antwort = unbefugte Steuerberatung
- **„Ich habe vergessen einzureichen"**: Kunde hat bezahlt, klickt aber nicht im Zoll-Portal → kommt mit Refund-Forderung
- **Realistische Refund-Rate** Jahr 1: 3–5 %
- **Realistischer Jahr-1-Umsatz** (Solo, Channel + Outbound): 15.000–40.000 €
- **B2B-Cold-Outbound in DE**: 200 Mails → 4 Antworten → 0,2 Kunden. Du brauchst 2.000–4.000 Mails/Monat für 4–8 Kunden.
- **Burnout-Tal Monat 8–10** (häufigster Solo-SaaS-Abbruchpunkt)

---

## Offene Punkte / nächste Schritte (Update Juni 2026)

### Sofort (Woche 1–2)
- [ ] **Validierung mit Energieberatern** (5 Interviews): würden sie aktiv verkaufen, gegen 50 € + 20 %?
- [ ] **Validierung mit Endkunden** (20 Interviews): zahlt jemand 199 € für 1.500 € Erstattung in 15 Min?
- [ ] Domain registrieren (.de + .com), Markenrecherche beim Anwalt
- [ ] Anwalt-Termin StBerG-Check buchen

### Kurzfristig (Woche 3–4)
- [ ] Pre-Sales: 5 Pilotkunden 99 € Anzahlung leisten lassen (echte Zahlungsbereitschaft testen)
- [ ] Designer-Briefing schreiben
- [ ] AGB-Entwurf vom Anwalt beauftragen
- [ ] Technischer Spike: OCR-Test mit 5 echten Stromrechnungen aus Pilotkunden-Pool
- [ ] Spike: Formular-1453-Generation als Prototype

### Mittelfristig (Monat 2–4)
- [ ] WZ-2008-Self-Assessment-UX entwerfen (juristisch sauber, Komplexitäts-Trigger für StB-Handover-Modus)
- [ ] Frageliste für Wizard finalisieren mit Anwalt + Steuerberater-Sanity-Check
- [ ] ELSTER-XML-Generierung gegen Zoll-Schemas validieren
- [ ] Partner-Portal für Energieberater bauen (Lead-Tracking, Provisions-Übersicht)
- [ ] Compliance-Schulung + Quiz für Vertriebspartner

### Strategisch parallel
- [ ] **Plan B vorbereiten**: § 54 EnergieStG erforschen, damit bei Politik-Risiko schnell umgeschwenkt werden kann
- [ ] Erste Gespräche mit 2–3 Stadtwerken über Whitelabel-Potenzial (langer Sales-Zyklus, früh starten)

## Quellen
- § 5 StBerG: https://www.gesetze-im-internet.de/stberg/__5.html
- § 9 StBerG (Provisionsverbot): https://dejure.org/gesetze/StBerG/9.html
- § 9a StBerG (Erfolgshonorar): https://www.gesetze-im-internet.de/stberg/__9a.html
- § 6 StBerG (Ausnahmen): https://www.gesetze-im-internet.de/stberg/__6.html
- § 9b StromStG: https://www.gesetze-im-internet.de/stromstg/__9b.html
- Zoll – Steuerentlastung § 9b: https://www.zoll.de/DE/Fachthemen/Steuern/Verbrauchsteuern/Strom/Steuerbeguenstigung/Steuerentlastungen/Steuerentlastung-nach-Par-9b-StromStG/steuerentlastung-nach-par-9b-stromstg_node.html
- OLG Köln 6 U 143/21 (Vermittlungsprovision wettbewerbswidrig): https://www.dr-bahr.com/news/online-vermittlungs-provision-fuer-neukunden-von-steuerberatern-wettbewerbswidrig.html
- BOStB: https://www.bstbk.de/downloads/bstbk/recht-und-berufsrecht/fachinfos/BStBK_Berufsordnung-inkl-Fachberaterordnung.pdf
