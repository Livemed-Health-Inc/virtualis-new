import { describe, expect, it } from "vitest";
import {
  completionRate,
  parseImport,
  submissionProblem,
  toJsonl,
  type DraftInput,
  type ExportRow,
  type Overview,
} from "./review";

const draft = (o: Partial<DraftInput> = {}): DraftInput => ({
  item_id: "11111111-1111-4111-8111-111111111111",
  acuity: null,
  needs_info: false,
  rationale: "",
  routes: [],
  no_specialty_needed: false,
  submit: true,
  ...o,
});

describe("submissionProblem", () => {
  const good = { acuity: "high" as const, rationale: "Escalating respiratory distress." };

  it("accepts a graded acuity with a rationale", () => {
    expect(submissionProblem(draft(good))).toBeNull();
  });

  it("accepts not-enough-information with no acuity", () => {
    expect(
      submissionProblem(draft({ needs_info: true, rationale: "No vitals or timing given." })),
    ).toBeNull();
  });

  it("refuses an acuity together with not-enough-information", () => {
    expect(submissionProblem(draft({ ...good, needs_info: true }))).toMatch(/not both/);
  });

  it("refuses a missing acuity", () => {
    expect(submissionProblem(draft({ rationale: "Looks unremarkable overall." }))).toMatch(
      /Low, Moderate, High/,
    );
  });

  it("refuses a rationale that is too short", () => {
    expect(submissionProblem(draft({ acuity: "low", rationale: "fine" }))).toMatch(/rationale/);
  });

  it("keeps no-specialty-needed distinct from a chosen route", () => {
    expect(
      submissionProblem(draft({ ...good, no_specialty_needed: true, routes: ["cardiology"] })),
    ).toMatch(/No specialty needed/);
    expect(submissionProblem(draft({ ...good, no_specialty_needed: true }))).toBeNull();
    expect(submissionProblem(draft({ ...good, routes: ["cardiology"] }))).toBeNull();
  });

  it("refuses an identifier in the rationale", () => {
    expect(
      submissionProblem(draft({ ...good, rationale: "Call the family at 555-867-5309 today." })),
    ).toMatch(/identifier/);
  });
});

describe("parseImport", () => {
  const line = (o: Record<string, unknown>) => JSON.stringify(o);

  it("preserves per-row flags exactly as written", () => {
    const { rows } = parseImport(
      [
        line({
          record_id: "r1",
          message: "Chest tightness after climbing stairs.",
          deidentification_reviewed: true,
          context_sufficient: false,
          additional_context_needed: true,
        }),
        line({ record_id: "r2", message: "Routine refill request." }),
      ].join("\n"),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      deidentification_reviewed: true,
      context_sufficient: false,
      additional_context_needed: true,
    });
    expect(rows[1]).toMatchObject({
      deidentification_reviewed: false,
      context_sufficient: false,
      additional_context_needed: false,
    });
  });

  it("drops imported labels and reviewer identity instead of prefilling them", () => {
    const p = parseImport(
      line({
        record_id: "r1",
        message: "Mild rash on forearm.",
        reviewed_label: 4,
        reviewer_id: "dr-x",
      }),
    );
    expect(p.discardedFields).toEqual(expect.arrayContaining(["reviewed_label", "reviewer_id"]));
    expect(JSON.stringify(p.rows[0])).not.toMatch(/reviewed_label|reviewer_id|dr-x/);
  });

  it("refuses malformed rows, duplicates and possible identifiers", () => {
    const p = parseImport(
      [
        "{not json",
        line({ record_id: "r1", message: "Cough for two days." }),
        line({ record_id: "r1", message: "Cough for two days." }),
        line({ record_id: "r2", message: "Reach me at jane.doe@example.com." }),
      ].join("\n"),
    );
    expect(p.rows).toHaveLength(1);
    expect(p.rejected.map((r) => r.reason)).toEqual([
      "not valid JSON",
      "duplicate record_id",
      "possible identifier in text",
    ]);
  });

  it("defaults the grouping key to the record id", () => {
    const p = parseImport(line({ record_id: "r9", message: "Headache since morning." }));
    expect(p.rows[0]!.group_key).toBe("r9");
  });

  it("preserves patient, encounter and template lineage", () => {
    const p = parseImport(
      line({
        record_id: "r10",
        message: "Ongoing dizziness on standing.",
        patient_group: "pt-4",
        encounter_group: "enc-9",
        template_group: "tpl-2",
      }),
    );
    expect(p.rows[0]).toMatchObject({
      patient_group: "pt-4",
      encounter_group: "enc-9",
      template_group: "tpl-2",
    });
  });

  it("keeps an unknown split unassigned instead of calling it training data", () => {
    const p = parseImport(
      [
        line({ record_id: "s1", message: "Sore knee after a fall." }),
        line({ record_id: "s2", message: "Cough for a week.", split: "validation" }),
        line({ record_id: "s3", message: "Rash on the arm.", holdout: true }),
        line({ record_id: "s4", message: "Back pain.", split: "sneaky" }),
      ].join("\n"),
    );
    expect(p.rows.map((r) => r.split)).toEqual(["unassigned", "validation", "test"]);
    expect(p.rejected).toHaveLength(1);
  });
});

describe("toJsonl", () => {
  const row = (o: Partial<ExportRow> = {}): ExportRow =>
    ({
      record_id: "r1",
      text_value: "Fever and chills for two days.",
      acuity: "medium",
      routes: ["general_medicine"],
      routes_state: "adjudicated",
      no_specialty_needed: false,
      group_id: "g1",
      patient_group: "pt-1",
      encounter_group: "enc-1",
      template_group: "tpl-1",
      split: "train",
      label_quality: "adjudicated",
      ...o,
    }) as ExportRow;

  it("emits the existing intake record shape and preserves lineage and splits", () => {
    const r = toJsonl([row(), row({ record_id: "r2", split: "test" })]);
    expect(r.exported).toBe(2);
    const records = r.jsonl.split("\n").map((l) => JSON.parse(l));
    expect(records[0]).toMatchObject({
      record_id: "r1",
      acuity: "medium",
      split: "train",
      patient_group: "pt-1",
      encounter_group: "enc-1",
      template_group: "tpl-1",
    });
    expect(records[1]!.split).toBe("test");
  });

  it("keeps an unreviewed route distinct from no specialty needed", () => {
    const [unreviewed, none] = toJsonl([
      row({ routes: [], routes_state: "unreviewed" }),
      row({ record_id: "r2", routes: [], routes_state: "agreed" }),
    ])
      .jsonl.split("\n")
      .map((l) => JSON.parse(l));
    expect(unreviewed).toMatchObject({ routes_reviewed: false, no_specialty_needed: false });
    expect(none).toMatchObject({ routes_reviewed: true, no_specialty_needed: true });
  });

  it("blocks rows whose text looks like an identifier", () => {
    const r = toJsonl([row({ text_value: "MRN: 88231 needs follow-up." })]);
    expect(r.exported).toBe(0);
    expect(r.blocked[0]).toMatchObject({ reason: "possible identifier" });
  });
});

describe("completionRate", () => {
  const overview = (c: Partial<Overview["clinical"]>): Overview => ({
    clinical: {
      total: 0,
      unreviewed: 0,
      in_review: 0,
      agreed: 0,
      disagreement: 0,
      needs_info: 0,
      adjudicated: 0,
      route_disagreement: 0,
      exportable: 0,
      ...c,
    },
    practice: { total: 12, resolved: 12 },
    assignments: 0,
  });

  it("counts resolved clinical work only, never practice", () => {
    expect(completionRate(overview({ total: 4, agreed: 1, adjudicated: 1 }))).toBe(0.5);
    expect(completionRate(overview({}))).toBe(0);
  });
});
