import { describe, expect, it, vi } from "vitest";
import {
  assertAdapter,
  capabilityAvailable,
  createDevelopmentAdapter,
  SYNTHETIC_PATIENT,
} from "./adapter";

describe("original Note development boundary", () => {
  it("rejects missing and unmapped adapters", () => {
    expect(() => assertAdapter(null)).toThrow();
    expect(() =>
      assertAdapter({ kind: "synthetic-memory-only", patient: { name: "Unknown" } }),
    ).toThrow();
  });
  it("provides deterministic synthetic fixtures without services or host context", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    try {
      const a = createDevelopmentAdapter();
      assertAdapter(a);
      expect(a.patient).toBe(SYNTHETIC_PATIENT);
      expect(Object.keys(a).sort()).toEqual(["draft", "kind", "patient"]);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("allows only memory editing and fails closed for consequential or unknown capabilities", () => {
    expect(capabilityAvailable("draft.edit")).toBe(true);
    expect(capabilityAvailable("workspace.navigate")).toBe(true);
    for (const name of ["sign", "save", "generate", "transcribe", "analytics", "sync", "rcm", "chat.send", "patient.edit", "unknown"])
      expect(capabilityAvailable(name)).toBe(false);
  });
});
