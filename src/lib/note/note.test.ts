import { describe, expect, it } from "vitest";
import {
  SOAP_JSON_SCHEMA,
  canSign,
  clampSoap,
  isRealThread,
  screenLines,
  soapSchema,
  transcriptSchema,
} from "./note";

describe("Virtualis Note contract", () => {
  it("strict SOAP schema: every section required, no extras", () => {
    expect(SOAP_JSON_SCHEMA.required).toEqual(["subjective", "objective", "assessment", "plan"]);
    expect(SOAP_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(soapSchema.safeParse({ subjective: "", objective: "", assessment: "" }).success).toBe(
      false,
    );
  });

  it("clamps malformed model output", () => {
    const n = clampSoap({ subjective: 1, plan: "x".repeat(9000), extra: "y" });
    expect(n).toEqual({ subjective: "", objective: "", assessment: "", plan: "x".repeat(8000) });
  });

  it("refuses identifiers and bounds the transcript", () => {
    expect(screenLines(["MRN: 176471 lactate up"])).toContain("possible MRN");
    expect(screenLines(["Lactate 4.1, MAP 62"])).toEqual([]);
    expect(transcriptSchema.safeParse([]).success).toBe(false);
    expect(transcriptSchema.safeParse(Array(201).fill("a")).success).toBe(false);
  });

  it("distinguishes live threads from demo threads", () => {
    expect(isRealThread("0b8f1c2e-1111-4222-8333-944455556666")).toBe(true);
    expect(isRealThread(3)).toBe(false);
  });

  it("signing needs an assessment or plan", () => {
    expect(canSign({ subjective: "s", objective: "o", assessment: " ", plan: "" })).toBe(false);
    expect(canSign({ subjective: "", objective: "", assessment: "", plan: "Admit" })).toBe(true);
  });
});
