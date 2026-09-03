/* Password strength rules. Pure and side-effect free: this module never
   logs, stores or echoes the candidate password. */

export interface PasswordCheck {
  ok: boolean;
  /** Stable reason code — never contains any part of the candidate. */
  reason?: "too_short" | "too_long" | "too_simple" | "common";
}

const COMMON = new Set([
  "password",
  "password1",
  "passw0rd",
  "welcome1",
  "letmein123",
  "changeme123",
  "qwerty12345",
  "12345678901",
]);

export function checkPassword(candidate: string): PasswordCheck {
  if (candidate.length < 12) return { ok: false, reason: "too_short" };
  if (candidate.length > 200) return { ok: false, reason: "too_long" };
  if (COMMON.has(candidate.toLowerCase())) return { ok: false, reason: "common" };

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(candidate));
  if (classes.length < 3) return { ok: false, reason: "too_simple" };
  return { ok: true };
}

export const PASSWORD_RULE =
  "At least 12 characters, using three of: lowercase, uppercase, number, symbol.";
