/* Server-side audit writer. Never throws into the caller: a failed audit write
   must not suppress or delay a clinical action. */
import { sanitizeAuditEvent, type AuditEvent } from "./audit";

export async function recordAudit(actorId: string | null, event: AuditEvent): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_log").insert({
      actor_id: actorId,
      ...sanitizeAuditEvent(event),
    });
  } catch {
    // Status only — the payload is never logged.
    console.error("[audit] write failed");
  }
}
