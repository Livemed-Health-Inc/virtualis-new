/* Lovable AI Gateway (Responses API) over raw streaming HTTP. Server-only:
   the key, prompts and model never reach the browser. Every call streams —
   reasoning runs can be long — and no timer ever aborts it. */
const URL = "https://ai.gateway.lovable.dev/v1/responses";
export const MODEL = "openai/gpt-6-astra";

export class GatewayError extends Error {
  constructor(public status: number) {
    super(
      status === 402
        ? "AI credits are exhausted. Add credits in Settings → Plans & credits."
        : status === 429
          ? "The assistant is busy. Try again in a moment."
          : status === 403
            ? "AI access is not permitted for this workspace."
            : "The assistant is unavailable right now.",
    );
  }
}

type Input = { role: "user" | "assistant"; content: string }[];

async function open(instructions: string, input: Input, extra: object, signal?: AbortSignal) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new GatewayError(500);
  const res = await fetch(URL, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      instructions,
      input: input.map((m) => ({
        role: m.role,
        content: [{ type: m.role === "user" ? "input_text" : "output_text", text: m.content }],
      })),
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      ...extra,
    }),
  });
  if (!res.ok || !res.body) throw new GatewayError(res.status);
  return res.body;
}

/** Yields answer-text deltas from the SSE stream. */
async function* deltas(body: ReadableStream<Uint8Array>) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      try {
        const ev = JSON.parse(line.slice(5));
        if (ev.type === "response.output_text.delta") yield ev.delta as string;
        if (ev.type === "response.failed" || ev.type === "error") throw new GatewayError(500);
      } catch (e) {
        if (e instanceof GatewayError) throw e;
      }
    }
  }
}

export async function streamText(instructions: string, input: Input, signal?: AbortSignal) {
  const body = await open(instructions, input, {}, signal);
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(c) {
      try {
        for await (const d of deltas(body)) c.enqueue(enc.encode(d));
      } catch {
        c.enqueue(enc.encode("\n\n[The assistant stopped unexpectedly.]"));
      }
      c.close();
    },
  });
}

export async function completeJson<T>(instructions: string, input: Input, name: string, schema: object) {
  const body = await open(instructions, input, {
    text: { format: { type: "json_schema", name, strict: true, schema } },
  });
  let out = "";
  for await (const d of deltas(body)) out += d;
  return JSON.parse(out) as T;
}
