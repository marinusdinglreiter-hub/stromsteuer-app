import { createHash } from "node:crypto";

/**
 * SHA-256-Hex-Digest fuer Integritaetsnachweise (z. B. der Mandat-PDF oder der
 * kanonischen Einwilligungstexte).
 *
 * Wird bei der Signatur berechnet und im append-only `AuditEvent` sowie auf der
 * `Application` gespeichert. Da der Audit-Trail per DB-Trigger unveraenderbar ist,
 * ist der Hash damit manipulationssicher verankert: jede spaetere Aenderung an der
 * gespeicherten Datei fuehrt zu einem abweichenden Hash und ist so nachweisbar.
 */
export function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}
