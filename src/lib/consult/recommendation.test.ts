import { describe, expect, it, vi } from "vitest";
import { authorizeConsultScope, chooseAfterRecommendation, consultScopeSchema, DISPLAY_ACUITY, prepareRecommendation, UNAVAILABLE, type ScopeAccess } from "./recommendation";

const access = (facilities = ["onsite-a"]): ScopeAccess => ({
  userId: "synthetic-user", setupComplete: async () => true,
  assignedFacilities: async () => facilities, hasFacilityAccess: async () => true,
});
const raw = {
  decision_id: "synthetic-decision", acuity: { level: "high", model_version: "synthetic-model" },
  route: { destination: "provider", policy_version: "synthetic-policy" },
  review_required: false, clinically_validated: true,
};

describe("bounded consult recommendation", () => {
  it("denies anonymous callers before membership reads", async () => {
    const a = access(); a.userId = null; a.assignedFacilities = vi.fn();
    await expect(authorizeConsultScope(a, "onsite-a")).rejects.toThrow("Unauthorized");
    expect(a.assignedFacilities).not.toHaveBeenCalled();
  });
  it("denies incomplete setup", async () => {
    await expect(authorizeConsultScope({ ...access(), setupComplete: async () => false }, "onsite-a")).rejects.toThrow("Forbidden");
  });
  it("allows only the onsite assigned facility", async () => {
    expect(await authorizeConsultScope(access(), "onsite-a")).toBe("onsite-a");
    await expect(authorizeConsultScope(access(), "other-tenant")).rejects.toThrow("Forbidden");
  });
  it("allows virtual coverage only at explicitly assigned facilities", async () => {
    const a = access(["virtual-a", "virtual-b"]);
    expect(await authorizeConsultScope(a, "virtual-b")).toBe("virtual-b");
    await expect(authorizeConsultScope(a, "virtual-c")).rejects.toThrow("Forbidden");
  });
  it("denies revoked access even when a credential is returned", async () => {
    await expect(authorizeConsultScope({ ...access(), hasFacilityAccess: async () => false }, "onsite-a")).rejects.toThrow("Forbidden");
  });
  it("fails closed on membership read failure without inference", async () => {
    const transport = vi.fn();
    await expect(prepareRecommendation({ ...access(), assignedFacilities: async () => { throw new Error("Forbidden"); } }, "onsite-a", "Synthetic symptom", transport)).rejects.toThrow("Forbidden");
    expect(transport).not.toHaveBeenCalled();
  });
  it("development preparation returns unavailable with no transport", async () => {
    expect(await prepareRecommendation(access(), "onsite-a")).toEqual(UNAVAILABLE);
    expect(UNAVAILABLE).not.toHaveProperty("decision");
  });
  it("rejects patient/message input at the RPC schema boundary", () => {
    expect(consultScopeSchema.safeParse({ facility: "onsite-a", text: "Synthetic only" }).success).toBe(false);
  });
  it("reports unavailable after an upstream 403 without inventing routing", async () => {
    const r = await prepareRecommendation(access(), "onsite-a", "Synthetic chest discomfort", async () => { throw new Error("403"); });
    expect(r).toEqual(UNAVAILABLE);
  });
  it.each([null, {}, { acuity: { level: "high" } }])("rejects malformed response %j", async (response) => {
    expect(await prepareRecommendation(access(), "onsite-a", "Synthetic chest discomfort", async () => response)).toEqual(UNAVAILABLE);
  });
  it("retains provenance and clamps review safety using the existing contract", async () => {
    const transport = vi.fn(async () => raw);
    const r = await prepareRecommendation(access(), "onsite-a", "Synthetic chest discomfort", transport);
    expect(transport.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ use_case: "specialist_consult" }));
    if (r.status !== "recommended") throw new Error("Expected synthetic recommendation");
    expect(r.decision.decision_id).toBe("synthetic-decision");
    expect(r.decision.acuity.model_version).toBe("synthetic-model");
    expect(r.decision.route.policy_version).toBe("synthetic-policy");
    expect(r.decision.review_required).toBe(true);
    expect(r.decision.clinically_validated).toBe(false);
    expect(DISPLAY_ACUITY[r.decision.acuity.level]).toBe("Red");
    expect(chooseAfterRecommendation(r, "low")).toEqual({ choice: "low", recommendation: r });
  });
  it("requires recommendation attempt before clinician selection, but unavailable never delays choice", () => {
    expect(() => chooseAfterRecommendation(null, "low")).toThrow("before selection");
    expect(chooseAfterRecommendation(UNAVAILABLE, "medium").choice).toBe("medium");
  });
});