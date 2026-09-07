/* Self-service password recovery helpers. Pure and side-effect free: nothing
   here logs, stores or echoes an email, password, token or URL fragment. */
import { checkPassword, type PasswordCheck } from "./password";

/** Identical for every address, so a caller cannot learn whether an account
    exists (account-enumeration defence). */
export const RECOVERY_MESSAGE =
  "If an account exists for that address, a reset link is on its way. Check your inbox.";

/** Shown when a recovery link is missing, already used or expired. Carries no
    detail about the account or the token. */
export const RECOVERY_INVALID_MESSAGE =
  "That reset link is no longer valid. Request a new one from the sign-in screen.";

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length > 0 && email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** True when the URL fragment carries a recovery grant. The fragment itself is
    never returned, logged or stored. */
export function hasRecoveryGrant(hash: string): boolean {
  return /(^|[#&?])type=recovery(&|$)/.test(hash);
}

export type AuthGrant = { invite: boolean; recovery: boolean };

/** Invite and recovery links may deliver the grant in the fragment (implicit)
    or in the query string (PKCE/verify redirects). Both are recognised; no part
    of the URL is returned. */
export function parseAuthGrant(hash: string, search = ""): AuthGrant {
  const has = (t: string) => new RegExp(`(^|[#&?])type=${t}(&|$)`).test(hash + "&" + search);
  return { invite: has("invite"), recovery: has("recovery") };
}

/* Captured at module load: the auth client strips the grant from the address
   bar asynchronously once it has consumed it, which happens before React
   renders. Reading it later would always come back empty. */
const captured: AuthGrant =
  typeof window === "undefined"
    ? { invite: false, recovery: false }
    : parseAuthGrant(window.location.hash, window.location.search);

export function capturedAuthGrant(): AuthGrant {
  return captured;
}

export const RESET_PATH = "/reset-password";

/** Recovery must land on the public, unprotected password page. */
export function recoveryRedirectUrl(origin: string): string {
  return new URL(RESET_PATH, origin).toString();
}

export type GrantType = "recovery" | "invite";

/** Every shape a password link can arrive in. `otp` is our own first-party
    shape: the one-time code travels in the fragment, so it never reaches a
    server log, and it is redeemed only after a deliberate click. */
export type RecoveryLink =
  | { kind: "otp"; type: GrantType; email: string; token: string }
  | { kind: "tokens"; type: GrantType; accessToken: string; refreshToken: string }
  | { kind: "hash"; type: GrantType; tokenHash: string }
  | { kind: "code"; code: string }
  | { kind: "error" }
  | { kind: "none" };

const params = (s: string) => new URLSearchParams(s.replace(/^[#?]/, ""));
const grantType = (v: string | null): GrantType => (v === "invite" ? "invite" : "recovery");

/** Reads the link without trusting it: nothing here grants access — the auth
    server still has to accept the credential the link carries. */
export function parseRecoveryLink(hash: string, search: string): RecoveryLink {
  const h = params(hash);
  const q = params(search);
  const get = (k: string) => h.get(k) ?? q.get(k);

  if (get("error") || get("error_code")) return { kind: "error" };

  const token = get("t");
  const email = get("e");
  if (token && email) return { kind: "otp", type: grantType(get("type")), email, token };

  const accessToken = get("access_token");
  const refreshToken = get("refresh_token");
  if (accessToken && refreshToken)
    return { kind: "tokens", type: grantType(get("type")), accessToken, refreshToken };

  const tokenHash = get("token_hash");
  if (tokenHash) return { kind: "hash", type: grantType(get("type")), tokenHash };

  const code = get("code");
  if (code) return { kind: "code", code };

  return { kind: "none" };
}

/** First-party link used by the branded emails. Falls back to the auth
    provider's own URL when no one-time code was supplied. */
export function buildAuthLinkUrl(
  siteUrl: string,
  opts: { type: GrantType; email: string; token: string | null; fallbackUrl: string },
): string {
  if (!opts.token) return opts.fallbackUrl;
  const url = new URL(RESET_PATH, siteUrl);
  url.hash = `type=${opts.type}&t=${encodeURIComponent(opts.token)}&e=${encodeURIComponent(opts.email)}`;
  return url.toString();
}

export type PasswordReason = NonNullable<PasswordCheck["reason"]> | "mismatch";
export type NewPasswordCheck = { ok: true } | { ok: false; reason: PasswordReason };

/** Strength plus confirmation. Reason codes only — never the candidate. */
export function validateNewPassword(candidate: string, confirm: string): NewPasswordCheck {
  const strength = checkPassword(candidate);
  if (!strength.ok) return { ok: false, reason: strength.reason! };
  if (candidate !== confirm) return { ok: false, reason: "mismatch" };
  return { ok: true };
}

export function passwordErrorMessage(reason: string): string {
  switch (reason) {
    case "mismatch":
      return "Passwords do not match.";
    case "too_long":
      return "That password is too long.";
    case "common":
      return "That password is too easy to guess.";
    default:
      return "At least 12 characters, using three of: lowercase, uppercase, number, symbol.";
  }
}
