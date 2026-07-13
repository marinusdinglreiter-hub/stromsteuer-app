/**
 * Einfaches In-Memory Fixed-Window Rate-Limit (Edge-kompatibel, ohne Deps).
 *
 * Hinweis: Der Zähler lebt pro Edge-/Server-Instanz und wird auf Vercel NICHT
 * global geteilt. Das reicht als Basis-Schutz / Abuse-Bremse (z. B. gegen
 * Token-Enumeration auf /status). Für harte, instanzübergreifende Garantien
 * später Upstash-Redis (`@upstash/ratelimit`) nachrüsten.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Gelegentliches Aufräumen abgelaufener Einträge (verhindert Memory-Leak).
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}
