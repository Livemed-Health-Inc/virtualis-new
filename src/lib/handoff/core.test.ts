import { describe, expect, it } from "vitest";
import {
  PRESENCE_TTL_MS,
  canRespond,
  canTransition,
  effectivePresence,
  kioskBody,
  shouldChime,
} from "./core";

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

describe("respond authorization", () => {
  const req = {
    facility_id: "saint",
    status: "requested" as const,
    provider_id: null as string | null,
  };
  const clinician = { userId: UUID, facilities: ["saint"] };
  const outsider = { userId: "22222222-2222-4222-8222-222222222222", facilities: ["mercy"] };
  const admin = { userId: outsider.userId, facilities: [] as string[], isAdmin: true };

  it("lets a credentialed clinician accept or decline a waiting request", () => {
    expect(canRespond(clinician, req, "accepted")).toBe(true);
    expect(canRespond(clinician, req, "declined")).toBe(true);
  });
  it("refuses a clinician from another facility", () => {
    expect(canRespond(outsider, req, "accepted")).toBe(false);
    expect(
      canRespond(outsider, { ...req, status: "accepted", provider_id: outsider.userId }, "ended"),
    ).toBe(false);
  });
  it("refuses a signed-out caller", () => {
    expect(canRespond({ userId: null, facilities: ["saint"] }, req, "accepted")).toBe(false);
  });
  it("refuses re-answering an already answered request", () => {
    expect(
      canRespond(clinician, { ...req, status: "accepted", provider_id: UUID }, "accepted"),
    ).toBe(false);
    expect(canRespond(clinician, { ...req, status: "declined" }, "accepted")).toBe(false);
    expect(canRespond(clinician, { ...req, status: "cancelled" }, "accepted")).toBe(false);
  });
  it("only lets the bound provider end an accepted encounter", () => {
    const accepted = {
      ...req,
      status: "accepted" as const,
      provider_id: "33333333-3333-4333-8333-333333333333",
    };
    expect(canRespond(clinician, accepted, "ended")).toBe(false);
    expect(canRespond(clinician, { ...accepted, provider_id: UUID }, "ended")).toBe(true);
  });
  it("allows an administrator to answer or end across facilities", () => {
    expect(canRespond(admin, req, "declined")).toBe(true);
    expect(canRespond(admin, { ...req, status: "accepted", provider_id: UUID }, "ended")).toBe(
      true,
    );
  });
  it("never allows cancelled or requested as a clinician answer", () => {
    expect(canRespond(clinician, req, "cancelled")).toBe(false);
    expect(canRespond(clinician, req, "requested")).toBe(false);
  });
});
