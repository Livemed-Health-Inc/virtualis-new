/* ALIS streaming chat. Signed-in, setup-complete clinicians only; every
   message is screened for patient identifiers before it can leave the server. */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ALIS_INSTRUCTIONS, screenLines } from "@/lib/note/note";

const body = z
  .object({
    messages: z
      .array(
        z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }).strict(),
      )
      .min(1)
      .max(40),
  })
  .strict();

const fail = (status: number, error: string) => Response.json({ error }, { status });

export const Route = createFileRoute("/api/alis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return fail(401, "Sign in required.");
        const sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user) return fail(401, "Sign in required.");
        const { data: ready } = await sb.rpc("setup_complete", { _user_id: u.user.id });
        if (ready !== true) return fail(403, "Finish account setup first.");

        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return fail(400, "Message is empty or too long.");
        const { messages } = parsed.data;
        if (screenLines(messages.filter((m) => m.role === "user").map((m) => m.content)).length)
          return fail(422, "Remove patient identifiers (MRN, phone, SSN, email) before asking ALIS.");

        try {
          const { throttle } = await import("@/lib/modellab/guards");
          await throttle(u.user.id, "alis_chat", { limit: 60, windowSeconds: 3600, lockSeconds: 300 });
        } catch {
          return fail(429, "Too many requests right now. Try again shortly.");
        }

        const { streamText, GatewayError } = await import("@/lib/note/ai.server");
        try {
          const stream = await streamText(ALIS_INSTRUCTIONS, messages, request.signal);
          return new Response(stream, {
            headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
          });
        } catch (e) {
          if ((e as Error).name === "AbortError") return new Response(null, { status: 499 });
          const status = e instanceof GatewayError ? e.status : 500;
          return fail(status >= 400 ? status : 500, (e as Error).message);
        }
      },
    },
  },
});
