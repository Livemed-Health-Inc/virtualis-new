import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/envcheck")({
  server: {
    handlers: {
      GET: async () => {
        const { isConfigured } = await import("@/lib/modellab/acuity.server");
        return new Response(JSON.stringify({ configured: isConfigured() }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
