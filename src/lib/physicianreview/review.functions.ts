/* Physician Review RPC surface. Every handler re-verifies the caller's role
   server-side through the same has_role path the rest of the lab uses, and all
   reads and writes go through guarded database routines so a physician can
   never reach another physician's answer — not even by calling the API
   directly. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { throttle, type AuthedContext } from "@/lib/modellab/guards";
import {
  MODES,
  OUTCOME_STATES,
  draftSchema,
  importRowSchema,
  submissionProblem,
  toJsonl,
  type ExportRow,
  type Overview,
} from "./review";

const BUDGET = { limit: 90, windowSeconds: 60, lockSeconds: 60 };
const IMPORT_BUDGET = { limit: 5, windowSeconds: 600, lockSeconds: 600 };

const role = async (ctx: AuthedContext, r: "admin" | "clinical_reviewer") =>
  (await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: r })).data === true;

async function assertCoordinator(ctx: AuthedContext) {
  if (!(await role(ctx, "admin"))) throw new Error("Forbidden");
}
async function assertPhysician(ctx: AuthedContext) {
  if ((await role(ctx, "clinical_reviewer")) || (await role(ctx, "admin"))) return;
  throw new Error("Forbidden");
}

/** Which surfaces the signed-in user may open. Used to render, never to
    authorize: every other handler checks again. */
export const getReviewAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [isCoordinator, isReviewer] = [
      await role(context, "admin"),
      await role(context, "clinical_reviewer"),
    ];
    return { isCoordinator, isPhysician: isCoordinator || isReviewer };
  });

/* ── Physician ───────────────────────────────────────────────────────────── */

export const listMyQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ include_done: z.boolean().default(false) })
      .strict()
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertPhysician(context);
    await throttle(context.userId, "pr:queue", BUDGET);
    const { data: rows, error } = await context.supabase.rpc("pr_my_queue", {
      _include_done: data.include_done,
    });
    if (error) throw new Error("Your review list is unavailable right now.");
    return rows ?? [];
  });

/** Saves a draft or records a submission. The server repeats every rule the
    screen applies, and the database serializes concurrent submissions on the
    same case; a duplicate submission is accepted and changes nothing. */
export const saveReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => draftSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertPhysician(context);
    await throttle(context.userId, "pr:save", BUDGET);
    if (data.submit) {
      const problem = submissionProblem(data);
      if (problem) throw new Error(problem);
    }
    const { data: row, error } = await context.supabase.rpc("pr_save_review", {
      _item_id: data.item_id,
      _status: data.submit ? "submitted" : "draft",
      _acuity: data.acuity,
      _needs_info: data.needs_info,
      _rationale: data.rationale,
      _routes: data.routes,
      _no_specialty: data.no_specialty_needed,
    });
    if (error) throw new Error(error.message.includes("not assigned") ? "Forbidden" : "Not saved.");
    const saved = row as { status?: string } | null;
    return { status: saved?.status ?? "draft" };
  });

/* ── Coordinator ─────────────────────────────────────────────────────────── */

export const getOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCoordinator(context);
    const { data, error } = await context.supabase.rpc("pr_overview");
    if (error) throw new Error("Progress is unavailable right now.");
    return data as unknown as Overview;
  });

export const listItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        batch_id: z.string().uuid().optional(),
        state: z.enum(OUTCOME_STATES).optional(),
        limit: z.number().int().min(1).max(1000).default(200),
      })
      .strict()
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertCoordinator(context);
    const { data: rows, error } = await context.supabase.rpc("pr_list_items", {
      ...(data.batch_id ? { _batch: data.batch_id } : {}),
      ...(data.state ? { _state: data.state } : {}),
      _limit: data.limit,
    });
    if (error) throw new Error("Items are unavailable right now.");
    return rows ?? [];
  });

export const listBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCoordinator(context);
    const [{ data: batches }, { data: approvals }] = await Promise.all([
      context.supabase
        .from("pr_batches")
        .select("id, name, mode, facility_id, created_at")
        .order("created_at", { ascending: false }),
      context.supabase
        .from("pr_export_approvals")
        .select("batch_id, clinical_approved, privacy_reviewed, training_use_approved"),
    ]);
    const byBatch = new Map((approvals ?? []).map((a) => [a.batch_id, a]));
    return (batches ?? []).map((b) => ({ ...b, approval: byBatch.get(b.id) ?? null }));
  });

/** Physicians who may be assigned. Only confirmed existing accounts that
    already hold the clinical reviewer role are ever offered. */
export const listPhysicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCoordinator(context);
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["clinical_reviewer"]);
    if (error) throw new Error("Reviewer list unavailable.");
    const ids = [...new Set((data ?? []).map((r) => r.user_id))];
    if (!ids.length) return [];
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, name, home_facility")
      .in("id", ids);
    return ids.map((id) => {
      const p = (profiles ?? []).find((x) => x.id === id);
      return { id, name: p?.name ?? "Clinical reviewer", facility: p?.home_facility ?? null };
    });
  });

export const importBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        mode: z.enum(MODES),
        facility_id: z
          .string()
          .regex(/^[a-z0-9_-]{1,60}$/i)
          .nullable()
          .default(null),
        rows: z.array(importRowSchema).min(1).max(2000),
      })
      .strict()
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCoordinator(context);
    await throttle(context.userId, "pr:import", IMPORT_BUDGET);
    const { data: batchId, error } = await context.supabase.rpc("pr_import_batch", {
      _name: data.name,
      _facility: data.facility_id,
      _mode: data.mode,
      _items: data.rows,
    });
    if (error) throw new Error("Import was refused.");
    return { batch_id: batchId as string, imported: data.rows.length };
  });

export const assignPair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        item_ids: z.array(z.string().uuid()).min(1).max(500),
        reviewer_a: z.string().uuid(),
        reviewer_b: z.string().uuid(),
      })
      .strict()
      .refine((v) => v.reviewer_a !== v.reviewer_b, {
        message: "Assign two different physicians.",
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCoordinator(context);
    const { data: n, error } = await context.supabase.rpc("pr_assign_reviewers", {
      _item_ids: data.item_ids,
      _a: data.reviewer_a,
      _b: data.reviewer_b,
    });
    if (error) throw new Error(error.message);
    return { assigned: (n as number) ?? 0 };
  });

export const assignAdjudicator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ item_id: z.string().uuid(), reviewer_id: z.string().uuid() }).strict().parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCoordinator(context);
    const { error } = await context.supabase.rpc("pr_assign_adjudicator", {
      _item_id: data.item_id,
      _who: data.reviewer_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** The three approvals are recorded exactly as the coordinator attests them;
    nothing is defaulted to true. */
export const setExportApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        batch_id: z.string().uuid(),
        clinical_approved: z.boolean(),
        privacy_reviewed: z.boolean(),
        training_use_approved: z.boolean(),
      })
      .strict()
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCoordinator(context);
    const { error } = await context.supabase.rpc("pr_set_export_approval", {
      _batch: data.batch_id,
      _clinical: data.clinical_approved,
      _privacy: data.privacy_reviewed,
      _training: data.training_use_approved,
    });
    if (error) throw new Error("Approvals were not saved.");
    return { ok: true };
  });

/** Approved, resolved, clinical rows only. Practice data can never reach this
    path, and nothing here retrains or promotes a model. */
export const exportBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ batch_id: z.string().uuid() }).strict().parse(i))
  .handler(async ({ data, context }) => {
    await assertCoordinator(context);
    await throttle(context.userId, "pr:export", IMPORT_BUDGET);
    const { data: rows, error } = await context.supabase.rpc("pr_export_batch", {
      _batch: data.batch_id,
    });
    if (error) throw new Error(error.message);
    return toJsonl((rows ?? []) as ExportRow[]);
  });
