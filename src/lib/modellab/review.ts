/* Clinical Review console — pure logic. No network, no PHI: cases carry
   synthetic or approved deidentified Model Lab text only, and verdicts are
   structured fields with no clinical narrative. */
import { z } from "zod";
import {
  LABELS,
  QUALITY_LEVELS,
  ROUTES,
  USE_CASES,
  normalizeRouteLabel,
  screenOutbound,
  type IntakeExample,
  type Label,
} from "./training";

/* Fixed verdict vocabulary — mirrored by a CHECK constraint on the table. */
export const OUTCOME_CODES = [
  "AGREE_WITH_MODEL",
  "UNDER_TRIAGED",
  "OVER_TRIAGED",
  "WRONG_ROUTE",
  "AMBIGUOUS_TEXT",
  "INSUFFICIENT_INFO",
  "ESCALATED_TO_PROVIDER",
] as const;
export type OutcomeCode = (typeof OUTCOME_CODES)[number];

export const REVIEW_STATES = [
  "pending",
  "single_reviewed",
  "disagreement",
  "expert_reviewed",
  "adjudicated",
] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export interface ReviewCase {
  id: string;
  decision_id: string;
  use_case: string;
  message_text: string;
  predicted_acuity: Label;
  confidence: number | null;
  probabilities: Partial<Record<Label, number>>;
  reason_codes: string[];
  route_destination: string | null;
  policy_version: string | null;
  model_version: string;
  care_setting: string | null;
  sender_role: string | null;
  state: ReviewState;
  final_acuity: Label | null;
  label_quality: (typeof QUALITY_LEVELS)[number] | null;
  created_at: string;
}

export const verdictSchema = z
  .object({
    case_id: z.string().uuid(),
    acuity: z.enum(LABELS),
    route_accepted: z.boolean(),
    outcome_code: z.enum(OUTCOME_CODES),
  })
  .strict();
export type VerdictInput = z.infer<typeof verdictSchema>;

export const queueFilterSchema = z
  .object({
    predicted: z.enum(LABELS).optional(),
    use_case: z.enum(USE_CASES).optional(),
    state: z.enum(REVIEW_STATES).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .strict();
export type QueueFilter = z.infer<typeof queueFilterSchema>;

export interface ReviewStats {
  pending: number;
  single_reviewed: number;
  expert_reviewed: number;
  adjudicated: number;
  disagreement: number;
  adjudicated_high: number;
  second_reviewed: number;
  agreed: number;
}

/* Bounding high-acuity recall to ±5 points needs roughly this many
   independently adjudicated high-acuity cases. It is the release gate. */
export const HIGH_ACUITY_TARGET = 126;

/** Share of twice-reviewed cases where the two reviewers agreed outright.
    Null while no case has had a second independent review. */
export const agreementRate = (s: ReviewStats): number | null =>
  s.second_reviewed > 0 ? s.agreed / s.second_reviewed : null;

export const highAcuityProgress = (s: ReviewStats) => ({
  have: s.adjudicated_high,
  need: HIGH_ACUITY_TARGET,
  remaining: Math.max(HIGH_ACUITY_TARGET - s.adjudicated_high, 0),
  fraction: Math.min(s.adjudicated_high / HIGH_ACUITY_TARGET, 1),
});

/* An adjudicated case becomes an ordinary intake record, so reviewed data
   flows into training only through the existing governed path. */
export function toIntakeRecord(c: ReviewCase): IntakeExample {
  if (c.label_quality !== "adjudicated" || !c.final_acuity)
    throw new Error("only adjudicated cases with a final label can be exported");
  const route = normalizeRouteLabel(c.route_destination);
  return {
    record_id: c.decision_id,
    text: c.message_text,
    acuity: c.final_acuity,
    use_case: (USE_CASES as readonly string[]).includes(c.use_case)
      ? (c.use_case as IntakeExample["use_case"])
      : "clinical_message",
    routes: route && ROUTES.includes(route) ? [route] : [],
    label_quality: "adjudicated",
    sample_weight: 1,
    include_in_training: true,
    group_id: c.decision_id,
    split: "train",
  };
}

export interface ExportResult {
  jsonl: string;
  exported: number;
  blocked: { record_id: string; reason: string }[];
}

/** Governed export: adjudicated labels only, and every record is put through
    the same identifier screening as the rest of the lab. There is deliberately
    no option to skip the screen. */
export function exportAdjudicated(cases: ReviewCase[]): ExportResult {
  const lines: string[] = [];
  const blocked: ExportResult["blocked"] = [];
  for (const c of cases) {
    if (c.label_quality !== "adjudicated" || !c.final_acuity) {
      blocked.push({ record_id: c.decision_id, reason: "not adjudicated" });
      continue;
    }
    const record = toIntakeRecord(c);
    const flagged = screenOutbound(record);
    if (flagged.length) {
      blocked.push({ record_id: c.decision_id, reason: "possible identifier" });
      continue;
    }
    lines.push(JSON.stringify(record));
  }
  return { jsonl: lines.join("\n"), exported: lines.length, blocked };
}
