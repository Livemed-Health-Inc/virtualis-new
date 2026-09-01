/* Model Lab RPC surface. Every call is authenticated with the clinician's
   Supabase session; the runtime credentials stay in the server context. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .handler(async () => {
    const { callAcuity } = await import("./acuity.server");
    if (!process.env["ACUITY_API_URL"]) return { configured: false as const };
    return { configured: true as const, info: await callAcuity("/v1/info", { method: "GET" }) };
  });

export const runDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => contextSchema.parse(input))
  .handler(async ({ data }) => {
    const { callAcuity } = await import("./acuity.server");
    return await callAcuity("/v1/decisions", { method: "POST", body: data });
  });

export const sendFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data }) => {
    const { callAcuity } = await import("./acuity.server");
    return await callAcuity("/v1/feedback", { method: "POST", body: data });
  });

/* Staging only. The runtime stores the batch; it never retrains or promotes
   a model from this endpoint. */
export const stageTrainingBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => intakeSchema.parse(input))
  .handler(async ({ data }) => {
    const { callAcuity } = await import("./acuity.server");
    return await callAcuity<{
      accepted: boolean;
      batch_id: string;
      object_key: string;
      example_count: number;
      sha256: string;
      state: string;
    }>("/v1/training-intake", { method: "POST", body: { ...data, promote: false } });
  });
