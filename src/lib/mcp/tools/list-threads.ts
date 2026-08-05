import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
// @ts-expect-error - untyped JS demo data module
import { INITIAL_THREADS, credentialedFacilities } from "@/components/virtualis/data.js";
// @ts-expect-error - untyped JS theme module
import { FACILITIES } from "@/components/virtualis/theme.js";

type Thread = {
  id: number;
  name: string;
  context: string;
  facility: string;
  patient: string;
  room: string;
  mrn: string;
  acuity: "critical" | "urgent" | "routine";
  time: string;
  newCount: number;
  reason: string;
  confidence: number;
  msgs: unknown[];
};

export function visibleThreads(): Thread[] {
  const allowed = new Set<string>(credentialedFacilities());
  return (INITIAL_THREADS as Thread[]).filter((t) => allowed.has(t.facility));
}

export const summarize = (t: Thread) => ({
  id: t.id,
  acuity: t.acuity,
  from: t.name,
  service: t.context,
  facility: FACILITIES[t.facility]?.name ?? t.facility,
  emr: FACILITIES[t.facility]?.emr,
  patient: t.patient,
  room: t.room,
  mrn: t.mrn,
  received: t.time,
  unread: t.newCount,
  reason: t.reason,
  routingConfidence: t.confidence,
});

export default defineTool({
  name: "list_threads",
  title: "List clinical threads",
  description:
    "List the demo clinical message threads in the Virtualis inbox, ordered by acuity (critical, urgent, routine). Optionally filter by acuity or facility.",
  inputSchema: {
    acuity: z.enum(["critical", "urgent", "routine"]).optional().describe("Filter by acuity band."),
    facility: z
      .enum(["saint", "edgerton", "mercy", "northline"])
      .optional()
      .describe("Filter by facility id."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ acuity, facility }) => {
    const order = { critical: 0, urgent: 1, routine: 2 } as const;
    const rows = visibleThreads()
      .filter((t) => (!acuity || t.acuity === acuity) && (!facility || t.facility === facility))
      .sort((a, b) => order[a.acuity] - order[b.acuity])
      .map(summarize);
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { threads: rows },
    };
  },
});
