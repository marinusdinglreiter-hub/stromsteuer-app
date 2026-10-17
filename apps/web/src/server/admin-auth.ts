/**
 * Basic-Auth des Backoffice an einer Stelle. Die Middleware schuetzt `/admin/*`;
 * `getAdminServerCaller` prueft zusaetzlich, bevor es `isAdmin: true` setzt.
 * Damit haengt der Zugriff auf Zugangscodes und Statuswechsel nicht allein am
 * Pfad-Matcher der Middleware (Defense in Depth).
 *
 * Laeuft in der Edge-Middleware und in Node, daher nur Web-APIs (atob).
 */

/** Vergleich in konstanter Zeit ueber die Laenge des laengeren Strings. */
export function gleichInKonstanterZeit(a: string, b: string): boolean {
  const n = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export type AdminAuthErgebnis = "ok" | "nicht-konfiguriert" | "abgelehnt";

/** Prueft einen `Authorization`-Header gegen ADMIN_USERNAME/ADMIN_PASSWORD. */
export function pruefeAdminAuth(authorization: string | null | undefined): AdminAuthErgebnis {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return "nicht-konfiguriert";
  if (!authorization?.startsWith("Basic ")) return "abgelehnt";
  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const idx = decoded.indexOf(":");
    if (idx < 0) return "abgelehnt";
    const nutzerOk = gleichInKonstanterZeit(decoded.slice(0, idx), username);
    const passwortOk = gleichInKonstanterZeit(decoded.slice(idx + 1), password);
    return nutzerOk && passwortOk ? "ok" : "abgelehnt";
  } catch {
    return "abgelehnt";
  }
}
