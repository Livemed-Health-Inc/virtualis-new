import { describe, expect, it } from "vitest";
import { projectDecision, projectInfo, projectIntake, toDecisionRequest } from "./contract";
import { decisionSchema, feedbackSchema, intakeSchema } from "./acuity.schemas";
import { toIntakeExample } from "./training";

const TEXT = "Synthetic: post-op day 3 knee replacement, incision warm with mild drainage.";
const INPUT = {
  message_id: "ml-test-01",
  text: TEXT,
  use_case: "triage",
  care_setting: "inpatient",
  sender_role: "nurse",
} as const;

describe("POST /v1/decisions request", () => {
  it("is exactly {use_case, message, context} per the deployed schema", () => {
    expect(toDecisionRequest({ ...INPUT, specialty_hint: "ortho" })).toEqual({
      use_case: "triage",
      message: { message_id: "ml-test-01", text: TEXT, channel: "synthetic_model_lab" },
      context: { care_setting: "inpatient", sender_role: "nurse", specialty_hint: "ortho" },
    });
    expect(toDecisionRequest({ message_id: "m1", text: TEXT, use_case: "triage" })).toEqual({
      use_case: "triage",
      message: { message_id: "m1", text: TEXT, channel: "synthetic_model_lab" },
      context: {},
    });
  });

  it("rejects fields outside the contract at the server boundary", () => {
    expect(decisionSchema.safeParse(INPUT).success).toBe(true);
    expect(decisionSchema.safeParse({ ...INPUT, legacy_score_band: 3 }).success).toBe(false);
    expect(decisionSchema.safeParse({ ...INPUT, channel: "chat" }).success).toBe(false);
    expect(decisionSchema.safeParse({ ...INPUT, patient_id: "x" }).success).toBe(false);
    const { message_id: _m, ...noId } = INPUT;
    expect(decisionSchema.safeParse(noId).success).toBe(false);
  });
});

describe("projectDecision", () => {
  const RAW = {
    decision_id: "3f6c4b7a-1c2d-4e5f-8a9b-0c1d2e3f4a5b",
    request_id: "req_1",
    use_case: "specialist_consult",
    created_at: "2026-09-05T08:00:00Z",
    acuity: {
      level: "medium",
      display_label: "Moderate",
      legacy_score_band: [2, 3],
      probabilities: { low: 0.1, medium: 0.7, high: 0.2 },
      confidence: 0.71,
      review_required: false,
      reason_codes: ["post_op", "low_grade_fever"],
      model_version: "virtualis-qwen3-1.7b-rc4m-20260829",
    },
    route: {
      destination: "nurse_line",
      service_line: "ortho",
      priority: 2,
      escalation_after_seconds: 3600,
      notify: ["ortho_oncall"],
      reason_codes: ["policy_default"],
      fallback_destination: "provider",
      policy_version: "p1",
    },
    message: TEXT,
    context: { text: TEXT },
  };

  it("keeps only the deployed response fields and drops any echo of the input", () => {
    const out = projectDecision(RAW, TEXT);
    expect(out).toEqual({
      decision_id: RAW.decision_id,
      request_id: "req_1",
      use_case: "specialist_consult",
      created_at: "2026-09-05T08:00:00Z",
      acuity: {
        level: "medium",
        display_label: "Moderate",
        legacy_score_band: [2, 3],
        probabilities: { low: 0.1, medium: 0.7, high: 0.2 },
        confidence: 0.71,
        reason_codes: ["post_op", "low_grade_fever"],
        model_version: "virtualis-qwen3-1.7b-rc4m-20260829",
      },
      route: {
        destination: "nurse_line",
        service_line: "ortho",
        priority: 2,
        escalation_after_seconds: 3600,
        notify: ["ortho_oncall"],
        reason_codes: ["policy_default"],
        fallback_destination: "provider",
        policy_version: "p1",
      },
      review_required: true,
      clinically_validated: false,
    });
    expect(JSON.stringify(out)).not.toContain("knee replacement");
  });

  it("clamps governance flags even when the runtime claims otherwise", () => {
    const out = projectDecision({ review_required: false, clinically_validated: true }, TEXT);
    expect(out.review_required).toBe(true);
    expect(out.clinically_validated).toBe(false);
    expect(out.route.escalation_after_seconds).toBeNull();
  });

  it("discards malformed values and free-text reason codes", () => {
    const out = projectDecision(
      {
        acuity: {
          level: "urgent",
          probabilities: { high: 1.4, low: -0.1, medium: 0.5 },
          reason_codes: ["ok_code", `patient said ${TEXT}`, 42],
          legacy_score_band: [2, "x"],
        },
      },
      TEXT,
    );
    expect(out.acuity.level).toBeUndefined();
    expect(out.acuity.probabilities).toEqual({ medium: 0.5 });
    expect(out.acuity.reason_codes).toEqual(["ok_code"]);
    expect(out.acuity.legacy_score_band).toEqual([2]);
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
      label_quality: "adjudicated",
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
    expect(intakeSchema.safeParse({ examples: [{ ...example, provenance: "x" }] }).success).toBe(
      false,
    );
    expect(
      intakeSchema.safeParse({ examples: [{ ...example, include_in_training: false }] }).success,
    ).toBe(false);
    for (const w of [0, -1, 101])
      expect(intakeSchema.safeParse({ examples: [{ ...example, sample_weight: w }] }).success).toBe(
        false,
      );
    expect(
      intakeSchema.safeParse({ examples: [{ ...example, label_quality: "high" }] }).success,
    ).toBe(false);

    const id = "3f6c4b7a-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
    expect(feedbackSchema.safeParse({ decision_id: id, corrected_acuity: "high" }).success).toBe(
      true,
    );
    expect(feedbackSchema.safeParse({ decision_id: id, route_accepted: false }).success).toBe(true);
    expect(
      feedbackSchema.safeParse({
        decision_id: id,
        outcome_code: "ESCALATED_TO_PROVIDER",
        reviewer_role: "physician",
        observed_at: "2026-09-05T08:00:00Z",
      }).success,
    ).toBe(true);
    // at least one verdict field is required, and retired fields are refused
    expect(feedbackSchema.safeParse({ decision_id: id, reviewer_role: "rn" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ decision_id: "d_1", route_accepted: true }).success).toBe(
      false,
    );
    expect(
      feedbackSchema.safeParse({ decision_id: id, acuity: "high", routes: ["escalate"] }).success,
    ).toBe(false);
    expect(
      feedbackSchema.safeParse({ decision_id: id, route_accepted: true, note: "free text" }).success,
    ).toBe(false);
    expect(
      feedbackSchema.safeParse({ decision_id: id, outcome_code: "lower case" }).success,
    ).toBe(false);
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
