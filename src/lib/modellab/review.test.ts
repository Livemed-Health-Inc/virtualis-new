import { describe, expect, it } from "vitest";
import {
  HIGH_ACUITY_TARGET,
  agreementRate,
  exportAdjudicated,
  highAcuityProgress,
  queueFilterSchema,
  redactUnresolved,
  toIntakeRecord,
  verdictSchema,
  type ReviewCase,
  type ReviewStats,
} from "./review";

const CASE_ID = "11111111-1111-4111-8111-111111111111";

const mkCase = (over: Partial<ReviewCase> = {}): ReviewCase => ({
  id: CASE_ID,
  decision_id: "22222222-2222-4222-8222-222222222222",
  use_case: "clinical_message",
  message_text: "Synthetic: mild ankle swelling after a long flight, no chest pain.",
  predicted_acuity: "medium",
  confidence: 0.42,
  probabilities: { low: 0.3, medium: 0.5, high: 0.2 },
  reason_codes: ["symptom_duration"],
  route_destination: "nurse_line",
  policy_version: "p1",
  model_version: "m1",
  care_setting: "clinic",
  sender_role: "patient",
  state: "adjudicated",
  final_acuity: "high",
  label_quality: "adjudicated",
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

const stats = (over: Partial<ReviewStats> = {}): ReviewStats => ({
  pending: 0,
  single_reviewed: 0,
  expert_reviewed: 0,
  adjudicated: 0,
  disagreement: 0,
  adjudicated_high: 0,
  second_reviewed: 0,
  agreed: 0,
  ...over,
});

describe("verdict contract", () => {
  it("accepts a complete structured verdict", () => {
    expect(
      verdictSchema.parse({
        case_id: CASE_ID,
        acuity: "high",
        route_accepted: false,
        outcome_code: "UNDER_TRIAGED",
      }).acuity,
    ).toBe("high");
  });

  it("refuses an outcome code outside the vocabulary", () => {
    expect(() =>
      verdictSchema.parse({
        case_id: CASE_ID,
        acuity: "high",
        route_accepted: true,
        outcome_code: "SEEMED_FINE",
      }),
    ).toThrow();
  });

  it("refuses free-text narrative smuggled into the verdict", () => {
    expect(() =>
      verdictSchema.parse({
        case_id: CASE_ID,
        acuity: "low",
        route_accepted: true,
        outcome_code: "AGREE_WITH_MODEL",
        note: "patient John Doe seemed stable",
      }),
    ).toThrow();
  });

  it("refuses an unknown queue filter key", () => {
    expect(() => queueFilterSchema.parse({ reviewer_id: "someone-else" })).toThrow();
  });
});

describe("reviewer statistics", () => {
  it("has no agreement rate before any second review", () => {
    expect(agreementRate(stats())).toBeNull();
  });

  it("reports the share of twice-reviewed cases that agreed", () => {
    expect(agreementRate(stats({ second_reviewed: 4, agreed: 3 }))).toBeCloseTo(0.75);
  });

  it("makes high-acuity release progress legible", () => {
    const p = highAcuityProgress(stats({ adjudicated_high: 22 }));
    expect(p.need).toBe(HIGH_ACUITY_TARGET);
    expect(p.remaining).toBe(HIGH_ACUITY_TARGET - 22);
    expect(p.fraction).toBeLessThan(1);
  });
});

describe("governed export", () => {
  it("emits the existing intake record shape for an adjudicated case", () => {
    const r = toIntakeRecord(mkCase());
    expect(r).toMatchObject({
      acuity: "high",
      label_quality: "adjudicated",
      routes: ["nurse_line"],
      include_in_training: true,
    });
  });

  it("refuses to export a case that is not adjudicated", () => {
    const out = exportAdjudicated([
      mkCase({ label_quality: "single_reviewed", state: "single_reviewed" }),
    ]);
    expect(out.exported).toBe(0);
    expect(out.blocked[0]?.reason).toBe("not adjudicated");
    expect(out.jsonl).toBe("");
  });

  it("withholds a record whose text carries an identifier marker", () => {
    const out = exportAdjudicated([
      mkCase({ message_text: "Contact patient at 555-867-5309 regarding results." }),
    ]);
    expect(out.exported).toBe(0);
    expect(out.blocked[0]?.reason).toBe("possible identifier");
  });

  it("exports one JSONL line per clean adjudicated case", () => {
    const out = exportAdjudicated([mkCase(), mkCase({ decision_id: CASE_ID })]);
    expect(out.exported).toBe(2);
    expect(out.jsonl.split("\n")).toHaveLength(2);
    expect(JSON.parse(out.jsonl.split("\n")[0]!).label_quality).toBe("adjudicated");
  });
});

describe("reviewer independence", () => {
  it("strips a label from a case still awaiting verdicts", () => {
    const c = redactUnresolved(
      mkCase({ state: "single_reviewed", label_quality: "single_reviewed", final_acuity: "high" }),
    );
    expect(c.final_acuity).toBeNull();
    expect(
      JSON.stringify({ ...c, message_text: "", predicted_acuity: "", probabilities: {} }),
    ).not.toMatch(/high/);
  });

  it("strips a label from a disagreement awaiting adjudication", () => {
    expect(
      redactUnresolved(mkCase({ state: "disagreement", label_quality: null, final_acuity: "low" }))
        .final_acuity,
    ).toBeNull();
  });

  it("keeps the resolved label on terminal cases", () => {
    expect(redactUnresolved(mkCase()).final_acuity).toBe("high");
    expect(
      redactUnresolved(mkCase({ state: "expert_reviewed", label_quality: "expert_reviewed" }))
        .final_acuity,
    ).toBe("high");
  });
});
