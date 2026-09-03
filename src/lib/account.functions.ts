/* Password-setup completion. The flag lives in the database, so a refresh,
   a direct RPC call or a hand-rolled request cannot skip setup: PHI policies
   deny every clinical table while `must_change_password` is true. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkPassword } from "./password";

/** Cheap, honest read of the caller's own setup state. */
export const getSetupState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", context.userId)
      .maybeSingle();
    return { mustChangePassword: data?.must_change_password ?? false };
  });

export const completePasswordSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const check = checkPassword(data.password);
    if (!check.ok) return { ok: false as const, reason: check.reason };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.password,
    });
    // Status only: the provider message can echo the candidate.
    if (error) return { ok: false as const, reason: "rejected" as const };

    // The flag clears only after the password actually changed.
    const { error: flagError } = await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", context.userId);
    if (flagError) return { ok: false as const, reason: "rejected" as const };

    const { recordAudit } = await import("./audit.server");
    await recordAudit(context.userId, { action: "password_complete", entity_type: "profile" });
    return { ok: true as const };
  });
