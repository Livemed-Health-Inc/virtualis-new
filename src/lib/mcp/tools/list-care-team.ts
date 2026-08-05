import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
// @ts-expect-error - untyped JS demo data module
import { STAFF, SHIFTS, ME, credentialedFacilities } from "@/components/virtualis/data.js";
// @ts-expect-error - untyped JS theme module
import { FACILITIES } from "@/components/virtualis/theme.js";

type Staff = {
  id: string;
  name: string;
  role: string;
  dept: string;
  facility: string;
  online: boolean;
};

export default defineTool({
  name: "list_care_team",
  title: "List care team and coverage",
  description:
    "List the Virtualis demo care-team directory (clinicians, department, facility, online status) and the on-call shift schedule for the signed-in demo provider.",
  inputSchema: {
    facility: z
      .enum(["saint", "edgerton", "mercy", "northline"])
      .optional()
      .describe("Filter clinicians by facility id."),
    onlineOnly: z.boolean().optional().describe("Only return clinicians currently online."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ facility, onlineOnly }) => {
    const allowed = new Set<string>(credentialedFacilities());
    const staff = (STAFF as Staff[])
      .filter(
        (s) =>
          allowed.has(s.facility) &&
          (!facility || s.facility === facility) &&
          (!onlineOnly || s.online),
      )
      .map((s) => ({
        name: s.name,
        role: s.role,
        department: s.dept,
        facility: FACILITIES[s.facility]?.name ?? s.facility,
        online: s.online,
      }));

    type Shift = { label: string; facility: string; time: string; acuity: string };
    const shifts = Object.entries(SHIFTS as Record<string, Shift[]>).flatMap(([day, list]) =>
      list.map((s) => ({
        day: Number(day),
        label: s.label,
        facility: FACILITIES[s.facility]?.name ?? s.facility,
        time: s.time,
        acuity: s.acuity,
      })),
    );


    const result = {
      provider: { name: ME.name, role: ME.role, credentials: ME.credentials },
      staff,
      shifts,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
