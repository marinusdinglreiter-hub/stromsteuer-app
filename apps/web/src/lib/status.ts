import type { BadgeVariant } from "@stromsteuer/ui/badge";

/**
 * Eine Stelle fuer Label und Farbe je Antragsstatus. Backoffice-Eingang,
 * Detailseite und Statusseite lesen von hier.
 */
export const APPLICATION_STATUSES = [
  "DRAFT",
  "SIGNED",
  "PENDING_REVIEW",
  "SUBMITTED",
  "APPROVED",
  "PAID",
  "REJECTED",
  "EXPIRED",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; badge: BadgeVariant }
> = {
  DRAFT: { label: "Entwurf", badge: "neutral" },
  SIGNED: { label: "Unterschrieben", badge: "info" },
  PENDING_REVIEW: { label: "Kanzlei-Prüfung", badge: "info" },
  SUBMITTED: { label: "Beim HZA", badge: "info" },
  APPROVED: { label: "Bewilligt", badge: "success" },
  PAID: { label: "Ausgezahlt", badge: "success" },
  REJECTED: { label: "Abgelehnt", badge: "danger" },
  EXPIRED: { label: "Abgelaufen", badge: "neutral" },
};

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function statusMeta(value: string): { label: string; badge: BadgeVariant } {
  return isApplicationStatus(value)
    ? STATUS_META[value]
    : { label: value, badge: "neutral" };
}
