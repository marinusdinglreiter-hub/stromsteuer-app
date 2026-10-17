"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { rateLimit } from "@/server/rate-limit";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/server/session";
import { getServerCaller } from "@/server/trpc";

/**
 * Startet den Antrag fuers Folgejahr aus dem Vorjahres-Antrag: legt ihn an,
 * setzt den Session-Cookie und leitet zu den Rechnungen. Bewusst eine Aktion
 * (POST) und kein Link: Mail-Scanner rufen Links ab und wuerden sonst bei jeder
 * Erinnerungsmail einen Antrag anlegen.
 */
export async function folgejahrStartenAction(token: string): Promise<{ ok: false; error: string }> {
  const limit = rateLimit(`folgejahr:${token}`, 3, 60 * 60 * 1000);
  if (!limit.ok) {
    return { ok: false, error: "Zu viele Versuche. Bitte in einigen Minuten erneut versuchen." };
  }
  let sessionToken: string;
  try {
    const caller = await getServerCaller();
    ({ sessionToken } = await caller.folgejahr.starten({ token }));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Der Antrag konnte nicht angelegt werden." };
  }
  cookies().set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);
  redirect("/antrag/schritt-2/lieferstellen");
}
