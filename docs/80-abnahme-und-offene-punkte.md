# Abnahme und offene Punkte vor dem Livegang

Stand 17.10.2026. Alles, was in diesem Repo ohne Dritte machbar war, ist gebaut und
getestet. Dieses Dokument listet, was noch fehlt, wer es liefern muss und wie die
Kanzlei den Ende-zu-Ende-Fall abnimmt.

## 1. Offene Punkte und wer sie liefert

| Punkt | Wer | Wo im Code | Warum nicht von uns lösbar |
|---|---|---|---|
| Finale Vertragstexte (Aufbereitungsvertrag, Mandat, Vollmacht) | Partnerkanzlei, Anwalt | `packages/api/src/forms/legalTexts.ts` (Zeilen mit `[JURISTISCH ZU PRUEFEN]`), `forms/vertraege.ts` | Rechtstexte, dürfen nicht erfunden werden |
| Partnerkanzlei, Ansprechpartner, Kammer | Geschäftsführung | `apps/web/src/config/brand.ts` (`kanzlei.*`) | noch nicht ausgewählt |
| AGB, Impressum, Datenschutz | Anwalt | `apps/web/src/app/(marketing)/agb/page.tsx` u. a. | Rechtstexte |
| FAQ-Antworten mit Rechtsbezug, Ablehnungstext auf der Statusseite | Anwalt | `components/landing/Faq.tsx` (Zeilen 35, 46), `app/status/[token]/page.tsx` (Zeile 122) | siehe TODO 5, Anwaltsfragen |
| Screenshots des Zoll-Portals zu den fünf Schritten | jemand mit echtem Portal-Zugang | `apps/web/src/config/portal-schritte.ts` (`screenshot`), Bilder nach `apps/web/public/portal/` | Bilder lassen sich nicht erfinden |
| Rückmeldeweg für Bescheide (Kanzlei gibt Bescheid an uns zurück) | Absprache mit der Kanzlei | Status `APPROVED`/`REJECTED` im Backoffice, `hzaAmount` | Prozess, nicht Code |
| Fragen an Zoll-Service-Desk (0800 8007-5452) und Anwalt | Geschäftsführung | `TODO.md`, Abschnitt 5 | extern |
| Produktions-Umgebung: `ADMIN_PASSWORD`, `CRON_SECRET`, `PORTAL_CODE_SECRET`, `RESEND_*`, `NEXT_PUBLIC_CONTACT_*`, `KANZLEI_EMAIL_INBOX` | Betrieb | `.env.example`, README „Vor dem Livegang“ | Zugangsdaten |
| Migrationen 5 bis 9 in der Produktions-DB | Betrieb | `prisma migrate deploy` | siehe PR-Beschreibung |
| Merge von PR 1 und PR 2 nach `main` | Marinus | GitHub | Freigabe |

Optional und bewusst nicht gebaut: Sentry (`SENTRY_DSN` ist vorgesehen), Rate-Limiting über
Upstash statt In-Memory.

## 2. Abnahme Ende-zu-Ende (Kanzlei)

Zweck: Bevor ein echter Antrag im Zoll-Portal gestellt wird, geht die Kanzlei einen
vollständigen Fall mit Testdaten durch. Jeder Schritt hat ein erwartetes Ergebnis; Abweichungen
mit Datum und Schritt notieren.

Voraussetzungen: Produktions- oder Staging-Umgebung mit allen Variablen aus Abschnitt 1,
`RESEND_API_KEY` gesetzt, eine Testfirma mit erfundenen Daten, mindestens zwei Monatsrechnungen
als PDF mit Textebene und ein Foto einer Rechnung.

| # | Schritt | Erwartet |
|---|---|---|
| 1 | Rechner auf der Startseite, 800.000 kWh | Erstattung 15.750 €, Festpreis nach Band, kein Preis je MWh |
| 2 | Online-Antrag starten, Verbrauchsjahr wählen | Hinweis zum Stichtag nur nach dem 10.11. |
| 3 | Zwei Monatsrechnungen derselben Lieferstelle hochladen | eine Lieferstelle, Mengen addiert, Zeitraum und Stromsteuer gelesen |
| 4 | Dieselbe Datei erneut hochladen | Ablehnung „bereits hochgeladen“ |
| 5 | Foto einer Rechnung hochladen | „nicht automatisch lesbar“, Werte von Hand eintragbar |
| 6 | Erklärungen beantworten, Firmendaten eintragen | Vorprüfung ohne Hardstop |
| 7 | Beide Verträge getrennt unterschreiben | zwei PDFs, beide mit Hash im Audit-Log, Bestätigungsmail beim Kunden |
| 8 | Statusseite per Link öffnen | Portal-Anleitung, zwei Fortschrittsspuren |
| 9 | ELSTER-Zweig „liegt beim Steuerberater“ | Anschreiben zum Kopieren |
| 10 | Zugangscode und Beteiligten-Nummer eintragen | „Code ist eingegangen“, Mail an die Kanzlei ohne den Code |
| 11 | Backoffice: Code anzeigen, im Portal einlösen, „eingelöst“ | Code gelöscht, Status „eingelöst“ |
| 12 | „aktiv“ ohne Haken | Ablehnung; mit beiden Haken: Mail „Vollmacht ist aktiv“ beim Kunden |
| 13 | Portal-Eingabeblatt öffnen, Felder kopieren und abhaken | Reihenfolge wie Formular 1453, Herkunft und Konfidenz sichtbar, Belege daneben |
| 14 | Datenblatt (Excel) und Kanzlei-Paket (ZIP) herunterladen | Blätter Antragsdatensatz, Lieferstellen, Belege, Fehlend; Verträge und Original-Belege im ZIP |
| 15 | „Beim HZA eingereicht“ ohne Eingangsnummer | Ablehnung; mit Nummer: Statusmail, Eintrag im Audit-Log |
| 16 | Bescheid bewilligt, dann Auszahlung erfasst | Statusmails, Betrag am Antrag |
| 17 | Kontakthistorie am Mandanten prüfen | alle verschickten Mails als automatische Einträge, Telefonat von Hand ergänzbar |
| 18 | Im Januar (oder Testlauf des Crons): Folgejahr | Erinnerungsmail, „Antrag für <Jahr> starten“ legt Antrag mit Lieferstellen ohne Mengen an |
| 19 | Zugriff mit dem öffentlichen anon-Key auf die Tabellen (REST) | verweigert |

Abnahme: Alle 19 Schritte bestanden, Abweichungen behoben, Vertragstexte final eingespielt.
Erst danach den ersten echten Antrag einreichen.
