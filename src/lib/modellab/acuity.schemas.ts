/* Strict input schemas for the Model Lab RPCs: fields outside the deployed
   Acuity API contract are rejected at the server boundary, never forwarded. */
import { z } from "zod";
import { LABELS, QUALITY_LEVELS, ROUTES, SPLITS, USE_CASES } from "./training";

const slug = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.:-]+$/);

export const decisionSchema = z
  .object({
    message_id: slug,
    text: z.string().min(1).max(4000),
    use_case: z.enum(USE_CASES),
    care_setting: z.string().max(64).optional(),
    sender_role: z.string().max(64).optional(),
    specialty_hint: z.string().max(64).optional(),
  })
  .strict();

export const feedbackSchema = z
  .object({
    decision_id: z.string().uuid(),
    corrected_acuity: z.enum(LABELS).optional(),
    route_accepted: z.boolean().optional(),
    outcome_code: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Z0-9_]+$/)
      .optional(),
    reviewer_role: z.string().max(64).optional(),
    observed_at: z.string().datetime().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.corrected_acuity !== undefined ||
      v.route_accepted !== undefined ||
      v.outcome_code !== undefined,
    { message: "One of corrected_acuity, route_accepted or outcome_code is required." },
  );

export const intakeSchema = z
  .object({
    examples: z
      .array(
        z
          .object({
            record_id: z.string().min(1).max(128),
            text: z.string().min(1).max(4000),
            acuity: z.enum(LABELS),
            use_case: z.enum(USE_CASES),
            routes: z.array(z.enum(ROUTES)).max(ROUTES.length),
            label_quality: z.enum(QUALITY_LEVELS),
            sample_weight: z.number().gt(0).max(100),
            include_in_training: z.literal(true),
            group_id: z.string().min(1).max(128),
            split: z.enum(SPLITS),
          })
          .strict(),
      )
      .min(1)
      .max(5000),
  })
  .strict();
