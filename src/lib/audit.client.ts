/* Browser-side audit writer. Metadata only, best-effort: an audit failure must
   never block or delay a clinical action. */
import { supabase } from "@/integrations/supabase/client";
import { sanitizeAuditEvent, type AuditEvent } from "./audit";

export async function logAudit(actorId: string | null, event: AuditEvent): Promise<void> {
  if (!actorId) return;
  try {
    await supabase.from("audit_log").insert({ actor_id: actorId, ...sanitizeAuditEvent(event) });
  } catch {
    /* swallow — never surfaced to the clinician */
  }
}
