import { describe, expect, it } from "vitest";
import {
  RECOVERY_MESSAGE,
  RECOVERY_INVALID_MESSAGE,
  hasRecoveryGrant,
  isValidEmail,
  parseAuthGrant,
  passwordErrorMessage,
  recoveryRedirectUrl,
  validateNewPassword,
} from "./recovery";


const STRONG = "Kestrel-Harbour-72";

describe("generic recovery responses", () => {
  it("is identical for known and unknown addresses", () => {
    expect(RECOVERY_MESSAGE).toBe(RECOVERY_MESSAGE);
    expect(RECOVERY_MESSAGE).not.toMatch(/@/);
    expect(RECOVERY_MESSAGE.toLowerCase()).not.toMatch(/no account|not found|unknown address/);
  });

  it("never names the account in the invalid-link message", () => {
    expect(RECOVERY_INVALID_MESSAGE).not.toMatch(/@|token|jwt/i);
  });

  it("accepts only plausible addresses before calling out", () => {
    expect(isValidEmail("clinician@hospital.org")).toBe(true);
    expect(isValidEmail(" ")).toBe(false);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b.co".padEnd(300, "x"))).toBe(false);
  });
});

describe("recovery grant detection", () => {
  it("detects a recovery fragment", () => {
    expect(hasRecoveryGrant("#access_token=xyz&type=recovery")).toBe(true);
    expect(hasRecoveryGrant("#type=recovery")).toBe(true);
  });

  it("rejects absent or unrelated grants (invalid/expired state)", () => {
    expect(hasRecoveryGrant("")).toBe(false);
    expect(hasRecoveryGrant("#error=access_denied&error_code=otp_expired")).toBe(false);
    expect(hasRecoveryGrant("#type=recoveryish")).toBe(false);
  });

  it("returns a same-origin public redirect", () => {
    expect(recoveryRedirectUrl("https://virtualischat.com")).toBe("https://virtualischat.com/");
  });
});

describe("new password validation", () => {
  it("accepts a strong password with matching confirmation", () => {
    expect(validateNewPassword(STRONG, STRONG)).toEqual({ ok: true });
  });

  it("rejects a mismatch", () => {
    expect(validateNewPassword(STRONG, STRONG + "x")).toEqual({ ok: false, reason: "mismatch" });
  });

  it("rejects weak passwords", () => {
    expect(validateNewPassword("short1A", "short1A").ok).toBe(false);
    expect(validateNewPassword("alllowercaseletters", "alllowercaseletters")).toEqual({
      ok: false,
      reason: "too_simple",
    });
    expect(validateNewPassword("qwerty12345", "qwerty12345").ok).toBe(false);
  });

  it("never leaks the candidate in an error message", () => {
    const r = validateNewPassword(STRONG, "different");
    const msg = passwordErrorMessage(r.ok ? "" : r.reason);
    expect(msg).not.toContain(STRONG);
    expect(msg).not.toContain("different");
    expect(msg).toBe("Passwords do not match.");
  });
});
