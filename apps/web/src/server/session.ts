import {
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
} from "@stromsteuer/api";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS };

/**
 * Cookie-Optionen fuer den Antrags-Session-Token.
 * HTTP-Only — nicht aus dem Client-JS lesbar.
 * SameSite=Lax — der Cookie wird beim Top-Level-GET auf /antrag/start gesetzt
 * (Einstieg ueber Links/Partner-Landingpages), daher Lax statt Strict.
 */
export const SESSION_COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
};
