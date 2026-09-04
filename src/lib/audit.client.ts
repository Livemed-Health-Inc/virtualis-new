/* Browser-side audit writer. Metadata only, best-effort: an audit failure must
   never block or delay a clinical action. The write itself happens on the
   server — clients have no insert rights on the trail. */
import { sanitizeAuditEvent, type AuditEvent } from "./audit";
import { recordAuditEvent } from "./audit.functions";

export async function logAudit(actorId: string | null, event: AuditEvent): Promise<void> {
  if (!actorId) return; // signed-out callers have nothing to attribute
  try {
    await recordAuditEvent({ data: sanitizeAuditEvent(event) });
  } catch {
    /* swallow — never surfaced to the clinician */
  }
}
