# Stromsteuer-Erstattung (§ 9b StromStG)

Web-App, die Unternehmen des Produzierenden Gewerbes und der Land- und
Forstwirtschaft durch die Stromsteuer-Entlastung nach § 9b StromStG führt.
Der Kunde lädt seine Stromrechnungen hoch, beantwortet die Erklärungen und
unterschreibt zwei Verträge. Daraus entsteht ein vollständiger
Antragsdatensatz, den eine Partnerkanzlei im Zoll-Portal einreicht.

**Status:** MVP, noch nicht produktiv. Vertragstexte sind Platzhalter
(`[JURISTISCH ZU PRUEFEN]`), die Partnerkanzlei ist noch nicht ausgewählt.

## Ablauf

1. **Rechner:** Erstattung und Festpreis nach Verbrauchsband, ohne Anmeldung.
2. **Rechnungen:** Upload, OCR (AWS Textract oder lokale PDF-Extraktion) liest
   Verbrauch, Versorger, Zeitraum und ausgewiesene Stromsteuer.
3. **Erklärungen:** Triage nach Formular 1453 (u. a. Punkt 6 und 7,
   Beihilfe-Selbsterklärung 1139, Privat- und E-Auto-Anteile).
4. **Firmendaten:** Unternehmensart, Steuernummer, Hauptzollamt, Bankverbindung.
5. **Vorprüfung und Verträge:** kostenlose Vorprüfung mit Hardstop, dann
   Aufbereitungsvertrag (Festpreis) und Kanzleimandat mit je eigener Signatur.
   Beide PDFs werden per SHA-256 und unveränderlichem Audit-Log gesichert.
6. **Datenblatt:** Excel mit dem Antragsdatensatz in der Feldreihenfolge von
   Formular 1453, Prüfprotokoll je Lieferstelle und Liste der fehlenden
   Angaben. Im Backoffice unter `/admin/<id>/datenblatt`, jederzeit aus dem
   aktuellen Stand erzeugt, und Teil des Kanzlei-Pakets.

## Aufbau

```
apps/web            Next.js 14 (App Router): Landing, Wizard, Statusseite, Backoffice
packages/api        tRPC-Router, Berechnung (calc/), OCR, Vertrags-PDFs, Datenblatt, Mails
packages/antrag     Vollständigkeits-Gate, Vorprüfung, Antragsdatensatz (rein, ohne IO)
packages/db         Prisma-Schema und Migrationen (PostgreSQL/Supabase)
packages/ui         UI-Bausteine
packages/config     ESLint-, TypeScript- und Tailwind-Konfiguration
docs/               Formular-Spezifikation, Onboarding-Vorlagen, Quellen
```

Entlastungssätze stehen nur in `packages/api/src/calc/rates.ts`, Preise nur in
`packages/api/src/calc/preise.ts`. Die verbindliche Arbeitsliste ist
[`TODO.md`](TODO.md).

## Lokal starten

Voraussetzungen: Node (aktuelle LTS), pnpm 10, eine PostgreSQL-Datenbank (z. B. Supabase).

```bash
pnpm install
cp .env.example .env            # Werte eintragen, auch nach apps/web/.env kopieren
pnpm db:generate
pnpm --filter @stromsteuer/db exec prisma migrate deploy
pnpm dev                        # http://localhost:3000
```

Prüfen:

```bash
pnpm typecheck
pnpm lint
pnpm --filter @stromsteuer/api --filter @stromsteuer/antrag test
```

`/antrag/demo` legt lokal einen vorausgefüllten Antrag an. Das Backoffice unter
`/admin` braucht `ADMIN_PASSWORD`.

## Rechtliches

Die Software berät nicht steuerlich und stellt keine Anträge. Sie bereitet
Daten auf; Einreichung und Vertretung übernimmt eine Kanzlei. Alle Rechte
vorbehalten — der Code ist einsehbar, aber nicht zur Weiterverwendung
lizenziert.
