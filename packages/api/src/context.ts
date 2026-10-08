import { prisma, type Antrag } from "@stromsteuer/db";

/**
 * Name des HTTP-Cookies, ueber den die Antrags-Session identifiziert wird.
 * "sst" = StromSteuerToken.
 */
export const SESSION_COOKIE_NAME = "sst";

/** 30 Tage Cookie-Lebensdauer fuer Drafts. */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Context = {
  /** Token aus dem Cookie, falls vorhanden. */
  sessionToken: string | null;
  /** Bereits geladener Antrag, falls Cookie zu einem DB-Row passt. */
  application: Antrag | null;
  /** Request-IP fuer Audit (Signatur-Pfad). */
  ip: string | null;
  /** User-Agent fuer Audit. */
  userAgent: string | null;
  /** True wenn der Caller via Basic-Auth-Backoffice authentifiziert ist. */
  isAdmin: boolean;
};

export type CreateContextOptions = {
  sessionToken: string | null;
  ip: string | null;
  userAgent: string | null;
  isAdmin?: boolean;
};

/**
 * Context-Factory fuer tRPC. Wird vom Next.js fetch-Adapter pro Request
 * aufgerufen. Laedt die Application aus der DB, falls Cookie vorhanden.
 */
export async function createContext(
  options: CreateContextOptions,
): Promise<Context> {
  const { sessionToken, ip, userAgent } = options;

  let application: Antrag | null = null;
  if (sessionToken) {
    application = await prisma.antrag.findUnique({
      where: { sessionToken },
    });
  }

  return {
    sessionToken,
    application,
    ip,
    userAgent,
    isAdmin: options.isAdmin === true,
  };
}
