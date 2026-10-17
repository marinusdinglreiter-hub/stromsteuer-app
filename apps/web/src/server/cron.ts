import { appRouter, createContext, type AppCaller } from "@stromsteuer/api";
import { NextResponse, type NextRequest } from "next/server";

import { gleichInKonstanterZeit } from "./admin-auth";

/**
 * Gemeinsame Absicherung der Vercel-Cron-Endpunkte. Vercel schickt
 * `Authorization: Bearer <CRON_SECRET>`, sobald die Variable gesetzt ist.
 *
 * Sicherheitsregel: Ohne gesetztes CRON_SECRET wird der Endpunkt komplett
 * verweigert (503), damit kein Loesch- oder Mail-Endpunkt versehentlich
 * oeffentlich ist. Gibt `null` zurueck, wenn der Aufruf erlaubt ist.
 */
export function pruefeCronAuth(request: NextRequest, name: string): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`[cron/${name}] CRON_SECRET nicht gesetzt — Endpoint deaktiviert.`);
    return new NextResponse("Cron ist nicht konfiguriert. CRON_SECRET setzen.", { status: 503 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (!gleichInKonstanterZeit(auth, `Bearer ${secret}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return null;
}

/** Admin-Caller fuer Cron-Laeufe (isAdmin=true, damit adminProcedure greift). */
export async function cronCaller(): Promise<AppCaller> {
  const ctx = await createContext({
    sessionToken: null,
    ip: null,
    userAgent: "vercel-cron",
    isAdmin: true,
  });
  return appRouter.createCaller(ctx);
}

/** Fuehrt einen Cron-Lauf aus und antwortet einheitlich mit JSON. */
export async function fuehreCronAus<T extends object>(
  request: NextRequest,
  name: string,
  lauf: (caller: AppCaller) => Promise<T>,
): Promise<NextResponse> {
  const verweigert = pruefeCronAuth(request, name);
  if (verweigert) return verweigert;

  try {
    const stats = await lauf(await cronCaller());
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    console.error(`[cron/${name}] failed:`, err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
