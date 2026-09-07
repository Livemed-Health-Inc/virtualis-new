/* Model Lab RPC surface. Every call is authenticated with the clinician's
   Supabase session and re-verified as admin; only that session token is
   forwarded to the runtime, and every reply is projected onto the fixed
   contract in ./contract.ts before it reaches the browser. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { screenOutbound } from "./training";
import { decisionSchema, feedbackSchema, intakeSchema, intakeTooLarge } from "./acuity.schemas";
import {
  projectDecision,
  projectInfo,
  projectIntake,
  toDecisionRequest,
  type RuntimeInfo,
  type Decision,
} from "./contract";
import { assertAdmin, throttle as consumeBudget, type AuthedContext } from "./guards";

/* Per-user budgets. Training intake stages a whole dataset, so it is far more
   expensive than a single decision and gets a much tighter allowance. */
const BUDGETS = {
  info: { limit: 30, windowSeconds: 60, lockSeconds: 60 },
  decision: { limit: 30, windowSeconds: 60, lockSeconds: 120 },
  feedback: { limit: 60, windowSeconds: 60, lockSeconds: 60 },
  intake: { limit: 3, windowSeconds: 600, lockSeconds: 600 },
} as const;

const throttle = (userId: string, scope: keyof typeof BUDGETS) =>
  consumeBudget(userId, `modellab:${scope}`, BUDGETS[scope]);

/* Synthetic/deidentified only. Every string in the outbound payload is
   scanned, not just the message text. */
function assertScreened(payload: unknown) {
  const flagged = screenOutbound(payload);
  if (flagged.length)
    throw new Error(
      `Rejected: ${flagged.length} field(s) contain a possible identifier. Synthetic text only.`,
    );
}

export const getModelInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    await throttle(context.userId, "info");
    const { callAcuity, isConfigured } = await import("./acuity.server");
    if (!isConfigured())
      return { configured: false as const, info: undefined as RuntimeInfo | undefined };
    return { configured: true as const, info: projectInfo(await callAcuity("/v1/info")) };
  });

export const runDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => decisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await throttle(context.userId, "decision");
    const body = toDecisionRequest(data);
    assertScreened(body);
    const { callAcuity } = await import("./acuity.server");
    const decision = projectDecision(
      await callAcuity("/v1/decisions", { method: "POST", body }),
      data.text,
    );
    await enqueueForReview(context, data, decision);
    return decision;
  });

/* Every Model Lab decision joins the clinical review queue so labels can be
   adjudicated later. The text is the synthetic input that was already screened
   above. A queue failure never breaks the decision the user asked for. */
async function enqueueForReview(
  context: AuthedContext,
  input: ReturnType<typeof decisionSchema.parse>,
  d: Decision,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("review_cases").upsert(
      {
        decision_id: d.decision_id,
        use_case: input.use_case,
        message_text: input.text,
        predicted_acuity: d.acuity.level,
        confidence: d.acuity.confidence ?? null,
        probabilities: d.acuity.probabilities,
        reason_codes: d.acuity.reason_codes,
        route_destination: d.route.destination ?? null,
        policy_version: d.route.policy_version ?? null,
        model_version: d.acuity.model_version,
        care_setting: input.care_setting ?? null,
        sender_role: input.sender_role ?? null,
        created_by: context.userId,
      },
      { onConflict: "decision_id", ignoreDuplicates: true },
    );
  } catch {
    /* Non-fatal by design. */
  }
}

/* Reviewer verdict on a decision: structured labels only, no free text. */
export const sendFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await throttle(context.userId, "feedback");
    assertScreened(data);
    const { callAcuity } = await import("./acuity.server");
    const r = (await callAcuity("/v1/feedback", { method: "POST", body: data })) as {
      accepted?: unknown;
    };
    return { accepted: r?.accepted === true };
  });

/* Staging only. The runtime stores the batch; it never retrains or promotes
   a model from this endpoint. */
export const stageTrainingBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => intakeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await throttle(context.userId, "intake");
    /* The browser already screens for identifiers, but the server repeats the
       scan and refuses the whole batch: a client check is not a safeguard. */
    assertScreened(data);
    /* Refused here rather than upstream, where an oversized body is a 413. */
    if (intakeTooLarge(data))
      throw new Error("Rejected: this batch is too large. Split it into smaller batches.");
    const { callAcuity } = await import("./acuity.server");
    return projectIntake(await callAcuity("/v1/training-intake", { method: "POST", body: data }));
  });
