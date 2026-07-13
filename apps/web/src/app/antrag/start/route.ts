/**
 * Bootstrap-Route fuer einen neuen Antrag.
 *
 * Ablauf:
 *   GET /antrag/start?kwh=800000&branche=verarbeitendes-gewerbe&antragsjahr=2025
 *     1. Legt eine neue Application in der DB an
 *     2. Setzt den Session-Cookie (sst)
 *     3. Redirect auf /antrag/schritt-1
 *
 * Vorteile gegenueber Client-side-Bootstrap:
 *  - Cookie ist beim Render der Folgeseite garantiert gesetzt
 *  - Funktioniert auch ohne JavaScript
 *  - Kein doppelter Bootstrap bei Hard-Reload
 */
import { getServerCaller } from "@/server/trpc";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/server/session";
import { KWH_HARD_MAX } from "@/config/antrag";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  kwh: z.coerce.number().int().min(0).max(KWH_HARD_MAX).optional(),
  branche: z.string().min(1).max(100).optional(),
  antragsjahr: z.coerce.number().int().min(2020).max(2030).optional(),
});

export async function GET(request: NextRequest) {
  const params = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  const caller = await getServerCaller();
  const { sessionToken } = await caller.application.bootstrap(
    params.success
      ? {
          geschaetzteKwh: params.data.kwh,
          branche: params.data.branche,
          antragsjahr: params.data.antragsjahr,
        }
      : undefined,
  );

  const target = new URL("/antrag/schritt-1", request.nextUrl.origin);
  const response = NextResponse.redirect(target, { status: 302 });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    sessionToken,
    SESSION_COOKIE_OPTIONS,
  );
  return response;
}
