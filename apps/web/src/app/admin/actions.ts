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
): Promise<AdminActionResult> {
  try {
    const caller = await getAdminServerCaller();
    await caller.admin.updateStatus({
      id,
      nextStatus,
      hzaAmount,
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

const VOLLMACHT_STATUS = [
  "OFFEN",
  "ERTEILT",
  "CODE_EINGELOEST",
  "AKTIV",
  "ABGELAUFEN",
  "SCOPE_FALSCH",
] as const;

/** Portal-Vollmacht des Mandanten setzen (Formular-Action im Backoffice). */
export async function adminSetPortalVollmachtAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("vollmachtStatus") ?? "");
  const beteiligtenNummer = String(formData.get("beteiligtenNummer") ?? "").trim();
  const vollmachtStatus = VOLLMACHT_STATUS.find((s) => s === status);
  if (!id || !vollmachtStatus) return;
  const caller = await getAdminServerCaller();
  await caller.admin.setPortalVollmacht({
    id,
    vollmachtStatus,
    beteiligtenNummer: beteiligtenNummer.length > 0 ? beteiligtenNummer : undefined,
  });
  revalidatePath(`/admin/${id}`);
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
