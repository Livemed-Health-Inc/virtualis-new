import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { summarize, visibleThreads } from "./list-threads";

export default defineTool({
  name: "get_thread",
  title: "Get thread messages",
  description:
    "Read one Virtualis demo thread in full: routing metadata plus every message in order.",
  inputSchema: { id: z.number().int().describe("Thread id from list_threads.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const thread = visibleThreads().find((t) => t.id === id);
    if (!thread) throw new ToolError(`No thread with id ${id}.`);
    const detail = { ...summarize(thread), messages: thread.msgs };
    return {
      content: [{ type: "text", text: JSON.stringify(detail, null, 2) }],
      structuredContent: detail,
    };
  },
});
