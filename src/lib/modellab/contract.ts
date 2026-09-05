/* Model Lab wire contract (canonical Acuity API).
   Requests are built here so only the documented fields ever leave the
   server; replies are projected onto fixed, short-field shapes so submitted
   text and identifiers cannot be echoed back, and the governance clamps
   (clinically_validated=false, human review mandatory) hold regardless of
   what the runtime claims. */
import { detectIdentifiers, type IntakeExample, type Label, LABELS } from "./training";

export { LABELS, type Label };
/* Decisions from this surface are always tagged as Model Lab traffic. */
export const DECISION_CHANNEL = "synthetic_model_lab" as const;

type Str = string | undefined;
type Num = number | undefined;

/* POST /v1/decisions — exact deployed body, nothing else. */
export interface DecisionInput {
  message_id: string;
  text: string;
  use_case: IntakeExample["use_case"];
  care_setting?: string | undefined;
  sender_role?: string | undefined;
  specialty_hint?: string | undefined;
}

export const toDecisionRequest = (d: DecisionInput) => ({
  use_case: d.use_case,
  message: { message_id: d.message_id, text: d.text, channel: DECISION_CHANNEL },
  context: {
    ...(d.care_setting ? { care_setting: d.care_setting } : {}),
    ...(d.sender_role ? { sender_role: d.sender_role } : {}),
    ...(d.specialty_hint ? { specialty_hint: d.specialty_hint } : {}),
  },
});

export interface Decision {
  decision_id?: Str;
  request_id?: Str;
  use_case?: Str;
  created_at?: Str;
  acuity: {
    level?: Label | undefined;
    display_label?: Str;
    legacy_score_band: number[];
    probabilities: Partial<Record<Label, number>>;
    confidence?: Num;
    reason_codes: string[];
    model_version?: Str;
  };
  route: {
    destination?: Str;
    service_line?: Str;
    priority?: Num;
    escalation_after_seconds: number | null;
    notify: string[];
    reason_codes: string[];
    fallback_destination?: Str;
    policy_version?: Str;
  };
  review_required: true;
  clinically_validated: false;
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
  example_count?: Num;
  sha256?: Str;
  state?: Str;
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {};
const short = (v: unknown, max = 64) =>
  typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined;
const num = (v: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : undefined;
const label = (v: unknown): Label | undefined =>
  LABELS.includes(v as Label) ? (v as Label) : undefined;
/* Reason codes are machine slugs: bounded count, bounded length, slug charset. */
const codes = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .slice(0, 12)
    .filter((c): c is string => typeof c === "string" && /^[a-z0-9_.:-]{1,48}$/i.test(c));

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
  const a = obj(r["acuity"]);
  const p = obj(a["probabilities"]);
  const rt = obj(r["route"]);
  const out: Decision = {
    decision_id: short(r["decision_id"], 128),
    request_id: short(r["request_id"], 128),
    use_case: short(r["use_case"]),
    created_at: short(r["created_at"]),
    acuity: {
      level: label(a["level"]),
      display_label: short(a["display_label"]),
      legacy_score_band: (Array.isArray(a["legacy_score_band"]) ? a["legacy_score_band"] : [])
        .map((v) => num(v, 5))
        .filter((v): v is number => v !== undefined)
        .slice(0, 5),
      probabilities: Object.fromEntries(
        LABELS.map((l) => [l, num(p[l], 1)]).filter(([, v]) => v !== undefined),
      ),
      confidence: num(a["confidence"], 1),
      reason_codes: codes(a["reason_codes"]),
      model_version: short(a["model_version"]),
    },
    route: {
      destination: short(rt["destination"]),
      service_line: short(rt["service_line"]),
      priority: num(rt["priority"], 1000),
      escalation_after_seconds: num(rt["escalation_after_seconds"]) ?? null,
      notify: codes(rt["notify"]),
      reason_codes: codes(rt["reason_codes"]),
      fallback_destination: short(rt["fallback_destination"]),
      policy_version: short(rt["policy_version"]),
    },
    review_required: true,
    clinically_validated: false,
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
    example_count: Number.isInteger(n) ? num(n) : undefined,
    sha256: short(r["sha256"], 64),
    state: short(r["state"]),
  };
  assertClean(out);
  return out;
}
