import "server-only";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export class RateLimitError extends Error {
  readonly code: "RATE_LIMITED" | "RATE_LIMIT_UNAVAILABLE";

  constructor(code: "RATE_LIMITED" | "RATE_LIMIT_UNAVAILABLE") {
    super(code);
    this.name = "RateLimitError";
    this.code = code;
  }
}

type Limiter = { limit: (key: string) => Promise<{ success: boolean }> };

type InMemoryLimiter = Limiter & { kind: "memory" };

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

let cachedLimiter: Limiter | undefined;
let warnedAboutMemoryFallback = false;

class ProcessLimiter implements InMemoryLimiter {
  readonly kind = "memory" as const;
  private readonly hits = new Map<string, number[]>();

  async limit(key: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const cutoff = now - WINDOW_MS;
    const times = (this.hits.get(key) ?? []).filter((time) => time > cutoff);

    if (times.length >= MAX_REQUESTS) {
      this.hits.set(key, times);
      return { success: false };
    }

    times.push(now);
    this.hits.set(key, times);

    if (this.hits.size > 10_000) {
      for (const [entryKey, entryTimes] of this.hits) {
        if (entryTimes.every((time) => time <= cutoff)) this.hits.delete(entryKey);
      }
    }

    return { success: true };
  }
}

function getLimiter(): Limiter {
  if (cachedLimiter !== undefined) return cachedLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (url && token && !/your_|placeholder|example|xxx|replace/i.test(`${url} ${token}`)) {
    try {
      cachedLimiter = new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "1 m"),
      });
      return cachedLimiter;
    } catch {
      cachedLimiter = undefined;
    }
  }

  if (!warnedAboutMemoryFallback) {
    console.warn(
      "[rate-limit] Upstash not configured; using per-process limiter. " +
        "Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for multi-instance deployments.",
    );
    warnedAboutMemoryFallback = true;
  }
  cachedLimiter = new ProcessLimiter();
  return cachedLimiter;
}

function parseForwardedFor(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && isIP(part) > 0);
}

/**
 * Resolves a client IP only from explicitly trusted proxy topology.
 * Never falls back to an untrusted, client-supplied header.
 */
export function getTrustedClientIp(request: Request): string | null {
  const forwarded = parseForwardedFor(request.headers.get("x-forwarded-for"));
  if (forwarded.length === 0) return null;

  const hops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? "0", 10);
  if (Number.isInteger(hops) && hops > 0) {
    const index = forwarded.length - hops;
    return index >= 0 ? forwarded[index] : null;
  }

  const trusted = (process.env.TRUSTED_PROXY_IPS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => isIP(value) > 0);

  if (trusted.length === 0) return null;

  for (let index = forwarded.length - 1; index >= 0; index -= 1) {
    const candidate = forwarded[index];
    if (!trusted.includes(candidate)) return candidate;
  }

  return null;
}

function hashIdentifier(namespace: string, identifier: string): string {
  const digest = createHash("sha256").update(identifier, "utf8").digest("base64url");
  return `${namespace}:${digest}`;
}

/**
 * Coarse, non-identifying fingerprint used only when no trusted proxy IP is
 * available. It prevents trivially bypassing limits by rotating an IP header.
 */
export function getRateLimitFingerprint(request: Request): string {
  const signal = [
    request.headers.get("user-agent") ?? "",
    request.headers.get("accept-language") ?? "",
  ].join("|");
  return createHash("sha256").update(signal, "utf8").digest("base64url").slice(0, 24);
}

export async function enforceRateLimit(
  namespace: string,
  identifier: string,
): Promise<void> {
  const limiter = getLimiter();
  const result = await limiter.limit(hashIdentifier(namespace, identifier));
  if (!result.success) throw new RateLimitError("RATE_LIMITED");
}
