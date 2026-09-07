/* Strict input schemas for the Model Lab RPCs: fields outside the deployed
   Acuity API contract are rejected at the server boundary, never forwarded.
   Every free-text field is either a closed vocabulary or a bounded slug, so
   arbitrary prose cannot reach the model runtime through a side field. */
import { z } from "zod";
import {
  CARE_SETTINGS,
  LABELS,
  QUALITY_LEVELS,
  REVIEWER_ROLES,
  ROUTES,
  SENDER_ROLES,
  SPLITS,
  USE_CASES,
} from "./training";

const slug = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.:-]+$/);

/* Short slug for context hints: long enough for "cardiology", too short and
   too narrow to smuggle a sentence. */
const hint = z
  .string()
  .min(1)
  .max(48)
  .regex(/^[A-Za-z0-9_-]+$/);

/* The runtime rejects decision bodies over 65,536 bytes; 4,000 characters of
   message text keeps the whole request an order of magnitude below that. */
export const MAX_DECISION_TEXT = 4000;

export const decisionSchema = z
  .object({
    message_id: slug,
    text: z.string().min(1).max(MAX_DECISION_TEXT),
    use_case: z.enum(USE_CASES),
    care_setting: z.enum(CARE_SETTINGS).optional(),
    sender_role: z.enum(SENDER_ROLES).optional(),
    specialty_hint: hint.optional(),
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
    reviewer_role: z.enum(REVIEWER_ROLES).optional(),
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

/* The runtime hard-caps a training-intake body at 5,500,000 bytes and answers
   413 above it. The server refuses oversized batches before any upstream call,
   with headroom for the JSON envelope. */
export const MAX_INTAKE_BYTES = 5_000_000;
export const MAX_INTAKE_EXAMPLES = 1200;

export const intakeSchema = z
  .object({
    examples: z
      .array(
        z
          .object({
            record_id: slug,
            text: z.string().min(1).max(4000),
            acuity: z.enum(LABELS),
            use_case: z.enum(USE_CASES),
            routes: z.array(z.enum(ROUTES)).max(ROUTES.length),
            label_quality: z.enum(QUALITY_LEVELS),
            sample_weight: z.number().gt(0).max(100),
            include_in_training: z.literal(true),
            group_id: slug,
            split: z.enum(SPLITS),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_INTAKE_EXAMPLES),
  })
  .strict();

/** Serialized size of the exact body that would be forwarded upstream. */
export const payloadBytes = (body: unknown): number =>
  new TextEncoder().encode(JSON.stringify(body)).length;

export const intakeTooLarge = (body: unknown): boolean => payloadBytes(body) > MAX_INTAKE_BYTES;
