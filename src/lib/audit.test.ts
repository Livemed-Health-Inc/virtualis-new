import { describe, expect, it } from "vitest";
import { sanitizeAuditEvent } from "./audit";

const UUID = "11111111-2222-3333-4444-555555555555";

describe("sanitizeAuditEvent", () => {
  it("keeps bare identifiers", () => {
    expect(
      sanitizeAuditEvent({
        action: "thread_open",
        entity_type: "thread",
        entity_id: UUID,
        facility_id: "saint",
        correlation_id: "req_01",
      }),
    ).toEqual({
      action: "thread_open",
      entity_type: "thread",
      entity_id: UUID,
      facility_id: "saint",
      correlation_id: "req_01",
    });
  });

  it("drops anything that is not an identifier, so PHI cannot land in the trail", () => {
    const out = sanitizeAuditEvent({
      action: "message_send",
      entity_type: "message",
      entity_id: "Jane Doe MRN 88213",
      facility_id: "chest pain, room 412",
      correlation_id: "not a token!!",
    });
    expect(out.entity_id).toBeNull();
    expect(out.facility_id).toBeNull();
    expect(out.correlation_id).toBeNull();
  });

  it("normalises missing optional fields to null", () => {
    expect(sanitizeAuditEvent({ action: "sign_in", entity_type: "session" })).toEqual({
      action: "sign_in",
      entity_type: "session",
      entity_id: null,
      facility_id: null,
      correlation_id: null,
    });
  });
});
