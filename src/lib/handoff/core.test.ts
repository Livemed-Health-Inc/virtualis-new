import { describe, expect, it } from "vitest";
import { PRESENCE_TTL_MS, canTransition, effectivePresence, kioskBody, shouldChime } from "./core";

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
const at = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const TOKEN = "t".repeat(40);
const UUID = "11111111-1111-4111-8111-111111111111";

const row = (over: Partial<Parameters<typeof effectivePresence>[0]> = {}) => ({
  user_id: UUID,
  facility_id: "saint",
  specialty: "Cardiology",
  status: "online" as const,
  ready_to_round: false,
  last_seen_at: at(1000),
  ...over,
});

describe("request transitions", () => {
  it("allows only answers from requested", () => {
    expect(canTransition("requested", "accepted")).toBe(true);
    expect(canTransition("requested", "ended")).toBe(false);
  });
  it("treats terminal states as final", () => {
    expect(canTransition("declined", "accepted")).toBe(false);
    expect(canTransition("accepted", "ended")).toBe(true);
    expect(canTransition("ended", "accepted")).toBe(false);
  });
});

describe("presence staleness", () => {
  it("counts a fresh heartbeat as available", () => {
    expect(effectivePresence(row(), NOW).available).toBe(true);
  });
  it("drops to offline past the TTL", () => {
    const p = effectivePresence(row({ last_seen_at: at(PRESENCE_TTL_MS + 1) }), NOW);
    expect(p.status).toBe("offline");
    expect(p.available).toBe(false);
  });
  it("never reports in_consult as available", () => {
    expect(effectivePresence(row({ status: "in_consult" }), NOW).available).toBe(false);
  });
  it("keeps the rounding flag even when stale", () => {
    const p = effectivePresence(
      row({ ready_to_round: true, last_seen_at: at(PRESENCE_TTL_MS * 5) }),
      NOW,
    );
    expect(p.readyToRound).toBe(true);
  });
});

describe("chime", () => {
  it("rings for incoming work and unacked rounding, and never when muted", () => {
    expect(shouldChime({ incoming: 1, unackedRounding: 0 })).toBe(true);
    expect(shouldChime({ incoming: 0, unackedRounding: 2 })).toBe(true);
    expect(shouldChime({ incoming: 0, unackedRounding: 0 })).toBe(false);
    expect(shouldChime({ incoming: 3, unackedRounding: 1, muted: true })).toBe(false);
  });
});

describe("kiosk payload guard", () => {
  it("accepts a well-formed request", () => {
    expect(
      kioskBody.safeParse({
        action: "request",
        token: TOKEN,
        specialty: "Cardiology",
        urgency: "urgent",
        mode: "call",
      }).success,
    ).toBe(true);
  });
  it("rejects any patient identifier", () => {
    expect(
      kioskBody.safeParse({
        action: "request",
        token: TOKEN,
        specialty: "Cardiology",
        urgency: "urgent",
        mode: "call",
        mrn: "123456",
      }).success,
    ).toBe(false);
  });
  it("rejects a missing or short device token", () => {
    expect(kioskBody.safeParse({ action: "coverage" }).success).toBe(false);
    expect(kioskBody.safeParse({ action: "coverage", token: "short" }).success).toBe(false);
  });
  it("requires uuids for request and provider references", () => {
    expect(kioskBody.safeParse({ action: "status", token: TOKEN, requestId: "abc" }).success).toBe(
      false,
    );
    expect(
      kioskBody.safeParse({ action: "ack_rounding", token: TOKEN, providerId: UUID }).success,
    ).toBe(true);
  });
});
