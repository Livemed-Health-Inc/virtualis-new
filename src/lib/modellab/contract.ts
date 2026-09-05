/* Model Lab response contract. Upstream JSON is never passed through to the
   browser: each handler projects the runtime's reply onto these fixed, short-
   field shapes, so submitted text and identifiers cannot be echoed back, and
   the governance clamps (clinically_validated=false, human review mandatory)
   hold regardless of what the runtime claims. */
import { detectIdentifiers } from "./training";

export const LABELS = ["low", "medium", "high"] as const;
export type Label = (typeof LABELS)[number];

type Str = string | undefined;

export interface Decision {
  decision_id?: Str;
  label?: Label | undefined;
  probabilities: Partial<Record<Label, number>>;
  review_required: true;
  clinically_validated: false;
  model_version?: Str;
  policy_version?: Str;
  routing: { destination?: Str; service_line?: Str; priority?: Str; fallback?: Str };
}

export interface RuntimeInfo {
  model_version?: Str;
  policy_version?: Str;
  clinically_validated: false;
}

export interface IntakeReceipt {
  accepted: boolean;
  batch_id?: Str;
  object_key?: Str;
  example_count?: number | undefined;
  sha256?: Str;
  state?: Str;
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {};
const short = (v: unknown, max = 64) =>
  typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined;
const prob = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 1 ? v : undefined);
const label = (v: unknown): Label | undefined =>
  LABELS.includes(v as Label) ? (v as Label) : undefined;

/* Fail closed: a reply that carries the submitted text or anything that looks
   like an identifier is rejected outright rather than partially displayed. */
function assertClean(out: unknown, submitted?: string) {
  const s = JSON.stringify(out).toLowerCase();
  const needle = submitted?.trim().toLowerCase() ?? "";
  if (needle.length >= 12 && s.includes(needle))
    throw new Error("Model runtime response rejected: echoed input");
  if (detectIdentifiers(s).length)
    throw new Error("Model runtime response rejected: possible identifier");
}

export function projectDecision(raw: unknown, submitted: string): Decision {
  const r = obj(raw);
  const p = obj(r["probabilities"] ?? r["class_probabilities"]);
  const rt = obj(r["routing"]);
  const out: Decision = {
    decision_id: short(r["decision_id"], 128),
    label: label(r["label"]) ?? label(r["predicted_label"]),
    probabilities: Object.fromEntries(
      LABELS.map((l) => [l, prob(p[l])]).filter(([, v]) => v !== undefined),
    ),
    review_required: true,
    clinically_validated: false,
    model_version: short(r["model_version"]),
    policy_version: short(r["policy_version"]),
    routing: {
      destination: short(rt["destination"]),
      service_line: short(rt["service_line"]),
      priority: short(rt["priority"]),
      fallback: short(rt["fallback"]),
    },
  };
  assertClean(out, submitted);
  return out;
}

export function projectInfo(raw: unknown): RuntimeInfo {
  const r = obj(raw);
  const out: RuntimeInfo = {
    model_version: short(r["model_version"]),
    policy_version: short(r["policy_version"]),
    clinically_validated: false,
  };
  assertClean(out);
  return out;
}

export function projectIntake(raw: unknown): IntakeReceipt {
  const r = obj(raw);
  const n = r["example_count"];
  const out: IntakeReceipt = {
    accepted: r["accepted"] === true,
    batch_id: short(r["batch_id"], 128),
    object_key: short(r["object_key"], 200),
    example_count: typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : undefined,
    sha256: short(r["sha256"], 64),
    state: short(r["state"]),
  };
  assertClean(out);
  return out;
}
