/* Database-level regression test for reviewer independence. Skipped unless a
   direct database URL and service credentials are present, since it must run
   against real row-level security rather than a mock. It provisions three
   synthetic reviewer accounts, runs supabase/tests/review-independence.sql
   inside a transaction that always rolls back, then removes the accounts. */
import { execFileSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";

const DB = process.env["SUPABASE_DB_URL"];
const URL_ = process.env["SUPABASE_URL"];
const KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const enabled = Boolean(DB && URL_ && KEY);

const admin = (path: string, init: RequestInit = {}) =>
  fetch(`${URL_}/auth/v1/admin/users${path}`, {
    ...init,
    headers: { apikey: KEY!, authorization: `Bearer ${KEY}`, "content-type": "application/json" },
  });

const created: string[] = [];

const makeReviewer = async (tag: string) => {
  const r = await admin("", {
    method: "POST",
    body: JSON.stringify({
      email: `review-${tag}-${Date.now()}@example.test`,
      email_confirm: true,
    }),
  });
  const body = (await r.json()) as { id?: string };
  if (!body.id) throw new Error("could not provision a test reviewer");
  created.push(body.id);
  return body.id;
};

afterAll(async () => {
  for (const id of created) await admin(`/${id}`, { method: "DELETE" });
});

describe.skipIf(!enabled)("reviewer independence (database)", () => {
  it("never exposes one reviewer's verdict to another", async () => {
    const [a, b, c] = await Promise.all([
      makeReviewer("a"),
      makeReviewer("b"),
      makeReviewer("c"),
    ]);
    const out = execFileSync(
      "psql",
      [DB!, "-q", "-v", `a=${a}`, "-v", `b=${b}`, "-v", `c=${c}`, "-f", "supabase/tests/review-independence.sql"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    expect(out).not.toMatch(/FAIL/);
  }, 60_000);
});
