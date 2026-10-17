import { appRouter, createContext, type AppCaller } from "@stromsteuer/api";
import { headers } from "next/headers";

import { pruefeAdminAuth } from "./admin-auth";

/**
 * Server-side tRPC-Caller fuer das Backoffice. Setzt `isAdmin: true` im
 * Context, damit `adminProcedure` greift. Die Basic-Auth prueft die Middleware
 * fuer `/admin/*`; hier wird sie vor `isAdmin: true` noch einmal geprueft, damit
 * eine Admin-Aktion nie allein am Pfad-Matcher haengt.
 */
export async function getAdminServerCaller(): Promise<AppCaller> {
  const headerStore = headers();
  if (pruefeAdminAuth(headerStore.get("authorization")) !== "ok") {
    throw new Error("Backoffice-Zugriff erforderlich.");
  }
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
