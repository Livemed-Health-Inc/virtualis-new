/* Model Lab wire contract (canonical Acuity API).
   Requests are built here so only the documented fields ever leave the
   server; replies are projected onto fixed, short-field shapes so submitted
   text and identifiers cannot be echoed back, and the governance clamps
   (clinically_validated=false, human review mandatory) hold regardless of
   what the runtime claims. */
import { detectIdentifiers, type IntakeExample, type Label, LABELS } from "./training";

export { LABELS, type Label };
export const CHANNELS = ["chat", "portal", "sms", "voice", "device"] as const;
export const SETTINGS = ["ed", "inpatient", "clinic", "telehealth", "home"] as const;
export const SENDERS = ["patient", "nurse", "provider", "device"] as const;

type Str = string | undefined;
type Num = number | undefined;

/* POST /v1/decisions → { message, context } and nothing else. */
export interface DecisionInput {
  text: string;
  channel: (typeof CHANNELS)[number];
  sender_role: (typeof SENDERS)[number];
  care_setting: (typeof SETTINGS)[number];
  use_case: IntakeExample["use_case"];
  specialty_hint?: string | undefined;
  legacy_score_band?: number | undefined;
}

export const toDecisionRequest = ({
  text,
  specialty_hint,
  legacy_score_band,
  ...c
}: DecisionInput) => ({
  message: text,
  context: {
    channel: c.channel,
    sender_role: c.sender_role,
    care_setting: c.care_setting,
    use_case: c.use_case,
    ...(specialty_hint ? { specialty_hint } : {}),
    ...(legacy_score_band ? { legacy_score_band } : {}),
  },
});

export interface Decision {
  decision_id?: Str;
  model_version?: Str;
  policy_version?: Str;
  acuity: {
    level?: Label | undefined;
    score?: Num;
    confidence?: Num;
    probabilities: Partial<Record<Label, number>>;
  };
  route: {
    destination?: Str;
    service_line?: Str;
    priority?: Str;
    sla_seconds?: Num;
    escalation_after_seconds?: Num;
    fallback?: Str;
  };
  reason_codes: string[];
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
    model_version: short(r["model_version"]),
    policy_version: short(r["policy_version"]),
    acuity: {
      level: label(a["level"]),
      score: num(a["score"], 5),
      confidence: num(a["confidence"], 1),
      probabilities: Object.fromEntries(
        LABELS.map((l) => [l, num(p[l], 1)]).filter(([, v]) => v !== undefined),
      ),
    },
    route: {
      destination: short(rt["destination"]),
      service_line: short(rt["service_line"]),
      priority: short(rt["priority"]),
      sla_seconds: num(rt["sla_seconds"]),
      escalation_after_seconds: num(rt["escalation_after_seconds"]),
      fallback: short(rt["fallback"]),
    },
    reason_codes: codes(r["reason_codes"]),
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
