import { describe, expect, it } from "vitest";
import { projectDecision, projectInfo, projectIntake } from "./contract";

const TEXT = "Synthetic: post-op day 3 knee replacement, incision warm with mild drainage.";

describe("projectDecision", () => {
  it("keeps only the contract fields and drops any echo of the input", () => {
    const out = projectDecision(
      {
        decision_id: "d_1",
        label: "medium",
        probabilities: { low: 0.1, medium: 0.7, high: 0.2 },
        model_version: "rc3",
        policy_version: "p1",
        routing: { destination: "nurse_line", priority: "routine", fallback: "provider" },
        text: TEXT,
        input: { text: TEXT },
        debug: { prompt: TEXT },
      },
      TEXT,
    );
    expect(out).toEqual({
      decision_id: "d_1",
      label: "medium",
      probabilities: { low: 0.1, medium: 0.7, high: 0.2 },
      review_required: true,
      clinically_validated: false,
      model_version: "rc3",
      policy_version: "p1",
      routing: { destination: "nurse_line", priority: "routine", fallback: "provider" },
    });
    expect(JSON.stringify(out)).not.toContain("knee replacement");
  });

  it("clamps governance flags even when the runtime claims otherwise", () => {
    const out = projectDecision({ review_required: false, clinically_validated: true }, TEXT);
    expect(out.review_required).toBe(true);
    expect(out.clinically_validated).toBe(false);
  });

  it("normalizes legacy field names and discards malformed values", () => {
    const out = projectDecision(
      {
        predicted_label: "high",
        class_probabilities: { high: 1.4, low: -0.1, medium: 0.5 },
        label: "urgent",
      },
      TEXT,
    );
    expect(out.label).toBe("high");
    expect(out.probabilities).toEqual({ medium: 0.5 });
  });

  it("rejects a reply whose short fields echo the submitted text", () => {
    const short = "chest pain now";
    expect(() => projectDecision({ routing: { destination: `re: ${short}` } }, short)).toThrow(
      /echoed input/,
    );
  });

  it("rejects a reply carrying a possible identifier", () => {
    expect(() => projectDecision({ routing: { service_line: "MRN 00412-77" } }, TEXT)).toThrow(
      /identifier/,
    );
    expect(() => projectInfo({ model_version: "call 555-123-4567" })).toThrow(/identifier/);
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
