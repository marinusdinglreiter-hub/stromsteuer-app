# Fragenkatalog an Zoll, Anwalt und Kanzlei

Stand 17.10.2026. Alle Fragen, deren Antwort den Code oder das Angebot verändert und die wir
nicht selbst beantworten dürfen. Je Frage steht, was davon abhängt, damit nach der Antwort
klar ist, was zu tun ist. Quelle der Fragen: `TODO.md` Abschnitt 5, `docs/20-vollmachts-onboarding.md`
(Offene Punkte) und Fragen, die beim Bau entstanden sind.

Antworten bitte hier mit Datum und Quelle (Name, Mail, Gesprächsnotiz) nachtragen.

## A. Zoll-Service-Desk

Telefon 0800 8007-5452, Mo–Fr 8–17 Uhr. Die Fragen betreffen das Zoll-Portal für den Antrag
nach § 9b StromStG (Formular 1453).

| # | Frage | Wovon es abhängt | Antwort |
|---|---|---|---|
| A1 | Gibt es für Vertreter eine Schnittstelle oder Massendateneingabe für § 9b-Anträge, oder ist nur die Eingabe im Portal vorgesehen? | Mit Schnittstelle ersetzt sie das Portal-Eingabeblatt (`/admin/<id>/portal`); ohne bleibt es bei der manuellen Eingabe. | |
| A2 | Erfasst das Portal die Beihilfe-Selbsterklärung (Formular 1139) als Datensatz, oder wird ein PDF hochgeladen? | Nur bei PDF-Upload wird ein ausgefülltes 1139 gebraucht. Die PDFs haben keine Formularfelder, ein Befüllen ginge nur über Koordinaten. Bei Datensatz kommen die Felder ins Datenblatt. | |
| A3 | Gehört „Entlastung Energie/Strom für Unternehmen“ zu den Dienstleistungen, bei denen eine gesonderte Bevollmächtigung genügt und nur der Vertreter ein Portal-Konto braucht? | Falls ja, entfallen für den Kunden Registrierung und ELSTER-Zertifikat. Die Schritte 1 bis 3 und der ELSTER-Zweig in `portal-schritte.ts` und `PortalOnboarding.tsx` schrumpfen auf einen Bruchteil. | |
| A4 | Wie lange ist der Zugangscode für die Vollmacht gültig? | Bestimmt den Hinweis auf der Statusseite (Einlösen am selben Tag?), die Erinnerungstexte und ob die Kanzlei den Code zügig einlösen muss. | |
| A5 | Muss die digitale Bescheidbereitstellung zwingend aktiv sein, und gehen Bescheide dann ausschließlich in das Profil des Vertreters? | Der Satz zur Bescheid-Zustellung steht im Kanzleimandat und in der Mail „Vollmacht ist aktiv“. | |

## B. Anwalt

| # | Frage | Wovon es abhängt | Antwort |
|---|---|---|---|
| B1 | Geht die Verbrauchsstaffel (Festpreis nach Band) als aufwandsbezogener Werklohn durch, oder gilt sie als verdecktes Erfolgshonorar (§ 49b BRAO, § 9 StBerG)? | Zentrale Frage für das ganze Preismodell: `packages/api/src/calc/preise.ts`, Rechner, Vertrag. | |
| B2 | Grenzt die kostenlose Vorprüfung mit anschließend festem Preis sauber ab (keine Rechtsberatung, § 6 StBerG)? | Texte der Vorprüfung und des Hardstops im Wizard (`packages/antrag/src/vorpruefung.ts`). | |
| B3 | Formulierung der Leistungsbeschreibung im Aufbereitungsvertrag. | `packages/api/src/forms/legalTexts.ts`, Zeilen mit `[JURISTISCH ZU PRUEFEN]`. Bei Änderung `CONSENT_VERSION` erhöhen. | |
| B4 | Ist die Empfehlung der Kanzlei unbedenklich, solange in keine Richtung Geld für die Zuführung fließt? | Auftritt auf der Landingpage und im Wizard (Kanzlei-Karte). | |
| B5 | Dürfen die jährlichen Erklärungen (Triage, Beihilfe-Selbsterklärung) im Folgejahr mit Bestätigung des Kunden vorbelegt werden, oder müssen sie jedes Jahr neu abgegeben werden? | Heute beginnen sie im Folgejahr leer (`starteFolgejahr` in `folgejahr-service.ts`). Vorbelegung wäre eine kleine Änderung. | |
| B6 | Datenschutz: Ist die Speicherung des Portal-Zugangscodes (verschlüsselt, nur bis zum Einlösen) und der Stromrechnungen mit den vorgesehenen Löschfristen zulässig? Braucht es einen Auftragsverarbeitungsvertrag mit der Kanzlei? | `PORTAL_CODE_SECRET`-Verfahren, `DRAFT_TTL_DAYS`, Datenschutzseite (`app/(marketing)/datenschutz`). | |
| B7 | AGB, Impressum, Datenschutzerklärung und die rechtsbezogenen FAQ-Antworten. | Platzhalter in `app/(marketing)/*`, `components/landing/Faq.tsx`, Ablehnungstext in `app/status/[token]/page.tsx`. | |

## C. Partnerkanzlei

| # | Frage | Wovon es abhängt | Antwort |
|---|---|---|---|
| C1 | Muss die Kanzlei je Mandant beim Einlösen des Codes etwas gegenzeichnen, oder genügt das Einlösen? | Ablauf im Backoffice („Code ist eingelöst“, danach „aktiv“). | |
| C2 | Wie meldet die Kanzlei Bescheide zurück (Format, Frist, Weg), da sie ausschließlich in ihr Portal-Profil gehen? | Status `APPROVED`/`REJECTED`, `hzaAmount`, Mails an den Kunden und die Rechnungsstellung. Je nach Weg lohnt ein Upload des Bescheids im Backoffice. | |
| C3 | Name, Ansprechpartner und Kammer der Kanzlei, finale Vertragstexte (Mandat, Vollmacht). | `apps/web/src/config/brand.ts` (`kanzlei.*`), `legalTexts.ts`. | |
| C4 | Ablauf der Abnahme: Wer geht die 19 Schritte in `docs/80-abnahme-und-offene-punkte.md` bis wann durch? | Freigabe für den ersten echten Antrag. | |
