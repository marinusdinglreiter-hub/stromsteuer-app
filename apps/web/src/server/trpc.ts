import { appRouter, createContext, type AppCaller } from "@stromsteuer/api";
import { cookies, headers } from "next/headers";

import { SESSION_COOKIE_NAME } from "./session";

/**
 * Erzeugt einen server-side tRPC-Caller mit dem aktuellen Request-Context
 * (Cookie, IP, User-Agent). Wird in Server Components und Server Actions
 * verwendet — kein HTTP-Roundtrip, der Caller ruft die Procedures direkt.
 */
export async function getServerCaller(): Promise<AppCaller> {
  const cookieStore = cookies();
  const headerStore = headers();

  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    null;
  const userAgent = headerStore.get("user-agent") ?? null;

  const ctx = await createContext({ sessionToken, ip, userAgent });
  return appRouter.createCaller(ctx);
}
