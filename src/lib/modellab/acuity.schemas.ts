/* Strict input schemas for the Model Lab RPCs: fields outside the canonical
   Acuity API contract are rejected at the server boundary, never forwarded. */
import { z } from "zod";
import { LABELS, ROUTES, SPLITS, USE_CASES } from "./training";
import { CHANNELS, SENDERS, SETTINGS } from "./contract";

export const decisionSchema = z
  .object({
    text: z.string().min(1).max(4000),
    channel: z.enum(CHANNELS),
    sender_role: z.enum(SENDERS),
    care_setting: z.enum(SETTINGS),
    use_case: z.enum(USE_CASES),
    specialty_hint: z.string().max(64).optional(),
    legacy_score_band: z.number().int().min(1).max(5).optional(),
  })
  .strict();

export const feedbackSchema = z
  .object({
    decision_id: z.string().min(1).max(128),
    acuity: z.enum(LABELS),
    routes: z.array(z.enum(ROUTES)).max(ROUTES.length),
  })
  .strict();

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
            label_quality: z.enum(["high", "medium", "low"]),
            sample_weight: z.number().min(0).max(10),
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
