import { timingSafeEqual } from "node:crypto";

import { appRouter, createContext } from "@stromsteuer/api";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

/** Konstantzeit-Vergleich zweier Strings (verhindert Timing-Angriffe). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Vercel-Cron-Endpoint — laeuft taeglich, loescht abgelaufene Drafts.
 * Trigger ueber vercel.json (siehe Root). Schutz vor Public-Trigger via
 * CRON_SECRET (`Authorization: Bearer <secret>`). Vercel setzt diesen Header
 * automatisch, wenn CRON_SECRET als Env-Variable hinterlegt ist.
 *
 * Sicherheitsregel: Ohne gesetztes CRON_SECRET wird der Endpoint komplett
 * verweigert (503) — kein versehentlich oeffentlicher Loesch-Endpoint.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(
      "[cron/expire] CRON_SECRET nicht gesetzt — Endpoint deaktiviert.",
    );
    return new NextResponse(
      "Cron ist nicht konfiguriert. CRON_SECRET setzen.",
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Admin-Caller mit isAdmin=true bauen, damit adminProcedure greift.
  const ctx = await createContext({
    sessionToken: null,
    ip: null,
    userAgent: "vercel-cron",
    isAdmin: true,
  });
  const caller = appRouter.createCaller(ctx);

  try {
    const stats = await caller.admin.expireDrafts();
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    console.error("[cron/expire] failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}
