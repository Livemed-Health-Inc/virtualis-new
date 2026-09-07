/* Clinical Review console RPCs. Every handler re-verifies the reviewer role
   server-side through the same has_role path the Model Lab uses; the queue and
   the verdict ladder run inside guarded database routines, so one reviewer can
   never see another's verdict before recording their own. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertReviewer, throttle } from "./guards";
import {
  exportAdjudicated,
  queueFilterSchema,
  redactUnresolved,
  verdictSchema,
  type ReviewCase,
  type ReviewStats,
} from "./review";
import { feedbackSchema } from "./acuity.schemas";
import { screenOutbound } from "./training";

const CASE_FIELDS =
  "id, decision_id, use_case, message_text, predicted_acuity, confidence, probabilities, reason_codes, route_destination, policy_version, model_version, care_setting, sender_role, state, final_acuity, label_quality, created_at";

const asCase = (row: unknown) => row as ReviewCase;

/** Whether the signed-in user may open the console at all. The UI uses this to
    render, never to authorize: every other handler checks again. */
export const getReviewAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = async (r: "admin" | "clinical_reviewer") =>
      (await context.supabase.rpc("has_role", { _user_id: context.userId, _role: r })).data ===
      true;
    const [isAdmin, isReviewer] = [await role("admin"), await role("clinical_reviewer")];
    return { allowed: isAdmin || isReviewer, isAdmin };
  });

/** Cases this reviewer has not yet judged, most uncertain first. */
export const listReviewQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => queueFilterSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertReviewer(context);
    await throttle(context.userId, "review:queue", {
      limit: 60,
      windowSeconds: 60,
      lockSeconds: 60,
    });
    const { data: rows, error } = await context.supabase.rpc("review_queue", {
      ...(data.predicted ? { _predicted: data.predicted } : {}),
      ...(data.use_case ? { _use_case: data.use_case } : {}),
      ...(data.state ? { _state: data.state } : {}),
      _limit: data.limit ?? 50,
    });
    if (error) throw new Error("Review queue unavailable");
    return (rows ?? []).map(asCase);
  });

export const getReviewStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertReviewer(context);
    const { data, error } = await context.supabase.rpc("review_stats");
    if (error) throw new Error("Review statistics unavailable");
    return data as unknown as ReviewStats;
  });

/** Records the verdict locally first, so evaluation data survives regardless
    of the runtime, then forwards it on the existing feedback contract. A
    runtime failure never discards or delays the clinical verdict. */
export const submitVerdict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => verdictSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertReviewer(context);
    await throttle(context.userId, "review:verdict", {
      limit: 120,
      windowSeconds: 60,
      lockSeconds: 60,
    });

    const { data: row, error } = await context.supabase.rpc("submit_review_verdict", {
      _case_id: data.case_id,
      _acuity: data.acuity,
      _route_accepted: data.route_accepted,
      _outcome_code: data.outcome_code,
    });
    if (error || !row) throw new Error("Verdict was not recorded");
    const updated = asCase(Array.isArray(row) ? row[0] : row);

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit(context.userId, { action: "review_verdict", entity_type: "review_case" });

    /* Same body the Model Lab already sends, so the runtime sees one contract. */
    const body = feedbackSchema.parse({
      decision_id: updated.decision_id,
      corrected_acuity: data.acuity,
      route_accepted: data.route_accepted,
      outcome_code: data.outcome_code,
      reviewer_role: "physician",
    });
    let forwarded = false;
    try {
      if (!screenOutbound(body).length) {
        const { callAcuity, isConfigured } = await import("./acuity.server");
        if (isConfigured()) {
          const r = (await callAcuity("/v1/feedback", { method: "POST", body })) as {
            accepted?: unknown;
          };
          forwarded = r?.accepted === true;
        }
      }
    } catch {
      forwarded = false; // Stored locally either way.
    }
    return { case: updated, forwarded };
  });

/** Adjudicated labels only, in the existing JSONL intake shape, screened for
    identifiers on the way out. */
export const exportAdjudicatedLabels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertReviewer(context);
    await throttle(context.userId, "review:export", {
      limit: 5,
      windowSeconds: 300,
      lockSeconds: 300,
    });
    const { data, error } = await context.supabase
      .from("review_cases")
      .select(CASE_FIELDS)
      .eq("label_quality", "adjudicated")
      .order("created_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error("Export unavailable");
    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit(context.userId, { action: "review_export", entity_type: "review_case" });
    return exportAdjudicated((data ?? []).map(asCase));
  });
