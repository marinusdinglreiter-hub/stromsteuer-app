import { z } from "zod";

/**
 * Server-Env-Validierung. Optional-Felder fallen im MVP graceful zurueck,
 * wenn die Credentials lokal noch nicht gesetzt sind — z.B. OCR ist dann
 * deaktiviert, Storage-Uploads werfen einen klaren Fehler statt eines
 * kryptischen SDK-Stacks.
 */
const schema = z.object({
  AWS_REGION: z.string().default("eu-central-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  /** Bucket fuer hochgeladene Stromrechnungen. */
  SUPABASE_BUCKET_BELEGE: z.string().default("belege"),
  /** Bucket fuer generierte Dateien (Mandat-PDF, Signatur-PNG, Kanzlei-Pakete). */
  SUPABASE_BUCKET_GENERATED: z.string().default("generated"),

  /** Resend (Transaktionale E-Mails). Optional — Versand ist no-op ohne Key. */
  RESEND_API_KEY: z.string().optional(),
  /**
   * Absender-Adresse fuer Kunden-Mails. Muss in Resend verifiziert sein.
   * Bewusst KEIN .email(): das From-Feld nutzt das Format "Name <addr>",
   * das .email() faelschlich ablehnt (und in Zod 3.25 auch den Default
   * validiert -> env() wuerde sonst bei jedem Aufruf werfen).
   */
  RESEND_FROM_EMAIL: z
    .string()
    .min(1)
    .default("Stromsteuer-Erstattung <no-reply@example.de>"),
  /** Empfaenger-Inbox der Partnerkanzlei. */
  KANZLEI_EMAIL_INBOX: z.string().email().default("kanzlei@example.de"),

  /** Oeffentliche Basis-URL der App, z. B. https://stromsteuer.de. */
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),

  /** Backoffice-Login fuer die Partnerkanzlei. Basic-Auth via Middleware. */
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().optional(),

  /** Shared Secret fuer den Cron-Endpoint (verhindert oeffentliches Trigger). */
  CRON_SECRET: z.string().optional(),

  /** Tage, nach denen unfertige Antraege automatisch geloescht werden. */
  DRAFT_TTL_DAYS: z.coerce.number().int().min(7).max(365).default(90),

  /** Optionales Sentry-DSN — wenn leer, ist Error-Tracking aus. */
  SENTRY_DSN: z.string().optional(),
  /** Plausible-Domain (z. B. "stromsteuer.de") — wenn gesetzt, wird das Script eingebunden. */
  PLAUSIBLE_DOMAIN: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (cached) return cached;
  cached = schema.parse(process.env);
  return cached;
}

export function hasAwsCredentials(): boolean {
  const e = env();
  return Boolean(e.AWS_ACCESS_KEY_ID && e.AWS_SECRET_ACCESS_KEY);
}

export function hasSupabaseCredentials(): boolean {
  const e = env();
  return Boolean(e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY);
}
