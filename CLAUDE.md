# Stromsteuer-SaaS — Project Context

## Was wir bauen

B2B-SaaS-Web-App, die deutsche Gewerbekunden bei der Stromsteuer-Erstattung
nach § 9b StromStG unterstützt. Positioniert als **Software-Tool** (§ 6 Nr. 2
StBerG), niemals als Steuerberatungs-Dienstleistung.

## Tech-Stack

- Next.js 14 App Router, TypeScript strict
- Tailwind CSS, shadcn/ui
- tRPC für Server-Communication
- Prisma + PostgreSQL via Supabase (EU/Frankfurt)
- Auth.js mit Supabase-Adapter, TOTP-2FA
- Stripe für Payments
- AWS Textract (eu-central-1) für OCR
- Resend für Transactional Mails
- Sentry + Plausible für Monitoring
- Hosting: Vercel (Frankfurt-Edge)
- Monorepo: Turborepo + pnpm

## Repo-Struktur

```
/apps/web         Next.js (Marketing + App in einem Projekt)
/packages/db      Prisma Schema + Migrations
/packages/ui      Shared shadcn-Komponenten
/packages/api     tRPC Router (importable von /apps/web)
/packages/forms   PDF/XML Templates + Generatoren
/packages/config  ESLint, TS, Tailwind Config
```

## Coding-Konventionen

- TypeScript strict, kein `any`
- Funktions-Komponenten + Hooks, keine Klassen
- Server-Code in `app/api/*` oder als tRPC-Procedure
- Client-Komponenten markiert mit `"use client"`
- Tailwind + shadcn statt eigenes CSS
- Zod für jede externe Validierung (Forms, API-Inputs)
- Error-Handling: niemals Errors verschlucken, immer typisieren
- Async/Await statt Promises
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`

## Wichtige Geschäftsregeln (verbindlich)

1. **Niemals Steuerberatung.** Software gibt keine bewertenden Aussagen ab.
2. **Honorar nie % der Erstattung.** Festpreis-Tiers 149/199/499/1.490 €.
3. **Audit-Log unveränderlich.** Jede User-Aktion wird zeitgestempelt geloggt.
4. **DSGVO-First.** EU-Hosting, Datenexport + Löschung als Self-Service.
5. **Multi-Tenant-Sicherheit.** Row Level Security in Postgres, getestet.
6. **Quellenlinks Pflicht.** Jede steuerliche Aussage im UI verlinkt auf
   gesetze-im-internet.de, BMF oder Zoll.

## Dateien, die du als Kontext lesen solltest

Diese Dateien liegen außerhalb des Repos im OneDrive-Doku-Ordner und
beschreiben Geschäftsmodell, Architektur, Sprints und Risiken im Detail:

- `C:\Users\Marinus\OneDrive\Dokumente\Claude\Projects\Stromsteuererstattung\Zusammenfassung_Geschäftsmodell.md`
  — rechtlicher Rahmen, Modell-Entscheidungen
- `C:\Users\Marinus\OneDrive\Dokumente\Claude\Projects\Stromsteuererstattung\Code_Plan.md`
  — Sprint-by-Sprint Tasks mit Acceptance Criteria
- `C:\Users\Marinus\OneDrive\Dokumente\Claude\Projects\Stromsteuererstattung\Claude_Code_Setup.md`
  — Setup-Anleitung und Workflow-Regeln

Wenn du eine größere Architektur-Entscheidung treffen sollst, frage nach
oder lies eine dieser Dateien zuerst.

## Aktueller Sprint

**Sprint 0 — Setup & Skeleton** (Teil 1: Skeleton ohne Auth/Deploy)
Ziel: Repo läuft lokal, `pnpm dev` startet Next.js, Prisma gegen Supabase
verbunden. Auth.js, GitHub Actions, Vercel-Deploy folgen in eigenen Plänen.

## Arbeitsweise

- Bei komplexen Tasks zuerst Plan vorschlagen, dann nachfragen, dann coden.
- Bevor neue Library installiert wird: kurz begründen warum.
- Bei Schema-Änderungen: immer Migration generieren, niemals direkt SQL.
- Tests für `packages/api/calc/*` und `packages/forms/*` sind Pflicht.
- Commits klein halten, ein logischer Schritt pro Commit.
- Bei Unsicherheit über Geschäftslogik: nachfragen, nicht raten.
