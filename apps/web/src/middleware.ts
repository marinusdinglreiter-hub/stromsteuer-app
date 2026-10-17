import { NextResponse, type NextRequest } from "next/server";

import { pruefeAdminAuth } from "@/server/admin-auth";
import { rateLimit } from "@/server/rate-limit";

/**
 * Middleware fuer zwei geschuetzte Bereiche:
 *  - `/admin/*`  : HTTP Basic-Auth fuer das Kanzlei-Backoffice.
 *  - `/status/*` : Rate-Limit als Basis-Schutz gegen Token-Enumeration/Abuse.
 */
const REALM = "Backoffice";

/** Status-Seite: max. Requests pro IP und Zeitfenster. */
const STATUS_LIMIT = 40;
const STATUS_WINDOW_MS = 60_000;

function clientIp(request: NextRequest): string {
  return (
    request.ip ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Basic-Auth fuer `/admin/*`. Erwartet `ADMIN_USERNAME` + `ADMIN_PASSWORD`.
 * Ohne gesetztes Passwort wird der Zugriff komplett blockiert (503), damit es
 * kein versehentlich offenes Live-Backoffice gibt. Gibt `null` zurueck, wenn
 * der Zugriff erlaubt ist.
 */
function adminAuth(request: NextRequest): NextResponse | null {
  const ergebnis = pruefeAdminAuth(request.headers.get("authorization"));
  if (ergebnis === "ok") return null;

  if (ergebnis === "nicht-konfiguriert") {
    return new NextResponse(
      "Backoffice ist nicht konfiguriert. ADMIN_PASSWORD setzen.",
      { status: 503 },
    );
  }

  return new NextResponse("Authentifizierung erforderlich.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return adminAuth(request) ?? NextResponse.next();
  }

  if (pathname.startsWith("/status")) {
    const { ok, retryAfterSeconds } = rateLimit(
      `status:${clientIp(request)}`,
      STATUS_LIMIT,
      STATUS_WINDOW_MS,
    );
    if (!ok) {
      return new NextResponse(
        "Zu viele Anfragen. Bitte später erneut versuchen.",
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/status/:path*"],
};
