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
