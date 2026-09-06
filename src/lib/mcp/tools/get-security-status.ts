import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_security_status",
  title: "Get integration security status",
  description: "Confirm the signed-in Virtualis agent connection and its data-access boundary.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Authentication required." }], isError: true };
    }

    return {
      content: [
        {
          type: "text",
          text: "Virtualis is connected. PHI access is disabled: this integration cannot access patients, clinical messages, facilities, devices, or Model Lab data.",
        },
      ],
    };
  },
});
