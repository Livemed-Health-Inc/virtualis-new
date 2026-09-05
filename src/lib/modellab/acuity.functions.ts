/* Model Lab RPC surface. Every call is authenticated with the clinician's
   Supabase session and re-verified as admin; only that session token is
   forwarded to the runtime, and every reply is projected onto the fixed
   contract in ./contract.ts before it reaches the browser. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectIdentifiers } from "./training";
import { decisionSchema, feedbackSchema, intakeSchema } from "./acuity.schemas";
import {
  projectDecision,
  projectInfo,
  projectIntake,
  toDecisionRequest,
  type RuntimeInfo,
} from "./contract";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/* Model Lab is an engineering surface, not a clinical one: every handler
   re-verifies the admin role server-side. Hiding the tab is not access
   control. */
async function assertAdmin(context: { userId: string; supabase: SupabaseClient<Database> }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const getModelInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
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
    /* Synthetic/deidentified only — the server refuses anything that looks
       like a real identifier before it can reach the runtime. */
    if (detectIdentifiers(data.text).length)
      throw new Error("Rejected: input contains a possible identifier. Synthetic text only.");
    const { callAcuity } = await import("./acuity.server");
    return projectDecision(
      await callAcuity("/v1/decisions", { method: "POST", body: toDecisionRequest(data) }),
      data.text,
    );
  });

/* Reviewer verdict on a decision: structured labels only, no free text. */
export const sendFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
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
    /* The browser already screens for identifiers, but the server repeats the
       scan and refuses the whole batch: a client check is not a safeguard. */
    const flagged = data.examples.filter((e) => detectIdentifiers(e.text).length > 0);
    if (flagged.length)
      throw new Error(
        `Rejected: ${flagged.length} example(s) contain possible identifiers. Only synthetic or approved deidentified text may be staged.`,
      );
    const { callAcuity } = await import("./acuity.server");
    return projectIntake(await callAcuity("/v1/training-intake", { method: "POST", body: data }));
  });
