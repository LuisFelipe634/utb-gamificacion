/**
 * Rate-limit en memoria (suficiente para piloto/monolito single-instance).
 * Para multi-instancia migrar a Redis/Upstash.
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export function rateLimit(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }
  if (current.count >= max) {
    return { allowed: false, remaining: 0 };
  }
  current.count += 1;
  return { allowed: true, remaining: max - current.count };
}

export function rateLimitKey(...parts: string[]): string {
  return parts.join(":");
}
