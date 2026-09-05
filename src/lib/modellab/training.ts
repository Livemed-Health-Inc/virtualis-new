/* Virtualis Model Lab — training-data governance primitives.
   Pure functions: no network, no PHI storage. Synthetic or approved
   deidentified data only. */

export const LABELS = ["low", "medium", "high"] as const;
export const ROUTES = ["self_serve", "nurse_line", "provider", "escalate"] as const;
export const USE_CASES = ["triage", "routing", "escalation", "quality_review"] as const;
export const SPLITS = ["train", "validation", "test"] as const;
export type Label = (typeof LABELS)[number];
export type RouteLabel = (typeof ROUTES)[number];

export interface TrainingExample {
  id: string;
  text: string;
  label: Label | null;
  rawLabel: string;
  routeLabel: RouteLabel | null;
  useCase: (typeof USE_CASES)[number];
  groupId: string;
  split: (typeof SPLITS)[number];
  include: boolean;
  approved: boolean;
  quality: "unrated" | "good" | "needs_work";
  duplicateOf: string | null;
  warnings: string[];
}

/* Canonical POST /v1/training-intake example record. */
export interface IntakeExample {
  record_id: string;
  text: string;
  acuity: Label;
  use_case: (typeof USE_CASES)[number];
  routes: RouteLabel[];
  label_quality: "high" | "medium" | "low";
  sample_weight: number;
  include_in_training: true;
  group_id: string;
  split: (typeof SPLITS)[number];
}

const QUALITY = { good: "high", unrated: "medium", needs_work: "low" } as const;

export const toIntakeExample = (e: TrainingExample & { label: Label }): IntakeExample => ({
  record_id: e.id,
  text: e.text,
  acuity: e.label,
  use_case: e.useCase,
  routes: e.routeLabel ? [e.routeLabel] : [],
  label_quality: QUALITY[e.quality],
  sample_weight: e.quality === "needs_work" ? 0.5 : 1,
  include_in_training: true,
  group_id: e.groupId,
  split: e.split,
});

/* 1 = low, 2-3 = moderate (medium), 4-5 = high. */
export function normalizeLabel(raw: unknown): Label | null {
  if (raw === null || raw === undefined) return null;
  const v = String(raw).trim().toLowerCase();
  if (!v) return null;
  if (["1", "low", "routine"].includes(v)) return "low";
  if (["2", "3", "medium", "moderate", "urgent"].includes(v)) return "medium";
  if (["4", "5", "high", "critical", "emergent"].includes(v)) return "high";
  return null;
}

export function normalizeRouteLabel(raw: unknown): RouteLabel | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return ROUTES.includes(v as RouteLabel) ? (v as RouteLabel) : null;
}

/* RFC4180-ish CSV: quoted fields, escaped "" quotes, embedded commas/newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const push = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    push();
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") push();
    else if (c === "\r") continue;
    else if (c === "\n") endRow();
    else field += c;
  }
  if (field !== "" || row.length) endRow();
  return rows;
}

export function parseRecords(text: string): Record<string, string>[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const looksJsonl = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (looksJsonl) {
    const lines = trimmed.startsWith("[")
      ? (JSON.parse(trimmed) as unknown[])
      : trimmed
          .split("\n")
          .filter((l) => l.trim())
          .map((l) => JSON.parse(l) as unknown);
    return lines.map((o) => {
      const rec: Record<string, string> = {};
      for (const [k, v] of Object.entries(o as Record<string, unknown>))
        rec[k.trim().toLowerCase()] = v === null || v === undefined ? "" : String(v);
      return rec;
    });
  }
  const rows = parseCsv(trimmed);
  if (!rows.length) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = (r[i] ?? "").trim()));
    return rec;
  });
}

const IDENTIFIER_RULES: [string, RegExp][] = [
  ["possible email address", /[\w.%+-]+@[\w.-]+\.[a-z]{2,}/i],
  ["possible SSN", /\b\d{3}-\d{2}-\d{4}\b/],
  ["possible phone number", /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/],
  ["possible MRN", /\b(mrn|medical record(?: number)?)\b\s*[:#]?\s*[a-z0-9-]{4,}/i],
];

export function detectIdentifiers(text: string): string[] {
  return IDENTIFIER_RULES.filter(([, re]) => re.test(text)).map(([label]) => label);
}

const normText = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function buildExamples(records: Record<string, string>[]): TrainingExample[] {
  const seen = new Map<string, string>();
  return records.map((rec, i) => {
    const text = rec["text"] ?? rec["input"] ?? rec["message"] ?? rec["body"] ?? "";
    const rawLabel = rec["label"] ?? rec["acuity"] ?? rec["severity"] ?? rec["score"] ?? "";
    const id = rec["id"] || `ex_${i + 1}`;
    const key = normText(text);
    const duplicateOf = key ? (seen.get(key) ?? null) : null;
    if (key && !duplicateOf) seen.set(key, id);
    const label = normalizeLabel(rawLabel);
    const warnings = detectIdentifiers(text);
    if (!label && rawLabel) warnings.push(`unrecognized label "${rawLabel}"`);
    if (!text.trim()) warnings.push("empty text");
    const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
      list.includes(v as T) ? (v as T) : fallback;
    return {
      id,
      text,
      label,
      rawLabel: String(rawLabel),
      routeLabel: normalizeRouteLabel(rec["route"] ?? rec["route_label"]),
      useCase: pick(USE_CASES, rec["use_case"], "triage"),
      groupId: rec["group_id"] || rec["group"] || id,
      split: pick(SPLITS, rec["split"], "train"),
      include: !duplicateOf,
      approved: false,
      quality: "unrated",
      duplicateOf,
      warnings,
    };
  });
}

/* Deterministic group-aware split so the same patient/group never straddles
   train and eval. */
export function assignSplits(
  examples: TrainingExample[],
  ratios: { validation: number; test: number } = { validation: 0.2, test: 0.1 },
): TrainingExample[] {
  const groups = [...new Set(examples.map((e) => e.groupId))].sort();
  const bucket = new Map<string, TrainingExample["split"]>();
  groups.forEach((g, i) => {
    const p = groups.length === 1 ? 0 : i / groups.length;
    bucket.set(
      g,
      p < ratios.test ? "test" : p < ratios.test + ratios.validation ? "validation" : "train",
    );
  });
  return examples.map((e) => ({ ...e, split: bucket.get(e.groupId) ?? "train" }));
}

export interface ExportIssue {
  reason: string;
  ids: string[];
}

/* Governed export: only approved, included, labelled examples with no
   unresolved identifier warnings ever leave the lab. */
export function exportJsonl(examples: TrainingExample[]): {
  jsonl: string;
  blocked: ExportIssue[];
} {
  const candidates = examples.filter((e) => e.include);
  const blocked: ExportIssue[] = [];
  const add = (reason: string, list: TrainingExample[]) => {
    if (list.length) blocked.push({ reason, ids: list.map((e) => e.id) });
  };
  add(
    "not approved",
    candidates.filter((e) => !e.approved),
  );
  add(
    "missing normalized label",
    candidates.filter((e) => !e.label),
  );
  add(
    "unresolved identifier warning",
    candidates.filter((e) => e.warnings.length > 0),
  );
  const ready = candidates.filter(
    (e): e is TrainingExample & { label: Label } =>
      e.approved && !!e.label && e.warnings.length === 0,
  );
  return { jsonl: ready.map((e) => JSON.stringify(toIntakeExample(e))).join("\n"), blocked };
}

export function datasetStats(examples: TrainingExample[]) {
  const inc = examples.filter((e) => e.include);
  const count = (fn: (e: TrainingExample) => boolean) => examples.filter(fn).length;
  return {
    total: examples.length,
    included: inc.length,
    approved: count((e) => e.approved && e.include),
    duplicates: count((e) => !!e.duplicateOf),
    flagged: count((e) => e.warnings.length > 0),
    labels: {
      low: inc.filter((e) => e.label === "low").length,
      medium: inc.filter((e) => e.label === "medium").length,
      high: inc.filter((e) => e.label === "high").length,
      unlabeled: inc.filter((e) => !e.label).length,
    },
    splits: {
      train: inc.filter((e) => e.split === "train").length,
      validation: inc.filter((e) => e.split === "validation").length,
      test: inc.filter((e) => e.split === "test").length,
    },
  };
}
