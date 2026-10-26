export const SYNTHETIC_PATIENT = Object.freeze({
  id: "synthetic-note-patient", name: "Synthetic Patient", room: "Demo",
  mrn: "", dob: "", diagnosis: "Synthetic workflow rehearsal only",
  allergies: "", insurance_name: "", insurance_id: "", insurance_group: "",
  insurance_plan_type: "", facility_id: "synthetic-facility",
});
export const SYNTHETIC_DRAFT = "## HPI\nSynthetic encounter for presentation testing only.\n## Assessment\nNo clinical assessment.\n## Plan\nNo clinical orders. Human review required.";
export function createDevelopmentAdapter() {
  return Object.freeze({ kind: "synthetic-memory-only" as const, patient: SYNTHETIC_PATIENT, draft: SYNTHETIC_DRAFT });
}
export function assertAdapter(value: unknown): asserts value is ReturnType<typeof createDevelopmentAdapter> {
  if (!value || typeof value !== "object" || !("kind" in value) || value.kind !== "synthetic-memory-only" || !("patient" in value) || value.patient !== SYNTHETIC_PATIENT || !("draft" in value) || value.draft !== SYNTHETIC_DRAFT) {
    throw new Error("Original Note requires the synthetic development adapter.");
  }
}
export function capabilityAvailable(name: string) {
  return ["draft.edit", "transcript.edit", "encounter.edit", "patient.edit"].includes(name);
}