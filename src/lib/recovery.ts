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

/** Recovery must land on a public same-origin URL — never a protected route. */
export function recoveryRedirectUrl(origin: string): string {
  return new URL("/", origin).toString();
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
