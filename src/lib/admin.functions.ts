import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/* Admin console server API. Every handler re-verifies the caller holds the
   admin role through their own RLS-scoped session before doing privileged
   work — the client is never trusted about who it is. */

type AdminCtx = { userId: string; supabase: SupabaseClient<Database> };

async function assertAdmin(context: AdminCtx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const sha256 = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const raw = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!admin)
      return { isAdmin: false as const, facilities: [], invites: [], devices: [], people: [] };

    const [f, i, d, p, r, c] = await Promise.all([
      context.supabase.from("facilities").select("*").order("name"),
      context.supabase.from("invites").select("*").order("created_at", { ascending: false }),
      context.supabase.from("devices").select("*").order("created_at", { ascending: false }),
      context.supabase.from("profiles").select("id,name,role,dept,home_facility"),
      context.supabase.from("user_roles").select("user_id,role"),
      context.supabase.from("provider_credentials").select("user_id,facility_id"),
    ]);

    const people = (p.data ?? []).map((row) => ({
      ...row,
      admin: (r.data ?? []).some((x) => x.user_id === row.id && x.role === "admin"),
      facilities: (c.data ?? []).filter((x) => x.user_id === row.id).map((x) => x.facility_id),
    }));

    return {
      isAdmin: true as const,
      facilities: f.data ?? [],
      invites: i.data ?? [],
      devices: d.data ?? [],
      people,
    };
  });

export const createFacility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9-]{2,32}$/),
        name: z.string().trim().min(2).max(80),
        short: z.string().trim().min(2).max(6),
        emr: z.string().trim().max(40).default("Epic"),
        hue: z
          .string()
          .trim()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .default("#2E5CFF"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("facilities").insert(data);
    if (error) return { ok: false as const, message: error.message };
    const { recordAudit } = await import("./audit.server");
    await recordAudit(context.userId, {
      action: "admin_facility_create",
      entity_type: "facility",
      facility_id: data.id,
    });
    return { ok: true as const };
  });


/* Onsite staff are bound to exactly one hospital; virtual physicians may
   cover several. Both get explicit credential rows — nothing is implicit. */
export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        full_name: z.string().trim().max(120).default(""),
        title: z.string().trim().max(80).default(""),
        department: z.string().trim().max(80).default(""),
        specialty: z.string().trim().max(80).default(""),
        staff_type: z.string().trim().max(40).default("Physician"),
        user_class: z.enum(["virtual", "onsite"]),
        facility_ids: z.array(z.string().trim().max(60)).min(1).max(20),
        role: z.enum(["admin", "member"]).default("member"),
        redirectTo: z.string().trim().url().max(500),
      })
      .refine((v) => v.user_class === "virtual" || v.facility_ids.length === 1, {
        message: "Onsite staff must be bound to exactly one hospital",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: authErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
      data: {
        full_name: data.full_name || null,
        title: data.title || null,
        department: data.department || null,
      },
    });
    if (authErr) return { ok: false as const, message: authErr.message };

    const { error } = await context.supabase.from("invites").insert({
      email: data.email,
      full_name: data.full_name || null,
      title: data.title || null,
      department: data.department || null,
      specialty: data.specialty || null,
      staff_type: data.staff_type,
      user_class: data.user_class,
      facility_ids: data.facility_ids,
      facility_id: data.facility_ids[0] ?? null,
      role: data.role,
      invited_by: context.userId,
    });
    if (error && !error.message.includes("duplicate"))
      return { ok: false as const, message: error.message };
    const { recordAudit } = await import("./audit.server");
    await recordAudit(context.userId, {
      action: "admin_invite",
      entity_type: "invite",
      facility_id: data.facility_ids[0] ?? null,
    });
    return { ok: true as const };
  });


export const registerDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        facility_id: z.string().trim().min(1).max(60),
        label: z.string().trim().min(2).max(80),
        unit: z.string().trim().max(60).default(""),
        room: z.string().trim().max(20).default(""),
        floating: z.boolean().default(false),
        has_mintti: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("devices")
      .insert({ ...data, room: data.room || null, created_by: context.userId });
    return error ? { ok: false as const, message: error.message } : { ok: true as const };
  });

/* Mints a single-use enrollment code. The plaintext is returned exactly
   once — only its hash is stored, so a leaked table cannot enrol a kiosk. */
export const mintEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ device_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const code = makeCode();
    await context.supabase
      .from("device_enrollments")
      .update({ revoked_at: new Date().toISOString() })
      .eq("device_id", data.device_id)
      .is("consumed_at", null)
      .is("revoked_at", null);
    const { error } = await context.supabase.from("device_enrollments").insert({
      device_id: data.device_id,
      code_hash: await sha256(code),
      code_hint: code.slice(-2),
      created_by: context.userId,
    });
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, code };
  });

/* Revoking clears the kiosk token, so the tablet drops back to unprovisioned
   on its next sync — this is how a lost or retired cart is retired. */
export const setDeviceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ device_id: z.string().uuid(), status: z.enum(["registered", "revoked"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("devices")
      .update({ status: data.status, device_token_hash: null, enrolled_at: null })
      .eq("id", data.device_id);
    return error ? { ok: false as const, message: error.message } : { ok: true as const };
  });
