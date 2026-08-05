import { defineMcp, type McpDefinitionInput } from "@lovable.dev/mcp-js";
import listThreads from "./tools/list-threads";
import getThread from "./tools/get-thread";
import listCareTeam from "./tools/list-care-team";

export default defineMcp({
  name: "pixel-perfect-view",
  title: "Pixel Perfect View",
  version: "0.1.0",
  instructions:
    "Read-only access to the Virtualis® clinical messaging demo. Use `list_threads` to see the acuity-routed inbox (3 bars critical, 2 urgent, 1 routine), `get_thread` to read a consult in full, and `list_care_team` for the directory, credentials, and on-call schedule. All data is fictional demo data — no real patient information.",
  tools: [listThreads, getThread, listCareTeam] as McpDefinitionInput["tools"],
});
