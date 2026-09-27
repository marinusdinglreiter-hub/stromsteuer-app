# Code-Plan — Stromsteuer-App

> [!info] Stand 17.06.2026 — Ist-Zustand statt Sprint-Plan
> Das Produkt wurde bewusst auf das **Partnerkanzlei-Modell** umgestellt. Dieser
> Plan beschreibt jetzt den **tatsächlich gebauten** Stand und die offene
> Roadmap — nicht mehr den ursprünglichen 22-Wochen-SaaS-Sprintplan (der ein
> anderes Produkt beschrieb und überholt ist).
> Tags: #code/plan #status/in-progress #produkt/partnerkanzlei

---

## Architektur — Partnerkanzlei-Modell

- **Kein Login.** Identifikation über `sessionToken`-Cookie (`sst`). Status-Abruf
  über Magic-Link `/status/<token>`.
- Kunde durchläuft einen Wizard, lädt Stromrechnungen hoch (OCR optional) und
  **unterschreibt ein Mandat** per Signatur-Canvas.
- Eine **Partnerkanzlei** (WINDORFER RODE Rechtsanwälte) reicht beim Hauptzollamt
  ein und übernimmt die Vertretung.
- **Honorar = Erfolgshonorar 14,1 % (§ 4a RVG)** der Erstattung nach 250-€-Sockel,
  **Mindesthonorar 500 €**, nur im Erfolgsfall.

> Das trägt rechtlich, weil eine echte Kanzlei einreicht (nicht die Software).
> Das alte Self-Submit-/Festpreis-/Stripe-/ELSTER-Modell ist überholt.

**Code liegt unter `C:\dev\stromsteuer-app`** (außerhalb OneDrive). Die kanonische
Projekt-Doku ist die `CLAUDE.md` im Repo-Root.

---

## Tech-Stack (Ist)

- Next.js 14.2 App Router, TypeScript strict, Tailwind
- tRPC 11 + Next Server Actions
- Prisma 5.22 + PostgreSQL (Supabase EU/Frankfurt)
- Supabase Storage (Buckets `belege` + `generated`)
- AWS Textract (OCR) — optional, Fallback manuelle Eingabe
- Resend (E-Mails) — optional, Fallback Console
- pdf-lib (Mandat-PDF) + exceljs/jszip (Kanzlei-Paket)
- Backoffice `/admin/*`: HTTP Basic Auth (Middleware)
- Cron `/api/cron/expire` (Draft-Cleanup) via `vercel.json`
- Monorepo: Turborepo + pnpm

**Nicht im Einsatz** (bewusst): Stripe, Auth.js/2FA, ELSTER-XML/Formular 1453.
Sentry/Plausible nur optional über Env vorgesehen.

---

## Kern-Flow

`/` (Calculator) → `GET /antrag/start` (Application anlegen, Cookie setzen) →
Wizard: **schritt-1** Berechnen → **schritt-2** Lieferstellen/OCR + Triage →
**schritt-3** Firma + Mandat/Signatur → `/antrag/danke` (submit: Kanzlei-Paket +
Mails) → `/status/<token>`. Backoffice: `/admin/eingang` → `/admin/<id>`.

---

## Implementierungs-Status

| Bereich | Status |
|---|---|
| Landing + Calculator | ✅ live |
| Wizard (schritt 1–3, Triage, Lieferstellen, Mandat/Signatur) | ✅ live |
| Berechnung (0,02 €/kWh, 250-€-Sockel, RVG-Honorar 14,1 %, Floor 500 €) | ✅ getestet |
| OCR (AWS Textract + Parser) | ✅ mit Fallback |
| Mandat-PDF + Kanzlei-Paket-ZIP | ⚠️ funktional, **Texte = Platzhalter** |
| E-Mails (Resend, Status-Templates) | ✅ mit Fallback |
| Supabase Storage (Signed URLs) | ✅ / ⚠️ Bucket-Privacy + RLS prüfen |
| Backoffice (Basic Auth, Status-Updates, Expiry-Cron) | ✅ |
| **Audit-Log** (AuditEvent + Helper + Transaktionen) | ✅ neu (17.06.) |
| **DB-Migrations** | ✅ neu (`0_init`, `1_audit_immutable`) — **noch nicht angewandt** |
| Security-Header + Cron-Härtung | ✅ neu (17.06.) |
| Stripe / ELSTER / Auth.js | ❌ bewusst nicht (überholt) |

---

## Update 17.06.2026 — heute umgesetzt (verifiziert: typecheck 5/5, lint 5/5, 24 Tests)

- `CLAUDE.md` neu geschrieben auf das Partnerkanzlei-Modell.
- Zentrale Config `apps/web/src/config/antrag.ts` (Antragsjahr, Schwellwerte,
  kWh-Grenzen) — verdrahtet in Hero, Calculator, MindestverbrauchBanner,
  AntragsjahrPicker, Bootstrap-Route. Hartkodiertes Jahr `2025` entfernt.
- `.env.example` vollständig (alle realen Variablen, Pflicht markiert).
- **Security:** `CRON_SECRET` jetzt Pflicht (sonst 503) + `timingSafeEqual`;
  Security-Header (CSP, X-Frame-Options, HSTS, …) in `next.config.mjs`.
- **Audit-Log:** `AuditEvent`-Modell + `packages/api/src/audit.ts`
  (`logAudit`/`tryLogAudit`), in alle Mutations verdrahtet. Geldrelevante Schritte
  (signMandat, submit, admin.updateStatus) schreiben State + Audit **atomar** in
  einer `$transaction`.
- **Migrations:** `0_init` (komplettes Schema) + `1_audit_immutable` (Trigger →
  Audit-Log append-only).
- a11y: `SignaturCanvas` mit `role`/`aria-label`.
- **Web-App-Politur (P2):** `FormAlert`-Komponente überall, strukturierte Upload-Fehler,
  Inline-Validierung (E-Mail/Name/PLZ), getippte-Unterschrift-Fallback, mobil scrollbare
  Admin-Tabelle.
- **Hygiene (P3):** tRPC-Spec auf stable, Rate-Limiting `/status`, CI-Pipeline.
  **Production-Build erstmals end-to-end verifiziert** (16 Seiten, grün).

---

## Offene Roadmap

**P0 — vor dem ersten echten Kunden (braucht dich/DB)**
- [ ] Migrations anwenden: `pnpm --filter @stromsteuer/db exec prisma migrate deploy`
  - ⚠️ Falls Supabase die Tabellen schon per `db push` hat → baselinen
    (`prisma migrate resolve --applied 0_init`) und AuditEvent-DDL einmalig manuell.
- [ ] In Produktion `ADMIN_PASSWORD` + `CRON_SECRET` setzen.

**P1 — Compliance & Recht**
- [ ] Supabase Bucket `belege` privat + RLS (PII = Stromrechnungen).
- [ ] **Mandat-Texte** in `forms/mandat.ts` durch finale Kanzlei-Templates ersetzen
  (anwaltlich geprüft) — Live-Blocker.
- [ ] Echte Kontakt-E-Mail in `config/brand.ts` (steht auf `info@example.de`).

**P2 — Web-App-Politur** ✅ erledigt 17.06.2026
- [x] Einheitliche `FormAlert`-Komponente — ersetzt rohes `<pre>` in MassenUpload
  (jetzt strukturierte Fehlerliste) sowie die Ad-hoc-Boxen in FirmaForm/TriageForm/MandatForm.
- [x] Stärkere E-Mail-Validierung (`lib/validation.ts`) + Inline-Hinweise in MandatForm;
  PLZ-Feinschliff (maxLength/title) in FirmaForm.
- [x] **Getippte-Unterschrift-Fallback** in MandatForm (Zeichnen/Tippen-Umschalter,
  Tastatur-a11y) — erzeugt dasselbe PNG-Format wie der Canvas.
- [x] Admin-Tabelle mobil: horizontal scrollbar statt gequetschter Spalten
  (volle Card-Stapelung optional als Folge-Politur).

**P3 — Hygiene** (überwiegend erledigt 17.06.2026)
- [x] tRPC-Deklaration von RC auf `^11.0.0` (löst auf stable 11.17.0 auf).
- [x] Rate-Limiting auf `/status/[token]` (In-Memory-Limiter im Middleware,
  40 req/min/IP → 429). Cron ist bereits per `CRON_SECRET` geschützt.
- [x] CI-Pipeline `.github/workflows/ci.yml` (install → prisma generate → lint →
  typecheck → test → build). Production-Build lokal verifiziert (16 Seiten, grün).
- [ ] Sentry (braucht `@sentry/nextjs`-Install + DSN — offen).
- [ ] Rate-Limiting instanzübergreifend (Upstash-Redis) statt In-Memory — optional.

---

## Dev-Befehle

```
pnpm install
pnpm db:generate
pnpm --filter @stromsteuer/db exec prisma migrate deploy
pnpm dev
pnpm --filter @stromsteuer/api test
pnpm typecheck   # alle Pakete
pnpm lint
```

---

## Historie

Der ursprüngliche 22-Wochen-Sprintplan (Self-Submit-SaaS mit Stripe, Auth.js,
ELSTER-XML, Festpreis-Tiers, Energieberater-Provisionskanal) ist durch den Pivot
auf das Partnerkanzlei-Modell überholt. Die rechtliche Herleitung des Modells
steht in `Zusammenfassung_Geschäftsmodell.md`.
