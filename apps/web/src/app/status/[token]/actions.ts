"use server";

import { revalidatePath } from "next/cache";

import { getServerCaller } from "@/server/trpc";
import { rateLimit } from "@/server/rate-limit";

export type PortalActionResult = { ok: true } | { ok: false; error: string };

function fehler(err: unknown, fallback: string): PortalActionResult {
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

/** Erste Frage: ELSTER-Zertifikat im Haus, beim Steuerberater oder nicht vorhanden. */
export async function setElsterAction(
  token: string,
  status: "VORHANDEN" | "BEIM_STB" | "FEHLT" | "BEANTRAGT",
): Promise<PortalActionResult> {
  try {
    const caller = await getServerCaller();
    await caller.portal.setElster({ token, status });
  } catch (err) {
    return fehler(err, "Speichern fehlgeschlagen.");
  }
  revalidatePath(`/status/${token}`);
  return { ok: true };
}

export async function setSchrittAction(
  token: string,
  schritt: number,
  erledigt: boolean,
): Promise<PortalActionResult> {
  try {
    const caller = await getServerCaller();
    await caller.portal.setSchritt({ token, schritt, erledigt });
  } catch (err) {
    return fehler(err, "Speichern fehlgeschlagen.");
  }
  revalidatePath(`/status/${token}`);
  return { ok: true };
}

/**
 * Zugangscode und Beteiligten-Nummer abschicken. Streng begrenzt, weil der
 * Token im Link steht: wer ihn kennt, soll keine Codes durchprobieren oder
 * die Kanzlei mit Mails fluten koennen.
 */
export async function codeEinreichenAction(
  token: string,
  code: string,
  beteiligtenNummer: string,
): Promise<PortalActionResult> {
  const limit = rateLimit(`portal-code:${token}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Zu viele Versuche. Bitte in ${Math.ceil(limit.retryAfterSeconds / 60)} Minuten erneut versuchen.`,
    };
  }
  try {
    const caller = await getServerCaller();
    await caller.portal.codeEinreichen({ token, code, beteiligtenNummer });
  } catch (err) {
    return fehler(err, "Der Code konnte nicht gespeichert werden.");
  }
  revalidatePath(`/status/${token}`);
  return { ok: true };
}

export async function rueckrufAction(token: string): Promise<PortalActionResult> {
  const limit = rateLimit(`portal-rueckruf:${token}`, 3, 60 * 60 * 1000);
  if (!limit.ok) {
    return { ok: false, error: "Wir haben Ihre Anfrage bereits erhalten und melden uns." };
  }
  try {
    const caller = await getServerCaller();
    await caller.portal.rueckrufAnfordern({ token });
  } catch (err) {
    return fehler(err, "Anfrage fehlgeschlagen.");
  }
  revalidatePath(`/status/${token}`);
  return { ok: true };
}
