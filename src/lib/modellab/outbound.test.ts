import { describe, expect, it } from "vitest";
import { screenOutbound } from "./training";
import {
  MAX_INTAKE_EXAMPLES,
  decisionSchema,
  feedbackSchema,
  intakeSchema,
  intakeTooLarge,
  payloadBytes,
} from "./acuity.schemas";
import { toDecisionRequest } from "./contract";

/* Synthetic marker only: a fake record number, never real patient data. */
const MARKER = "MRN 00412-77";
const TEXT = "Synthetic: post-op day 3, incision warm with mild drainage.";
const DECISION = {
  message_id: "ml-test-01",
  text: TEXT,
  use_case: "specialist_consult",
  care_setting: "inpatient",
  sender_role: "nurse",
  specialty_hint: "ortho",
} as const;
const EXAMPLE = {
  record_id: "rec-1",
  text: TEXT,
  acuity: "medium",
  use_case: "specialist_consult",
  routes: ["nurse_line"],
  label_quality: "adjudicated",
  sample_weight: 1,
  include_in_training: true,
  group_id: "g1",
  split: "train",
} as const;

describe("outbound identifier screening", () => {
  it("finds an identifier in any string, not only the message text", () => {
    expect(screenOutbound({ a: TEXT })).toEqual([]);
    expect(screenOutbound({ context: { specialty_hint: MARKER } })).toEqual([
      "context.specialty_hint",
    ]);
    expect(screenOutbound({ examples: [{ record_id: MARKER }] })).toEqual([
      "examples[0].record_id",
    ]);
    expect(screenOutbound(MARKER)).toEqual(["value"]);
  });

  it("screens every permitted string field of a decision request", () => {
    for (const field of ["message_id", "text", "specialty_hint"] as const) {
      const body = toDecisionRequest({ ...DECISION, [field]: MARKER });
      expect(screenOutbound(body).length).toBeGreaterThan(0);
    }
  });

  it("screens every permitted string field of a training example and feedback", () => {
    for (const field of ["record_id", "group_id", "text"] as const)
      expect(screenOutbound({ examples: [{ ...EXAMPLE, [field]: MARKER }] }).length).toBe(1);
    expect(screenOutbound({ reviewer_role: MARKER, outcome_code: "ESCALATED" })).toEqual([
      "reviewer_role",
    ]);
  });
});

describe("bounded vocabularies", () => {
  it("constrains the decision context fields to known values", () => {
    expect(decisionSchema.safeParse(DECISION).success).toBe(true);
    for (const bad of [
      { care_setting: "hallway" },
      { sender_role: "family member" },
      { specialty_hint: "cardiology, please review MRN" },
      { specialty_hint: MARKER },
    ])
      expect(decisionSchema.safeParse({ ...DECISION, ...bad }).success).toBe(false);
  });

  it("constrains record and group ids to slugs and reviewer role to a vocabulary", () => {
    expect(intakeSchema.safeParse({ examples: [EXAMPLE] }).success).toBe(true);
    for (const bad of [{ record_id: "rec 1 (patient)" }, { group_id: "g 1" }])
      expect(intakeSchema.safeParse({ examples: [{ ...EXAMPLE, ...bad }] }).success).toBe(false);
    const id = "3f6c4b7a-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
    expect(
      feedbackSchema.safeParse({ decision_id: id, route_accepted: true, reviewer_role: MARKER })
        .success,
    ).toBe(false);
  });
});

describe("intake payload ceiling", () => {
  it("caps the example count well below the old 5,000", () => {
    expect(MAX_INTAKE_EXAMPLES).toBe(1200);
    const many = { examples: Array.from({ length: MAX_INTAKE_EXAMPLES + 1 }, () => EXAMPLE) };
    expect(intakeSchema.safeParse(many).success).toBe(false);
  });

  it("refuses a batch whose serialized size approaches the runtime cap", () => {
    const big = {
      examples: Array.from({ length: MAX_INTAKE_EXAMPLES }, (_, i) => ({
        ...EXAMPLE,
        record_id: `rec-${i}`,
        text: "x".repeat(4000),
      })),
    };
    expect(payloadBytes(big)).toBeGreaterThan(5_000_000);
    expect(intakeTooLarge(big)).toBe(true);
    expect(intakeTooLarge({ examples: [EXAMPLE] })).toBe(false);
  });

  it("keeps a decision payload far under the 65,536-byte request limit", () => {
    const max = toDecisionRequest({ ...DECISION, text: "x".repeat(4000) });
    expect(payloadBytes(max)).toBeLessThan(65_536);
  });
});
