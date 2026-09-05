import { describe, expect, it } from "vitest";
import { projectDecision, projectInfo, projectIntake, toDecisionRequest } from "./contract";
import { decisionSchema, feedbackSchema, intakeSchema } from "./acuity.schemas";
import { toIntakeExample } from "./training";

const TEXT = "Synthetic: post-op day 3 knee replacement, incision warm with mild drainage.";
const INPUT = {
  text: TEXT,
  channel: "chat",
  sender_role: "nurse",
  care_setting: "inpatient",
  use_case: "triage",
} as const;

describe("POST /v1/decisions request", () => {
  it("is exactly {message, context} with only the canonical context fields", () => {
    expect(toDecisionRequest({ ...INPUT, specialty_hint: "ortho", legacy_score_band: 3 })).toEqual({
      message: TEXT,
      context: {
        channel: "chat",
        sender_role: "nurse",
        care_setting: "inpatient",
        use_case: "triage",
        specialty_hint: "ortho",
        legacy_score_band: 3,
      },
    });
    expect(toDecisionRequest(INPUT)).toEqual({
      message: TEXT,
      context: { channel: "chat", sender_role: "nurse", care_setting: "inpatient", use_case: "triage" },
    });
  });

  it("rejects fields outside the contract at the server boundary", () => {
    expect(decisionSchema.safeParse(INPUT).success).toBe(true);
    expect(decisionSchema.safeParse({ ...INPUT, legacy_score_band: 6 }).success).toBe(false);
    expect(decisionSchema.safeParse({ ...INPUT, patient_id: "x" }).success).toBe(false);
    expect(decisionSchema.safeParse({ ...INPUT, channel: "fax" }).success).toBe(false);
  });
});

describe("projectDecision", () => {
  it("keeps only the canonical response fields and drops any echo of the input", () => {
    const out = projectDecision(
      {
        decision_id: "d_1",
        model_version: "rc3",
        policy_version: "p1",
        acuity: { level: "medium", score: 2.6, confidence: 0.71, probabilities: { low: 0.1, medium: 0.7, high: 0.2 } },
        route: {
          destination: "nurse_line",
          service_line: "ortho",
          priority: "routine",
          sla_seconds: 1800,
          escalation_after_seconds: 3600,
          fallback: "provider",
        },
        reason_codes: ["post_op", "low_grade_fever"],
        warning: "clinically_validated=false — human review required",
        message: TEXT,
        context: { text: TEXT },
      },
      TEXT,
    );
    expect(out).toEqual({
      decision_id: "d_1",
      model_version: "rc3",
      policy_version: "p1",
      acuity: { level: "medium", score: 2.6, confidence: 0.71, probabilities: { low: 0.1, medium: 0.7, high: 0.2 } },
      route: {
        destination: "nurse_line",
        service_line: "ortho",
        priority: "routine",
        sla_seconds: 1800,
        escalation_after_seconds: 3600,
        fallback: "provider",
      },
      reason_codes: ["post_op", "low_grade_fever"],
      review_required: true,
      clinically_validated: false,
    });
    expect(JSON.stringify(out)).not.toContain("knee replacement");
  });

  it("clamps governance flags even when the runtime claims otherwise", () => {
    const out = projectDecision({ review_required: false, clinically_validated: true }, TEXT);
    expect(out.review_required).toBe(true);
    expect(out.clinically_validated).toBe(false);
  });

  it("discards malformed values and free-text reason codes", () => {
    const out = projectDecision(
      {
        acuity: { level: "urgent", probabilities: { high: 1.4, low: -0.1, medium: 0.5 } },
        reason_codes: ["ok_code", `patient said ${TEXT}`, 42],
      },
      TEXT,
    );
    expect(out.acuity.level).toBeUndefined();
    expect(out.acuity.probabilities).toEqual({ medium: 0.5 });
    expect(out.reason_codes).toEqual(["ok_code"]);
  });

  it("rejects a reply whose short fields echo the submitted text", () => {
    const short = "chest pain now";
    expect(() => projectDecision({ route: { destination: `re: ${short}` } }, short)).toThrow(
      /echoed input/,
    );
  });

  it("rejects a reply carrying a possible identifier", () => {
    expect(() => projectDecision({ route: { service_line: "MRN 00412-77" } }, TEXT)).toThrow(
      /identifier/,
    );
    expect(() => projectInfo({ model_version: "call 555-123-4567" })).toThrow(/identifier/);
  });
});

describe("feedback and training-intake payloads", () => {
  const example = toIntakeExample({
    id: "a",
    text: TEXT,
    label: "medium",
    rawLabel: "3",
    routeLabel: "nurse_line",
    useCase: "triage",
    groupId: "g1",
    split: "train",
    include: true,
    approved: true,
    quality: "good",
    duplicateOf: null,
    warnings: [],
  });

  it("maps a reviewed example onto the canonical intake record", () => {
    expect(example).toEqual({
      record_id: "a",
      text: TEXT,
      acuity: "medium",
      use_case: "triage",
      routes: ["nurse_line"],
      label_quality: "high",
      sample_weight: 1,
      include_in_training: true,
      group_id: "g1",
      split: "train",
    });
    expect(intakeSchema.safeParse({ examples: [example] }).success).toBe(true);
  });

  it("refuses the retired fields instead of forwarding them", () => {
    for (const extra of [{ promote: false }, { batch_label: "b" }, { provenance: "synthetic" }])
      expect(intakeSchema.safeParse({ examples: [example], ...extra }).success).toBe(false);
    expect(intakeSchema.safeParse({ examples: [{ ...example, provenance: "x" }] }).success).toBe(false);
    expect(intakeSchema.safeParse({ examples: [{ ...example, include_in_training: false }] }).success).toBe(false);

    const fb = { decision_id: "d_1", acuity: "high", routes: ["escalate"] };
    expect(feedbackSchema.safeParse(fb).success).toBe(true);
    expect(feedbackSchema.safeParse({ ...fb, agrees: true }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...fb, note: "free text" }).success).toBe(false);
  });
});

describe("projectInfo / projectIntake", () => {
  it("never reports a validated model", () => {
    expect(projectInfo({ model_version: "rc3", clinically_validated: true })).toEqual({
      model_version: "rc3",
      policy_version: undefined,
      clinically_validated: false,
    });
  });

  it("keeps intake receipts metadata-only", () => {
    const out = projectIntake({
      accepted: true,
      batch_id: "b_1",
      example_count: 3,
      sha256: "ab".repeat(32),
      state: "staged",
      examples: [{ text: TEXT }],
    });
    expect(out).toEqual({
      accepted: true,
      batch_id: "b_1",
      object_key: undefined,
      example_count: 3,
      sha256: "ab".repeat(32),
      state: "staged",
    });
    expect(projectIntake({ accepted: "yes" }).accepted).toBe(false);
  });
});
