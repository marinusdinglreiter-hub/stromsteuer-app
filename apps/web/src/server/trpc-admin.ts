import { appRouter, createContext, type AppCaller } from "@stromsteuer/api";
import { headers } from "next/headers";

/**
 * Server-side tRPC-Caller fuer das Backoffice. Setzt `isAdmin: true` im
 * Context, damit `adminProcedure` greift. Auth-Pruefung passiert in der
 * Middleware (Basic-Auth) — nur Routen unter `/admin/*` rufen das hier auf.
 */
export async function getAdminServerCaller(): Promise<AppCaller> {
  const headerStore = headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    null;
  const userAgent = headerStore.get("user-agent") ?? null;

  const ctx = await createContext({
    sessionToken: null,
    ip,
    userAgent,
    isAdmin: true,
  });
  return appRouter.createCaller(ctx);
}
