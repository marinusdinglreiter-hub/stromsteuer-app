"use server";

import { revalidatePath } from "next/cache";

import { BRAND } from "@/config/brand";
import { getAdminServerCaller } from "@/server/trpc-admin";

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function adminUpdateStatusAction(
  id: string,
  nextStatus: "SUBMITTED" | "APPROVED" | "PAID" | "REJECTED",
  hzaAmount?: number,
  eingangsnummer?: string,
): Promise<AdminActionResult> {
  try {
    const caller = await getAdminServerCaller();
    await caller.admin.updateStatus({
      id,
      nextStatus,
      hzaAmount,
      eingangsnummer,
      brandName: BRAND.name,
      brandShortName: BRAND.shortName,
    });
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Status-Update fehlgeschlagen.",
    };
  }
  revalidatePath("/admin/eingang");
  revalidatePath(`/admin/${id}`);
  return { ok: true };
}

/** Feld im Portal-Eingabeblatt abhaken oder wieder oeffnen. */
export async function adminSetPortalFeldAction(
  id: string,
  feldKey: string,
  erledigt: boolean,
): Promise<AdminActionResult> {
  try {
    const caller = await getAdminServerCaller();
    await caller.admin.setPortalFeld({ id, feldKey, erledigt });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Speichern fehlgeschlagen.",
    };
  }
  revalidatePath(`/admin/${id}/portal`);
  return { ok: true };
}

export type VollmachtEingabe = {
  id: string;
  vollmachtStatus: "OFFEN" | "ERTEILT" | "CODE_EINGELOEST" | "AKTIV" | "ABGELAUFEN" | "SCOPE_FALSCH";
  elsterStatus?: "UNBEKANNT" | "VORHANDEN" | "BEIM_STB" | "FEHLT" | "BEANTRAGT";
  beteiligtenNummer?: string;
  /** Pruefung vor "aktiv": Dienstleistung lautet "Sonstige steuerliche Antraege" */
  scopeGeprueft?: boolean;
  /** Pruefung vor "aktiv": digitale Bescheidbereitstellung ist aktiv */
  bescheidZustellungAktiv?: boolean;
};

/** Portal-Vollmacht des Mandanten setzen (Backoffice). */
export async function adminSetPortalVollmachtAction(input: VollmachtEingabe): Promise<AdminActionResult> {
  try {
    const caller = await getAdminServerCaller();
    await caller.admin.setPortalVollmacht({
      ...input,
      beteiligtenNummer: input.beteiligtenNummer?.trim() ? input.beteiligtenNummer.trim() : undefined,
      brand: { name: BRAND.name, shortName: BRAND.shortName, kanzleiName: BRAND.kanzlei.name },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Speichern fehlgeschlagen." };
  }
  revalidatePath(`/admin/${input.id}`);
  revalidatePath(`/admin/${input.id}/portal`);
  return { ok: true };
}

export type CodeAnzeigeResult =
  | { ok: true; code: string; beteiligtenNummer: string | null }
  | { ok: false; error: string };

/** Zugangscode entschluesselt anzeigen (wird im Audit-Log vermerkt). */
export async function adminZugangscodeAnzeigenAction(id: string): Promise<CodeAnzeigeResult> {
  try {
    const caller = await getAdminServerCaller();
    const r = await caller.admin.zugangscodeAnzeigen({ id });
    return { ok: true, code: r.code, beteiligtenNummer: r.beteiligtenNummer };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Code nicht verfügbar." };
  }
}

/** Code wurde im Portal eingeloest: Code loeschen, Status setzen. */
export async function adminZugangscodeEingeloestAction(id: string): Promise<AdminActionResult> {
  try {
    const caller = await getAdminServerCaller();
    await caller.admin.zugangscodeEingeloest({ id });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Speichern fehlgeschlagen." };
  }
  revalidatePath(`/admin/${id}`);
  return { ok: true };
}

export async function adminExpireDraftsAction(): Promise<
  AdminActionResult & { stats?: Awaited<ReturnType<typeof callExpire>> }
> {
  try {
    const stats = await callExpire();
    revalidatePath("/admin/eingang");
    return { ok: true, stats };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Cleanup fehlgeschlagen.",
    };
  }
}

async function callExpire() {
  const caller = await getAdminServerCaller();
  return caller.admin.expireDrafts();
}
