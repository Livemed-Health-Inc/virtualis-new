/* Audit trail contract. Metadata only — by construction this module has no
   field that can carry message text, patient name, MRN, DOB, email, token or
   model input, and the database repeats the same restriction as CHECK
   constraints on `action` and `entity_type`. */

export type AuditAction =
  | "sign_in"
  | "sign_out"
  | "password_complete"
  | "thread_open"
  | "thread_create"
  | "message_send"
  | "encounter_request"
  | "encounter_accept"
  | "encounter_decline"
  | "encounter_end"
  | "encounter_cancel"
  | "device_pair"
  | "device_sync_denied"
  | "admin_invite"
  | "admin_invite_revoke"
  | "admin_facility_create"
  | "admin_device_register"
  | "admin_device_enrollment"
  | "admin_device_status"
  | "modellab_decision"
  | "modellab_feedback"
  | "modellab_stage";

export type AuditEntity =
  | "thread"
  | "message"
  | "encounter_request"
  | "device"
  | "device_enrollment"
  | "invite"
  | "facility"
  | "profile"
  | "model"
  | "session";

export interface AuditEvent {
  action: AuditAction;
  entity_type: AuditEntity;
  /** Identifier only. Never a name, MRN, email or free-text label. */
  entity_id?: string | null;
  facility_id?: string | null;
  correlation_id?: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORRELATION = /^[A-Za-z0-9_-]{1,64}$/;

/** Drops anything that is not a bare identifier, so a caller mistake can never
    turn into free text (or PHI) landing in the trail. */
export function sanitizeAuditEvent(e: AuditEvent): AuditEvent {
  return {
    action: e.action,
    entity_type: e.entity_type,
    entity_id: e.entity_id && UUID.test(e.entity_id) ? e.entity_id : null,
    facility_id:
      e.facility_id && /^[a-z0-9_-]{1,60}$/i.test(e.facility_id) ? e.facility_id : null,
    correlation_id:
      e.correlation_id && CORRELATION.test(e.correlation_id) ? e.correlation_id : null,
  };
}
