/* Persistent, atomic throttling for the unauthenticated kiosk endpoints.

   The rate-limit key is a pseudonymous HMAC of the trusted edge client IP —
   the raw address is never stored, logged or returned. RATE_LIMIT_SECRET is
   server-only and required: without it every throttled endpoint fails closed. */
import { createHmac } from "node:crypto";

export class RateLimitUnavailable extends Error {}

/** Only the hosting edge's own header is trusted. X-Forwarded-For and
    X-Real-IP are client-settable, so honouring them would let an attacker mint
    a fresh throttling identity per request. Absent the trusted header the
    caller cannot be identified and the request must fail closed. */
export function clientIp(request: Request): string | null {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  return cf || null;
}

export function bucketKey(scope: string, identifier: string): string {
  const secret = process.env["RATE_LIMIT_SECRET"];
  if (!secret) throw new RateLimitUnavailable("rate limiting is not configured");
  return `${scope}:${createHmac("sha256", secret).update(identifier).digest("hex").slice(0, 40)}`;
}

export interface Limit {
  limit: number;
  windowSeconds: number;
  lockSeconds: number;
}

/** Returns true when the attempt is allowed. Fails closed on any error. */
export async function consume(scope: string, identifier: string, cfg: Limit): Promise<boolean> {
  const key = bucketKey(scope, identifier);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    _key: key,
    _limit: cfg.limit,
    _window_seconds: cfg.windowSeconds,
    _lock_seconds: cfg.lockSeconds,
  });
  if (error) return false;
  return data === true;
}

export async function clear(scope: string, identifier: string): Promise<void> {
  const key = bucketKey(scope, identifier);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("clear_rate_limit", { _key: key });
}

/** Shared guard: resolves the caller, applies the limit, and fails closed. */
export async function guard(
  request: Request,
  scope: string,
  cfg: Limit,
): Promise<{ ok: true; identifier: string } | { ok: false; status: 429 | 503 }> {
  const ip = clientIp(request);
  if (!ip) return { ok: false, status: 503 };
  try {
    const allowed = await consume(scope, ip, cfg);
    return allowed ? { ok: true, identifier: ip } : { ok: false, status: 429 };
  } catch (e) {
    if (e instanceof RateLimitUnavailable) return { ok: false, status: 503 };
    return { ok: false, status: 429 };
  }
}
