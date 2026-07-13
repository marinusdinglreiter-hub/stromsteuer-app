# Stromsteuer-App — Project Context

## Was wir bauen

B2B-Web-App, die deutschen Gewerbekunden die Stromsteuer-Erstattung nach
§ 9b StromStG abnimmt — im **Partnerkanzlei-Modell**:

- **Kein Login.** Identifikation laeuft ueber einen `sessionToken`-Cookie (`sst`),
  der beim Start eines Antrags gesetzt wird. Status-Abruf ueber Magic-Link
  `/status/<token>`.
- Der Kunde durchlaeuft einen Wizard, laedt Stromrechnungen hoch (OCR optional)
  und **unterschreibt ein Mandat** per Signatur-Canvas.
- Eine **Partnerkanzlei** (aktuell WINDORFER RODE Rechtsanwaelte) reicht beim
  Hauptzollamt ein und uebernimmt die Vertretung.
- **Verguetung: Erfolgshonorar 14,1 % (§ 4a RVG) der Erstattung nach 250-€-Sockel,
  Mindesthonorar 500 €.** Nur im Erfolgsfall. Siehe `packages/api/src/calc/stromsteuer.ts`.

> Wichtig: Das traegt rechtlich, weil eine echte Kanzlei einreicht (nicht die
> Software). Das alte Self-Submit-/Festpreis-/Stripe-/ELSTER-Modell ist **ueberholt** —
> nicht zurueckbauen.

## Tech-Stack (Ist-Zustand)

- Next.js 14.2 App Router, TypeScript strict
- Tailwind CSS, eigene UI-Primitives unter `packages/ui` (shadcn-Stil)
- tRPC 11 + Server Actions
- Prisma 5.22 + PostgreSQL (Supabase, EU/Frankfurt)
- Supabase Storage (Buckets `belege` privat + `generated`)
- AWS Textract (eu-central-1) fuer OCR — optional, Fallback = manuelle Eingabe
- Resend fuer transaktionale E-Mails — optional, Fallback = Console-Log
- pdf-lib (Mandat-PDF) + exceljs/jszip (Kanzlei-Uebergabe-Paket)
- Backoffice `/admin/*`: HTTP Basic Auth via `middleware.ts`
- Cron `/api/cron/expire` (Draft-Cleanup), getriggert ueber `vercel.json`
- Monorepo: Turborepo + pnpm

**Nicht im Einsatz** (waren im alten Plan, bewusst NICHT gebaut): Stripe, Auth.js/2FA,
ELSTER-XML / Formular 1453. Sentry/Plausible sind optional ueber Env vorgesehen.

## Repo-Struktur (real)

```
/apps/web                 Next.js (Marketing + Wizard + /admin + /status)
  src/app/(marketing)     Landing, Impressum, Datenschutz, AGB
  src/app/(wizard)/antrag Wizard-Seiten (schritt-1..3)
  src/app/antrag/...      Server Actions + Bootstrap-Route + Danke-Seite
  src/app/admin           Kanzlei-Backoffice
  src/app/status/[token]  Oeffentliche Status-Seite (Magic-Link)
  src/app/api/cron/expire  Draft-Cleanup-Cron
  src/components, src/config, src/data, src/lib, src/server
/packages/api             tRPC-Router, calc, ocr, forms, email, storage, audit
/packages/db              Prisma Schema + Migrations + Client
/packages/ui              UI-Primitives
/packages/config          ESLint, TS, Tailwind
```

## Coding-Konventionen

- TypeScript strict, kein `any`
- Funktions-Komponenten + Hooks, keine Klassen
- Client-Code mit `"use client"`; Server-Logik als tRPC-Procedure oder Server Action
- Tailwind statt eigenem CSS; gemeinsame Werte in `apps/web/src/config/*`
- Zod fuer jede externe Validierung (Forms, tRPC-Inputs, Query-Parameter)
- Schwellwerte/Jahre zentral in `apps/web/src/config/antrag.ts`; der wirtschaftliche
  Mindestverbrauch kommt kanonisch aus `@stromsteuer/api/calc`
- Async/Await, Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)

## Verbindliche Geschaeftsregeln

1. **Keine Steuerberatung durch die Software.** Bewertende Fragen beantwortet der
   Kunde; die Kanzlei reicht ein.
2. **Honorar = RVG-Erfolgshonorar (14,1 %, Floor 500 €)** — Logik nur in
   `calc/stromsteuer.ts`, nirgends duplizieren.
3. **Audit-Log ist unveraenderlich.** Jede relevante Aktion schreibt einen
   `AuditEvent` (siehe `packages/api/src/audit.ts`); geldrelevante Schritte in
   derselben DB-Transaktion. UPDATE/DELETE per DB-Trigger blockiert.
4. **DSGVO-First.** EU-Hosting; Belege sind PII → privater Bucket; Draft-Auto-Loeschung
   nach `DRAFT_TTL_DAYS`.
5. **Mandat-Texte sind juristisch.** `forms/mandat.ts` enthaelt aktuell Platzhalter —
   vor Live durch finale Kanzlei-Templates ersetzen.
6. **Backoffice/Cron nie ohne Secret.** Ohne `ADMIN_PASSWORD` ist `/admin` gesperrt;
   ohne `CRON_SECRET` ist der Cron-Endpoint deaktiviert.

## Kern-Flow

`/` (Calculator) → `GET /antrag/start` (legt Application an, setzt Cookie) →
Wizard: schritt-1 (Berechnen) → schritt-2 (Lieferstellen/OCR + Triage) →
schritt-3 (Firma + Mandat/Signatur) → `/antrag/danke` (submit, Kanzlei-Paket + Mails) →
`/status/<token>`. Backoffice: `/admin/eingang` → `/admin/<id>` (Status-Updates).

## Wichtige Dateien

- `packages/api/src/calc/stromsteuer.ts` — Erstattungs-/Honorarberechnung (getestet)
- `packages/api/src/routers/application.ts` — Wizard-Mutations (bootstrap..submit)
- `packages/api/src/routers/admin.ts` — Backoffice (Status, expireDrafts)
- `packages/api/src/audit.ts` — Audit-Log-Helper
- `packages/api/src/forms/{mandat,kanzleiPaket}.ts` — PDF + Uebergabe-ZIP
- `packages/db/prisma/schema.prisma` — Datenmodell (+ migrations/)
- `apps/web/src/config/antrag.ts` — Schwellwerte, Grenzen, Antragsjahr

## Dev-Befehle

```
pnpm install
pnpm db:generate                 # Prisma Client
pnpm --filter @stromsteuer/db exec prisma migrate deploy   # Schema anwenden
pnpm dev                         # Next.js auf :3000
pnpm --filter @stromsteuer/api test
pnpm typecheck                   # alle Pakete
```

## Arbeitsweise

- Bei komplexen Tasks zuerst Plan vorschlagen, dann nachfragen, dann coden.
- Neue Library? Kurz begruenden. Schema-Aenderung? Immer Migration generieren.
- Tests fuer `calc` + `forms` sind Pflicht. Commits klein halten.
- Bei Unsicherheit ueber Geschaeftslogik/Recht: nachfragen, nicht raten.
```
