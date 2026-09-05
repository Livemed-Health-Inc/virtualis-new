/* Server-only connector to the Virtualis Acuity model runtime (AWS API Gateway
   behind a JWT authorizer). The only credential that ever leaves this server is
   the signed-in user's own Supabase access token, forwarded verbatim from the
   verified incoming request. No AWS keys exist in this application. */
import { getRequest } from "@tanstack/react-start/server";

export type AcuityPath = "/v1/info" | "/v1/decisions" | "/v1/feedback" | "/v1/training-intake";

const NOT_CONFIGURED = "Model runtime is not configured for this environment.";

export const isConfigured = () =>
  !!process.env["ACUITY_API_URL"] &&
  (process.env["ACUITY_API_AUTH_MODE"] ?? "supabase_jwt") === "supabase_jwt";

/* The bearer token is read from the incoming request inside the server runtime
   only — it is never returned to the browser or logged. */
function supabaseAccessToken(): string {
  const header = getRequest()?.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  return token;
}

export async function callAcuity(
  path: AcuityPath,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<unknown> {
  if (!isConfigured()) throw new Error(NOT_CONFIGURED);
  const body = init.body === undefined ? undefined : JSON.stringify(init.body);
  const res = await fetch(process.env["ACUITY_API_URL"]!.replace(/\/+$/, "") + path, {
    method: init.method,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
    headers: {
      accept: "application/json",
      authorization: `Bearer ${supabaseAccessToken()}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body } : {}),
  });
  // Status only: upstream bodies may echo request content.
  if (!res.ok) throw new Error(`Model runtime returned ${res.status}`);
  return res.json();
}
