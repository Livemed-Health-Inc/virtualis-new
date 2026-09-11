/* Physician Review workflow — pure logic. No network, no PHI, no storage.
   Acuity is expressed as Low / Moderate / High only: this surface never shows
   or accepts a numeric acuity score. */
import { z } from "zod";
import { detectIdentifiers } from "@/lib/modellab/training";

export const ACUITY = ["low", "medium", "high"] as const;
export type Acuity = (typeof ACUITY)[number];

/** Display vocabulary shared by every physician-facing control. */
export const ACUITY_UI: Record<Acuity, { label: string; tone: "green" | "amber" | "red" }> = {
  low: { label: "Low", tone: "green" },
  medium: { label: "Moderate", tone: "amber" },
  high: { label: "High", tone: "red" },
};

/** Acceptable specialist routes. A closed vocabulary, so no prose can be
    smuggled through the route field. */
export const SPECIALTIES = [
  "cardiology",
  "pulmonology",
  "neurology",
  "psychiatry",
  "infectious_disease",
  "nephrology",
  "endocrinology",
  "gastroenterology",
  "obstetrics",
  "pediatrics",
  "general_medicine",
  "emergency",
] as const;
export type Specialty = (typeof SPECIALTIES)[number];

export const MODES = ["clinical", "practice"] as const;
export type Mode = (typeof MODES)[number];

export const OUTCOME_STATES = [
  "unreviewed",
  "in_review",
  "needs_info",
  "agreed",
  "disagreement",
  "adjudicated",
] as const;
export type OutcomeState = (typeof OUTCOME_STATES)[number];

export const STATE_LABEL: Record<OutcomeState, string> = {
  unreviewed: "Not yet reviewed",
  in_review: "One review recorded",
  needs_info: "Not enough information",
  agreed: "Two reviewers agree",
  disagreement: "Disagreement — needs adjudication",
  adjudicated: "Adjudicated",
};

export const MIN_RATIONALE = 10;

/* ── Physician submission ────────────────────────────────────────────────── */

export const draftSchema = z
  .object({
    item_id: z.string().uuid(),
    acuity: z.enum(ACUITY).nullable().default(null),
    needs_info: z.boolean().default(false),
    rationale: z.string().max(1000).default(""),
    routes: z.array(z.enum(SPECIALTIES)).max(SPECIALTIES.length).default([]),
    no_specialty_needed: z.boolean().default(false),
    submit: z.boolean().default(false),
  })
  .strict();
export type DraftInput = z.infer<typeof draftSchema>;

/** Why a submission is not yet complete, or null when it is ready. Shared by
    the screen and the server so both refuse the same shapes. */
export function submissionProblem(d: DraftInput): string | null {
  if (d.needs_info && d.acuity)
    return "Choose either an acuity or the not-enough-information status, not both.";
  if (!d.needs_info && !d.acuity) return "Choose Low, Moderate, High, or not enough information.";
  if (d.rationale.trim().length < MIN_RATIONALE)
    return `A short rationale of at least ${MIN_RATIONALE} characters is required.`;
  if (d.no_specialty_needed && d.routes.length)
    return "“No specialty needed” cannot be combined with specialist routes.";
  if (detectIdentifiers(d.rationale).length)
    return "The rationale looks like it contains an identifier. Synthetic or deidentified text only.";
  return null;
}

/* ── Coordinator import ──────────────────────────────────────────────────── */

/** One reviewer JSONL row as produced upstream. Labels and reviewer identity
    present in the file are deliberately dropped: nothing here prefills a
    review, and they are never stored or shown in provenance. */
export const importRowSchema = z
  .object({
    record_id: z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/),
    message: z.string().min(1).max(4000),
    context: z.string().max(2000).optional(),
    group_key: z
      .string()
      .regex(/^[A-Za-z0-9_.:-]{1,128}$/)
      .optional(),
    holdout: z.boolean().optional(),
    additional_context_needed: z.boolean().optional(),
    context_sufficient: z.boolean().optional(),
    deidentification_reviewed: z.boolean().optional(),
  })
  .passthrough();

export interface ImportRow {
  record_id: string;
  message: string;
  context?: string;
  group_key: string;
  holdout: boolean;
  additional_context_needed: boolean;
  context_sufficient: boolean;
  deidentification_reviewed: boolean;
}

export interface ImportParse {
  rows: ImportRow[];
  /** Rows refused, with the reason. Values are never echoed back. */
  rejected: { line: number; reason: string }[];
  /** Fields present in the file that are deliberately discarded. */
  discardedFields: string[];
}

const DISCARDED = ["reviewed_label", "reviewer_id", "rationale", "acuity", "label"] as const;
const bool = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";

/** Parses reviewer JSONL. Per-row flags are preserved exactly as written —
    a false flag is never turned true by a blanket setting. */
export function parseImport(text: string): ImportParse {
  const rows: ImportRow[] = [];
  const rejected: ImportParse["rejected"] = [];
  const discarded = new Set<string>();
  const seen = new Set<string>();

  text
    .split("\n")
    .map((l) => l.trim())
    .forEach((line, i) => {
      if (!line) return;
      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(line) as Record<string, unknown>;
      } catch {
        rejected.push({ line: i + 1, reason: "not valid JSON" });
        return;
      }
      for (const f of DISCARDED) if (f in raw) discarded.add(f);
      const parsed = importRowSchema.safeParse(raw);
      if (!parsed.success) {
        rejected.push({ line: i + 1, reason: "missing or invalid record_id/message" });
        return;
      }
      const r = parsed.data;
      if (seen.has(r.record_id)) {
        rejected.push({ line: i + 1, reason: "duplicate record_id" });
        return;
      }
      if (detectIdentifiers(r.message).length || detectIdentifiers(r.context ?? "").length) {
        rejected.push({ line: i + 1, reason: "possible identifier in text" });
        return;
      }
      seen.add(r.record_id);
      rows.push({
        record_id: r.record_id,
        message: r.message,
        ...(r.context ? { context: r.context } : {}),
        group_key: r.group_key || r.record_id,
        holdout: bool(raw["holdout"]),
        additional_context_needed: bool(raw["additional_context_needed"]),
        context_sufficient: bool(raw["context_sufficient"]),
        deidentification_reviewed: bool(raw["deidentification_reviewed"]),
      });
    });

  return { rows, rejected, discardedFields: [...discarded] };
}

/* ── Export ──────────────────────────────────────────────────────────────── */

export interface ExportRow {
  record_id: string;
  text_value: string;
  acuity: Acuity;
  routes: string[];
  group_id: string;
  split: "train" | "test";
  label_quality: "expert_reviewed" | "adjudicated";
}

export interface ExportResult {
  jsonl: string;
  exported: number;
  blocked: { record_id: string; reason: string }[];
}

/** Governed serialization into the existing intake record shape. Holdout
    groups keep their split, and every row is screened again on the way out. */
export function toJsonl(rows: ExportRow[]): ExportResult {
  const lines: string[] = [];
  const blocked: ExportResult["blocked"] = [];
  for (const r of rows) {
    if (detectIdentifiers(r.text_value).length) {
      blocked.push({ record_id: r.record_id, reason: "possible identifier" });
      continue;
    }
    lines.push(
      JSON.stringify({
        record_id: r.record_id,
        text: r.text_value,
        acuity: r.acuity,
        use_case: "clinical_message",
        routes: r.routes,
        label_quality: r.label_quality,
        sample_weight: 1,
        include_in_training: true,
        group_id: r.group_id,
        split: r.split,
      }),
    );
  }
  return { jsonl: lines.join("\n"), exported: lines.length, blocked };
}

/** Progress a coordinator can act on. Practice items are counted separately
    and never contribute to the clinical totals. */
export interface Overview {
  clinical: {
    total: number;
    unreviewed: number;
    in_review: number;
    agreed: number;
    disagreement: number;
    needs_info: number;
    adjudicated: number;
    route_disagreement: number;
    exportable: number;
  };
  practice: { total: number; resolved: number };
  assignments: number;
}

export const completionRate = (o: Overview): number =>
  o.clinical.total === 0
    ? 0
    : (o.clinical.agreed + o.clinical.adjudicated + o.clinical.needs_info) / o.clinical.total;
