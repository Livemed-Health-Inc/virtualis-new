import { describe, expect, it } from "vitest";
import {
  RECOVERY_MESSAGE,
  buildAuthLinkUrl,
  parseRecoveryLink,
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
    expect(recoveryRedirectUrl("https://virtualischat.com")).toBe(
      "https://virtualischat.com/reset-password",
    );
  });
});

describe("invite and recovery grant capture", () => {
  it("recognises grants delivered in the fragment", () => {
    expect(parseAuthGrant("#access_token=x&type=recovery")).toEqual({
      invite: false,
      recovery: true,
    });
    expect(parseAuthGrant("#access_token=x&type=invite")).toEqual({
      invite: true,
      recovery: false,
    });
  });

  it("recognises grants delivered in the query string", () => {
    expect(parseAuthGrant("", "?type=recovery&code=abc")).toEqual({
      invite: false,
      recovery: true,
    });
    expect(parseAuthGrant("", "?type=invite")).toEqual({ invite: true, recovery: false });
  });

  it("reports no grant for ordinary and failed loads", () => {
    expect(parseAuthGrant("", "")).toEqual({ invite: false, recovery: false });
    expect(parseAuthGrant("#error=access_denied&error_code=otp_expired", "")).toEqual({
      invite: false,
      recovery: false,
    });
    expect(parseAuthGrant("#type=recoveryish", "?type=invitee")).toEqual({
      invite: false,
      recovery: false,
    });
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

describe("password link parsing", () => {
  it("reads a first-party one-time link from the fragment", () => {
    expect(parseRecoveryLink("#type=recovery&t=123456&e=dr%40x.org", "")).toEqual({
      kind: "otp",
      type: "recovery",
      email: "dr@x.org",
      token: "123456",
    });
    expect(parseRecoveryLink("#type=invite&t=999&e=a%40b.co", "").kind).toBe("otp");
  });

  it("still accepts implicit, token-hash and PKCE links", () => {
    expect(parseRecoveryLink("#access_token=a&refresh_token=r&type=recovery", "")).toEqual({
      kind: "tokens",
      type: "recovery",
      accessToken: "a",
      refreshToken: "r",
    });
    expect(parseRecoveryLink("", "?token_hash=abc&type=invite")).toEqual({
      kind: "hash",
      type: "invite",
      tokenHash: "abc",
    });
    expect(parseRecoveryLink("", "?code=xyz")).toEqual({ kind: "code", code: "xyz" });
  });

  it("treats expired or unrelated loads as no grant", () => {
    expect(parseRecoveryLink("#error=access_denied&error_code=otp_expired", "").kind).toBe("error");
    expect(parseRecoveryLink("", "").kind).toBe("none");
    expect(parseRecoveryLink("#type=recovery", "").kind).toBe("none");
  });

  it("builds a first-party link that keeps the code out of the request path", () => {
    const url = buildAuthLinkUrl("https://virtualischat.com", {
      type: "recovery",
      email: "dr@x.org",
      token: "123456",
      fallbackUrl: "https://auth.example/verify?token=zzz",
    });
    expect(url.startsWith("https://virtualischat.com/reset-password#")).toBe(true);
    expect(new URL(url).search).toBe("");
    expect(parseRecoveryLink(new URL(url).hash, "")).toEqual({
      kind: "otp",
      type: "recovery",
      email: "dr@x.org",
      token: "123456",
    });
  });

  it("falls back to the provider link when no one-time code is supplied", () => {
    expect(
      buildAuthLinkUrl("https://virtualischat.com", {
        type: "invite",
        email: "dr@x.org",
        token: null,
        fallbackUrl: "https://auth.example/verify?token=zzz",
      }),
    ).toBe("https://auth.example/verify?token=zzz");
  });

  it("sends recovery to the public password page, not the app shell", () => {
    expect(recoveryRedirectUrl("https://virtualischat.com")).toBe(
      "https://virtualischat.com/reset-password",
    );
  });
});
