/* HelloCare adapter contract only. No SDK, no credential, no network call
   is made unless VITE_HELLOCARE_LAUNCH_URL is configured by the operator.
   PHI must never be placed in the launch context. */

import type { TrustLevel } from "./status";

export interface LaunchContext {
  requestId: string;
  deviceId: string;
  nonce: string;
}

export function hellocareConfig(): { configured: boolean; url: string | null } {
  const url = (import.meta.env["VITE_HELLOCARE_LAUNCH_URL"] as string | undefined) || null;
  return { configured: !!url, url };
}

/** A successful window.open is NOT proof the HelloCare call connected, and this
    repo has no callback/SDK confirmation. So an opened handoff stays "available"
    with an explicit unverified reason. "live" is reserved for a future verified
    callback that sets confirmed = true. */
export function hellocareTrust(
  handoffOpened = false,
  confirmed = false,
): { level: TrustLevel; reason: string } {
  const { configured } = hellocareConfig();
  if (!configured)
    return { level: "setup", reason: "Adapter configuration pending — no launch URL configured" };
  if (confirmed) return { level: "live", reason: "HelloCare confirmed the connected session" };
  if (handoffOpened)
    return { level: "available", reason: "Handoff opened — connection not yet confirmed" };
  return { level: "available", reason: "Configured — handoff not opened yet" };
}

/** Opaque identifiers only. Returns null when nothing is configured. */
export function buildLaunchUrl(ctx: LaunchContext): string | null {
  const { configured, url } = hellocareConfig();
  if (!configured || !url) return null;
  const u = new URL(url);
  u.searchParams.set("request", ctx.requestId);
  u.searchParams.set("device", ctx.deviceId);
  u.searchParams.set("nonce", ctx.nonce);
  return u.toString();
}

export const newNonce = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
