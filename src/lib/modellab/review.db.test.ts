/* Reviewer-independence regression test, run against real row-level security
   rather than a mock: three synthetic reviewer accounts sign in for real and
   exercise the queue, the verdict ladder and direct table reads. Synthetic
   text only, no PHI. Skipped when backend credentials are absent. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env["SUPABASE_URL"];
const SERVICE = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const ANON = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];
const enabled = Boolean(URL_ && SERVICE && ANON);

const CASE_A = "dddddddd-0000-4000-8000-000000000001";
const CASE_B = "dddddddd-0000-4000-8000-000000000002";
const PASSWORD = `Synthetic-${crypto.randomUUID()}`;

const mkCase = (id: string, text: string, predicted: string) => ({
  id,
  decision_id: crypto.randomUUID(),
  use_case: "clinical_message",
  message_text: text,
  predicted_acuity: predicted,
  confidence: 0.31,
  probabilities: { low: 0.3, medium: 0.4, high: 0.3 },
  reason_codes: [],
  model_version: "m-test",
  state: "pending",
});

let service: SupabaseClient;
const users: string[] = [];
const clients: Record<string, SupabaseClient> = {};

async function reviewer(tag: string) {
  const email = `review-${tag}-${Date.now()}@example.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error("could not provision a test reviewer");
  users.push(data.user.id);
  await service.from("user_roles").insert({ user_id: data.user.id, role: "clinical_reviewer" });
  const client = createClient(URL_!, ANON!, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw signIn.error;
  clients[tag] = client;
  return data.user.id;
}

const caseRow = async (id: string) =>
  (await service.from("review_cases").select("state, label_quality, final_acuity").eq("id", id))
    .data?.[0] as { state: string; label_quality: string | null; final_acuity: string | null };

const verdict = (tag: string, id: string, acuity: string, code: string) =>
  clients[tag]!.rpc("submit_review_verdict", {
    _case_id: id,
    _acuity: acuity,
    _route_accepted: false,
    _outcome_code: code,
  });

const queueRow = async (tag: string, id: string) =>
  ((await clients[tag]!.rpc("review_queue", { _limit: 200 })).data ?? []).find(
    (r: { id: string }) => r.id === id,
  );

beforeAll(async () => {
  if (!enabled) return;
  service = createClient(URL_!, SERVICE!, { auth: { persistSession: false } });
  await service.from("review_cases").delete().in("id", [CASE_A, CASE_B]);
  await service
    .from("review_cases")
    .insert([
      mkCase(CASE_A, "Synthetic: mild ankle swelling after a long flight.", "medium"),
      mkCase(CASE_B, "Synthetic: sore throat for two days, no fever.", "low"),
    ]);
  await Promise.all([reviewer("a"), reviewer("b"), reviewer("c")]);
}, 60_000);

afterAll(async () => {
  if (!enabled) return;
  await service.from("review_verdicts").delete().in("case_id", [CASE_A, CASE_B]);
  await service.from("review_cases").delete().in("id", [CASE_A, CASE_B]);
  /* Roles come off first: the append-only audit trail keeps a row for every
     synthetic actor, so the account itself may legitimately refuse to delete
     and must not be left holding a reviewer role. */
  await service.from("user_roles").delete().in("user_id", users);
  for (const id of users) await service.auth.admin.deleteUser(id);
});

describe.skipIf(!enabled)("reviewer independence (database)", () => {
  it("keeps the first verdict off the case row and out of the second reviewer's reach", async () => {
    expect((await verdict("a", CASE_A, "high", "UNDER_TRIAGED")).error).toBeNull();
    expect(await caseRow(CASE_A)).toMatchObject({
      state: "single_reviewed",
      label_quality: "single_reviewed",
      final_acuity: null,
    });

    const queued = await queueRow("b", CASE_A);
    expect(queued).toBeTruthy();
    /* Nothing outside the model's own output may carry reviewer A's answer. */
    const { message_text, predicted_acuity, probabilities, ...rest } = queued as Record<
      string,
      unknown
    >;
    void message_text;
    void predicted_acuity;
    void probabilities;
    expect(JSON.stringify(rest)).not.toMatch(/high/);

    const direct = await clients["b"]!.from("review_cases").select("*").eq("id", CASE_A);
    expect(direct.data ?? []).toHaveLength(0);
  }, 60_000);

  it("resolves on agreement and stops offering the case", async () => {
    expect((await verdict("b", CASE_A, "high", "UNDER_TRIAGED")).error).toBeNull();
    expect(await caseRow(CASE_A)).toMatchObject({
      state: "expert_reviewed",
      label_quality: "expert_reviewed",
      final_acuity: "high",
    });
    expect(await queueRow("c", CASE_A)).toBeUndefined();

    /* A reviewer who judged the case still sees its resolved outcome. */
    const own = await clients["a"]!.from("review_cases").select("final_acuity").eq("id", CASE_A);
    expect(own.data?.[0]?.final_acuity).toBe("high");
  }, 60_000);

  it("holds a disagreement unlabelled until an adjudicator resolves it", async () => {
    await verdict("a", CASE_B, "low", "AGREE_WITH_MODEL");
    await verdict("b", CASE_B, "high", "UNDER_TRIAGED");
    expect(await caseRow(CASE_B)).toMatchObject({
      state: "disagreement",
      label_quality: null,
      final_acuity: null,
    });

    expect(await queueRow("c", CASE_B)).toBeTruthy();
    /* The adjudicator cannot read the two verdicts under adjudication. */
    const seen = await clients["c"]!.from("review_verdicts").select("acuity").eq("case_id", CASE_B);
    expect(seen.data ?? []).toHaveLength(0);

    expect((await verdict("c", CASE_B, "medium", "AMBIGUOUS_TEXT")).error).toBeNull();
    expect(await caseRow(CASE_B)).toMatchObject({
      state: "adjudicated",
      label_quality: "adjudicated",
      final_acuity: "medium",
    });
  }, 60_000);
});
