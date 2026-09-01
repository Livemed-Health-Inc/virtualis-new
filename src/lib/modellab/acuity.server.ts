/* Server-only connector to the Virtualis Acuity model runtime.
   Credentials never cross the RPC boundary and are never logged. */
import { createHash, createHmac } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";

export type AcuityPath = "/v1/info" | "/v1/decisions" | "/v1/feedback" | "/v1/training-intake";

function baseUrl(): string {
  const url = process.env["ACUITY_API_URL"];
  if (!url) throw new Error("Model runtime is not configured for this environment.");
  return url.replace(/\/+$/, "");
}

/* The verified bearer token is read from the incoming request inside the
   server runtime only — it is never returned to the browser. */
function supabaseAccessToken(): string {
  const header = getRequest()?.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  return token;
}

/* Optional AWS-hosted runtime mode. Lovable Cloud uses supabase_jwt. */
function sigv4Headers(method: string, url: URL, body: string) {
  const region = process.env["AWS_REGION"] ?? "us-east-1";
  const service = process.env["ACUITY_AWS_SERVICE"] ?? "execute-api";
  const access = process.env["AWS_ACCESS_KEY_ID"];
  const secret = process.env["AWS_SECRET_ACCESS_KEY"];
  const sessionToken = process.env["AWS_SESSION_TOKEN"];
  if (!access || !secret) throw new Error("Model runtime is not configured for this environment.");

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(sessionToken ? { "x-amz-security-token": sessionToken } : {}),
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonical = [
    method,
    url.pathname,
    url.searchParams.toString(),
    Object.keys(headers)
      .sort()
      .map((h) => `${h}:${headers[h]}\n`)
      .join(""),
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${date}/${region}/${service}/aws4_request`;
  const toSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonical).digest("hex"),
  ].join("\n");
  const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();
  const signing = hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), service), "aws4_request");
  const signature = createHmac("sha256", signing).update(toSign).digest("hex");
  return {
    ...headers,
    Authorization: `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export async function callAcuity<T>(
  path: AcuityPath,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<T> {
  const url = new URL(baseUrl() + path);
  const body = init.body === undefined ? "" : JSON.stringify(init.body);
  const mode = process.env["ACUITY_API_AUTH_MODE"] ?? "supabase_jwt";

  const auth =
    mode === "aws_sigv4"
      ? sigv4Headers(init.method, url, body)
      : { Authorization: `Bearer ${supabaseAccessToken()}` };

  const res = await fetch(url, {
    method: init.method,
    cache: "no-store",
    headers: {
      accept: "application/json",
      "cache-control": "no-store",
      ...(body ? { "content-type": "application/json" } : {}),
      ...auth,
    },
    ...(body ? { body } : {}),
  });

  if (!res.ok) {
    // Status only: upstream bodies may echo request headers.
    throw new Error(`Model runtime returned ${res.status}`);
  }
  return (await res.json()) as T;
}
