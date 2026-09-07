/* Shared server-side guards for the Model Lab and the Clinical Review console.
   Client-safe module: the server-only limiter is loaded inside the function,
   never at module scope. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface AuthedContext {
  userId: string;
  supabase: SupabaseClient<Database>;
}

type Role = Database["public"]["Enums"]["app_role"];

const hasRole = async (ctx: AuthedContext, role: Role) => {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: role,
  });
  return !error && data === true;
};

/* Model Lab is an engineering surface: every handler re-verifies the admin
   role server-side. Hiding the tab is not access control. */
export async function assertAdmin(ctx: AuthedContext) {
  if (!(await hasRole(ctx, "admin"))) throw new Error("Forbidden");
}

/* Reviewing is a clinical judgement, so it is not limited to administrators —
   but it is still refused by the server, not merely by the UI. */
export async function assertReviewer(ctx: AuthedContext) {
  if ((await hasRole(ctx, "clinical_reviewer")) || (await hasRole(ctx, "admin"))) return;
  throw new Error("Forbidden");
}

export interface Budget {
  limit: number;
  windowSeconds: number;
  lockSeconds: number;
}

const THROTTLED = "Too many requests right now. Try again shortly.";

/* Fails closed: an unavailable or erroring limiter blocks the call, and the
   message never reveals the budget, the window or the attempts remaining. */
export async function throttle(userId: string, scope: string, budget: Budget) {
  const { consume } = await import("@/lib/security/ratelimit.server");
  let allowed = false;
  try {
    allowed = await consume(scope, userId, budget);
  } catch {
    allowed = false;
  }
  if (!allowed) throw new Error(THROTTLED);
}
