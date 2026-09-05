import { describe, expect, it } from "vitest";
import {
  assignSplits,
  buildExamples,
  datasetStats,
  detectIdentifiers,
  exportJsonl,
  normalizeLabel,
  parseCsv,
  parseRecords,
} from "./training";

describe("label normalization", () => {
  it("maps 1 to low, 2-3 to medium, 4-5 to high", () => {
    expect(normalizeLabel(1)).toBe("low");
    expect(normalizeLabel("2")).toBe("medium");
    expect(normalizeLabel("3")).toBe("medium");
    expect(normalizeLabel(4)).toBe("high");
    expect(normalizeLabel("5")).toBe("high");
  });
  it("accepts word forms and rejects junk", () => {
    expect(normalizeLabel("Moderate")).toBe("medium");
    expect(normalizeLabel("critical")).toBe("high");
    expect(normalizeLabel("banana")).toBeNull();
    expect(normalizeLabel("")).toBeNull();
  });
});

describe("quoted CSV parsing", () => {
  const csv =
    'text,label\n"Chest pain, radiating to arm",5\n"He said ""I feel fine"" today",1\n"Line one\nline two",3\n';
  it("keeps commas, escaped quotes and newlines inside quoted fields", () => {
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(4);
    expect(rows[1]![0]).toBe("Chest pain, radiating to arm");
    expect(rows[2]![0]).toBe('He said "I feel fine" today');
    expect(rows[3]![0]).toBe("Line one\nline two");
  });
  it("builds normalized examples from the header", () => {
    const ex = buildExamples(parseRecords(csv));
    expect(ex.map((e) => e.label)).toEqual(["high", "low", "medium"]);
  });
  it("parses JSONL too", () => {
    const ex = buildExamples(
      parseRecords('{"text":"cough","label":2}\n{"text":"stroke sx","label":5}'),
    );
    expect(ex.map((e) => e.label)).toEqual(["medium", "high"]);
  });
});

describe("identifier warnings", () => {
  it("flags email, phone, SSN and MRN patterns", () => {
    expect(detectIdentifiers("ping me at jane.doe@example.com")).toContain(
      "possible email address",
    );
    expect(detectIdentifiers("call 312-555-0134")).toContain("possible phone number");
    expect(detectIdentifiers("ssn 123-45-6789")).toContain("possible SSN");
    expect(detectIdentifiers("MRN: 88213-A")).toContain("possible MRN");
    expect(detectIdentifiers("synthetic chest pain vignette")).toEqual([]);
  });
});

describe("duplicates and splits", () => {
  const ex = buildExamples(
    parseRecords(
      "id,text,label,group_id\na,Chest pain,5,g1\nb,  chest   PAIN ,5,g1\nc,Sore throat,1,g2\n",
    ),
  );
  it("marks later identical text as a duplicate and excludes it", () => {
    expect(ex[1]!.duplicateOf).toBe("a");
    expect(ex[1]!.include).toBe(false);
    expect(datasetStats(ex).duplicates).toBe(1);
  });
  it("keeps a group on one side of the split", () => {
    const split = assignSplits(ex);
    expect(split[0]!.split).toBe(split[1]!.split);
  });
});

describe("governed JSONL export", () => {
  const base = buildExamples(
    parseRecords("id,text,label\na,Chest pain radiating,5\nb,email me at x@y.com,1\n"),
  );
  it("blocks unapproved and identifier-flagged rows", () => {
    const { jsonl, blocked } = exportJsonl(base);
    expect(jsonl).toBe("");
    expect(blocked.map((b) => b.reason)).toContain("not approved");
    expect(blocked.map((b) => b.reason)).toContain("unresolved identifier warning");
  });
  it("exports only approved, clean, labelled rows", () => {
    const ready = base.map((e) => ({ ...e, approved: true, include: e.id === "a" }));
    const { jsonl, blocked } = exportJsonl(ready);
    const lines = jsonl.split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toEqual({
      record_id: "a",
      text: "Chest pain radiating",
      acuity: "high",
      use_case: "triage",
      routes: [],
      label_quality: "single_reviewed",
      sample_weight: 1,
      include_in_training: true,
      group_id: "a",
      split: "train",
    });
    expect(blocked).toEqual([]);
  });
});
