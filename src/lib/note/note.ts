/* Client-safe Virtualis Note contract. */
import { z } from "zod";
import { detectIdentifiers } from "@/lib/modellab/training";

export const SECTIONS = ["subjective", "objective", "assessment", "plan"] as const;
export type Soap = Record<(typeof SECTIONS)[number], string>;

export const MAX_SECTION = 8000;
export const MAX_TRANSCRIPT_LINES = 200;
export const MAX_LINE = 2000;

const section = z.string().max(MAX_SECTION);
export const soapSchema = z.object({
  subjective: section,
  objective: section,
  assessment: section,
  plan: section,
});

export const SOAP_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...SECTIONS],
  properties: Object.fromEntries(SECTIONS.map((s) => [s, { type: "string" }])),
};

export const transcriptSchema = z
  .array(z.string().trim().min(1).max(MAX_LINE))
  .min(1)
  .max(MAX_TRANSCRIPT_LINES);

/** Same identifier rules as the Model Lab. Returns labels only, never values. */
export const screenLines = (lines: string[]) => [...new Set(lines.flatMap(detectIdentifiers))];

/** Database threads have UUID ids; demo threads have numeric ids. */
export const isRealThread = (id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);

/** Clamp model output to the stored limits. */
export const clampSoap = (raw: unknown): Soap => {
  const r = (raw ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    SECTIONS.map((s) => [
      s,
      typeof r[s] === "string" ? (r[s] as string).slice(0, MAX_SECTION) : "",
    ]),
  ) as Soap;
};

export const canSign = (n: Soap) => (n.assessment + n.plan).trim().length > 0;

export const ALIS_INSTRUCTIONS =
  "You are ALIS, a clinical decision-support assistant inside Virtualis for licensed clinicians. " +
  "Be concise and evidence-based. You never make the final clinical decision, never file anything to a chart, " +
  "and never change a message's acuity. Recommend escalation when findings suggest an emergency. " +
  "Do not ask for or repeat patient identifiers.";

export const NOTE_INSTRUCTIONS =
  "Draft a clinical SOAP note from the care-team conversation provided. Use only facts stated in the conversation; " +
  "write 'Not documented' for anything missing. Never invent vitals, results, doses or diagnoses. " +
  "Do not include patient names or identifiers. The physician will review, edit and sign.";
