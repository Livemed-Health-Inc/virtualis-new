import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consultScopeSchema, prepareRecommendation } from "./recommendation";

const developmentOnly = createMiddleware({ type: "function" }).server(async ({ next }) => {
  if (!import.meta.env.DEV) throw new Error("Development integration disabled");
  return next();
});

/* No inference, patient/message input, review enqueue, rate-limit writes, or
   consult/order writes. Authorization uses caller-scoped reads, never admin. */
export const getConsultRecommendation = createServerFn({ method: "POST" })
  .middleware([developmentOnly, requireSupabaseAuth])
  .inputValidator((input: unknown) => consultScopeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    return prepareRecommendation({
      userId,
      setupComplete: async () => {
        const r = await supabase.rpc("setup_complete", { _user_id: userId });
        return !r.error && r.data === true;
      },
      assignedFacilities: async () => {
        const r = await supabase.from("provider_credentials").select("facility_id")
          .eq("user_id", userId);
        if (r.error) throw new Error("Forbidden");
        return (r.data ?? []).map((c) => c.facility_id);
      },
      hasFacilityAccess: async (facility) => {
        const r = await supabase.rpc("has_facility_access", { _user_id: userId, _facility: facility });
        return !r.error && r.data === true;
      },
    }, data.facility);
  });