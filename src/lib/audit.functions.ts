/* The only way a browser can add to the audit trail. The actor is taken from
   the verified session — never from the request body — and the row is written
   with trusted server credentials, so a client cannot forge, amend or attribute
   an event to somebody else. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeAuditEvent, type AuditEvent } from "./audit";


const event = z.object({
  action: z.string().min(1).max(64),
  entity_type: z.string().min(1).max(64),
  entity_id: z.string().max(64).nullish(),
  facility_id: z.string().max(64).nullish(),
  correlation_id: z.string().max(64).nullish(),
});

export const recordAuditEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => event.parse(d))
  .handler(async ({ data, context }) => {
    const { recordAudit } = await import("./audit.server");
    await recordAudit(context.userId, data as AuditEvent);
    return { ok: true as const };
  });
