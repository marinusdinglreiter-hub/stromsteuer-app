import {
  prisma,
  type AuditActor,
  type AuditEventType,
  type Prisma,
} from "@stromsteuer/db";

/**
 * Audit-Logging fuer den unveraenderlichen Aktions-Trail.
 *
 * Es wird ausschliesslich INSERT genutzt — Audit-Eintraege werden nie
 * aktualisiert oder geloescht. Fuer geld-/statusrelevante Aktionen sollte der
 * Audit-Eintrag in derselben DB-Transaktion wie die Zustandsaenderung
 * geschrieben werden (uebergib dazu den Transaction-Client als `db`), damit
 * Zustand und Trail nicht auseinanderlaufen koennen.
 */

/** Prisma-Client oder Transaction-Client. */
type Db = typeof prisma | Prisma.TransactionClient;

export type AuditInput = {
  antragId?: string | null;
  type: AuditEventType;
  actor?: AuditActor;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/** Schreibt einen Audit-Eintrag. Wirft bei Fehler (fuer Transaktionen). */
export async function logAudit(input: AuditInput, db: Db = prisma): Promise<void> {
  await db.auditEvent.create({
    data: {
      antragId: input.antragId ?? null,
      type: input.type,
      actor: input.actor ?? "CUSTOMER",
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    },
  });
}

/**
 * Best-effort-Variante: loggt, ohne den Aufrufer bei Fehlern zu unterbrechen.
 * Fuer unkritische Schritte (Calc/Triage/Firma speichern), bei denen ein
 * fehlender Audit-Eintrag den Nutzerfluss nicht blockieren soll.
 */
export async function tryLogAudit(input: AuditInput): Promise<void> {
  try {
    await logAudit(input);
  } catch (err) {
    console.error("[audit] Eintrag fehlgeschlagen:", err);
  }
}
