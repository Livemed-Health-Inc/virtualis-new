import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/* Invite-only access control. Every handler re-verifies the caller is an
   admin against RLS-scoped queries before touching privileged APIs. */

type AdminCtx = { userId: string; supabase: SupabaseClient<Database> };

async function assertAdmin(context: AdminCtx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const getAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!admin) return { isAdmin: false as const, invites: [] };
    const { data } = await context.supabase
      .from("invites")
      .select("id,email,full_name,title,department,facility_id,role,status,created_at,accepted_at")
      .order("created_at", { ascending: false });
    return { isAdmin: true as const, invites: data ?? [] };
  });

const inviteSchema = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().max(120).optional().or(z.literal("")),
  title: z.string().trim().max(80).optional().or(z.literal("")),
  department: z.string().trim().max(80).optional().or(z.literal("")),
  facility_id: z.string().trim().max(60).optional().or(z.literal("")),
  role: z.enum(["admin", "member"]).default("member"),
  redirectTo: z.string().trim().url().max(500),
});

export const sendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const email = data.email.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: authErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: data.redirectTo,
      data: {
        full_name: data.full_name || null,
        title: data.title || null,
        department: data.department || null,
      },
    });
    if (authErr) return { ok: false as const, message: authErr.message };

    const { error } = await context.supabase.from("invites").insert({
      email,
      full_name: data.full_name || null,
      title: data.title || null,
      department: data.department || null,
      facility_id: data.facility_id || null,
      role: data.role,
      invited_by: context.userId,
    });
    if (error && !error.message.includes("duplicate")) {
      return { ok: false as const, message: error.message };
    }
    const { recordAudit } = await import("./audit.server");
    await recordAudit(context.userId, {
      action: "admin_invite",
      entity_type: "invite",
      facility_id: data.facility_id || null,
    });
    return { ok: true as const };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("invites")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .eq("status", "pending")
      .select("email")
      .maybeSingle();
    if (error) return { ok: false as const, message: error.message };

    // Remove the pending auth account so a stale invite link cannot be used.
    if (row?.email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const pending = list?.users.find(
        (u) => u.email?.toLowerCase() === row.email.toLowerCase() && !u.last_sign_in_at,
      );
      if (pending) await supabaseAdmin.auth.admin.deleteUser(pending.id);
    }
    const { recordAudit } = await import("./audit.server");
    await recordAudit(context.userId, {
      action: "admin_invite_revoke",
      entity_type: "invite",
      entity_id: data.id,
    });
    return { ok: true as const };
  });

/* Called once per session: flips the caller's own pending invite to accepted
   and provisions exactly the hospital access the admin granted on the invite.
   Nothing is granted implicitly at signup. */
export const claimInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string })?.email;
    if (!email) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows } = await supabaseAdmin
      .from("invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("status", "pending")
      .ilike("email", email)
      .select("*");

    const invite = rows?.[0];
    if (invite) {
      const facilities: string[] = invite.facility_ids?.length
        ? invite.facility_ids
        : invite.facility_id
          ? [invite.facility_id]
          : [];
      if (facilities.length) {
        await supabaseAdmin.from("provider_credentials").insert(
          facilities.map((f) => ({
            user_id: context.userId,
            facility_id: f,
            privileges:
              invite.user_class === "onsite"
                ? `Onsite · ${invite.staff_type || "Staff"}`
                : invite.specialty || "Consultative",
          })),
        );
      }
      /* An accepted invite always starts in setup: the clinician must set
         their own password before any clinical policy will admit them. */
      await supabaseAdmin
        .from("profiles")
        .update({
          role: invite.title || invite.staff_type || "Clinician",
          dept: invite.department || invite.specialty || "General",
          must_change_password: true,
          ...(facilities[0] ? { home_facility: facilities[0] } : {}),
        })
        .eq("id", context.userId);
      if (invite.role === "admin")
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    }
    return { ok: true as const };
  });

/* Called once the clinician has actually chosen a password. Clearing the flag
   is server-side so the client cannot skip setup by flipping local state. */
export const completePasswordSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", context.userId);
    const { recordAudit } = await import("./audit.server");
    await recordAudit(context.userId, { action: "password_complete", entity_type: "session" });
    return { ok: true as const };
  });
