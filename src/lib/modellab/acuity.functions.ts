/* Model Lab RPC surface. Every call is authenticated with the clinician's
   Supabase session and re-verified as admin; only that session token is
   forwarded to the runtime, and every reply is projected onto the fixed
   contract in ./contract.ts before it reaches the browser. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectIdentifiers } from "./training";
import { projectDecision, projectInfo, projectIntake, type RuntimeInfo } from "./contract";
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

const contextSchema = z.object({
  text: z.string().min(1).max(4000),
  care_setting: z.enum(["ed", "inpatient", "clinic", "telehealth", "home"]),
  sender_role: z.enum(["patient", "nurse", "provider", "device"]),
  use_case: z.enum(["triage", "routing", "escalation", "quality_review"]),
  specialty_hint: z.string().max(64).optional(),
});

const feedbackSchema = z.object({
  decision_id: z.string().min(1).max(128),
  agrees: z.boolean(),
  corrected_label: z.enum(["low", "medium", "high"]).optional(),
  note: z.string().max(1000).optional(),
});

const intakeSchema = z.object({
  batch_label: z.string().min(1).max(120),
  provenance: z.literal("synthetic_or_approved_deidentified"),
  examples: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1).max(4000),
        label: z.enum(["low", "medium", "high"]),
        route_label: z.enum(["self_serve", "nurse_line", "provider", "escalate"]).nullable(),
        group_id: z.string().min(1),
        split: z.enum(["train", "validation", "test"]),
        quality: z.enum(["unrated", "good", "needs_work"]),
      }),
    )
    .min(1)
    .max(5000),
});

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
  .inputValidator((input: unknown) => contextSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    /* Synthetic/deidentified only — the server refuses anything that looks
       like a real identifier before it can reach the runtime. */
    if (detectIdentifiers(data.text).length)
      throw new Error("Rejected: input contains a possible identifier. Synthetic text only.");
    const { callAcuity } = await import("./acuity.server");
    return projectDecision(
      await callAcuity("/v1/decisions", { method: "POST", body: data }),
      data.text,
    );
  });

export const sendFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.note && detectIdentifiers(data.note).length)
      throw new Error("Rejected: note contains a possible identifier.");
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
    return projectIntake(
      await callAcuity("/v1/training-intake", {
        method: "POST",
        body: { ...data, promote: false },
      }),
    );
  });
