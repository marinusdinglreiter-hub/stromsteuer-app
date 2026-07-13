"use server";

import { BRAND } from "@/config/brand";
import { getServerCaller } from "@/server/trpc";

/**
 * Idempotent: ruft `application.submit` auf. Wenn der Antrag bereits
 * PENDING_REVIEW ist, passiert nichts. Wird von der Danke-Seite beim ersten
 * Render getriggert (RSC-Call via Server Action).
 */
export async function triggerSubmitAction(): Promise<
  | { ok: true; status: string }
  | { ok: false; error: string }
> {
  try {
    const caller = await getServerCaller();
    const updated = await caller.application.submit({
      brandName: BRAND.name,
      brandShortName: BRAND.shortName,
      kanzleiName: BRAND.kanzlei.name,
      kanzleiAnwalt: BRAND.kanzlei.anwalt,
    });
    return { ok: true, status: updated.status };
  } catch (err) {
    console.warn("[triggerSubmitAction] fehlgeschlagen:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Submit fehlgeschlagen.",
    };
  }
}
