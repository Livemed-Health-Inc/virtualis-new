import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* Invite-only access control. Every handler re-verifies the caller is an
   admin against RLS-scoped queries before touching privileged APIs. */

async function assertAdmin(context: any) {
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
    return { ok: true as const };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("invites")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });
