/* Physician Review workflow, exercised against real row-level security rather
   than a mock: a coordinator and three synthetic physicians sign in for real
   and run the full ladder. Synthetic text only, no PHI. Skipped when backend
   credentials are absent. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env["SUPABASE_URL"];
const SERVICE = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const ANON = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];
const enabled = Boolean(URL_ && SERVICE && ANON);
const PASSWORD = `Synthetic-${crypto.randomUUID()}`;

let service: SupabaseClient;
const users: string[] = [];
const ids: Record<string, string> = {};
const clients: Record<string, SupabaseClient> = {};
const batches: string[] = [];
const items: Record<string, string> = {};

async function account(tag: string, roles: string[]) {
  const email = `pr-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error("could not provision a test account");
  users.push(data.user.id);
  ids[tag] = data.user.id;
  for (const r of roles)
    await service.from("user_roles").insert({ user_id: data.user.id, role: r });
  const client = createClient(URL_!, ANON!, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error) throw signIn.error;
  clients[tag] = client;
}

const row = (record_id: string, message: string) => ({ record_id, message, group_key: record_id });

async function importBatch(name: string, mode: string, rows: object[]) {
  const { data, error } = await clients["coord"]!.rpc("pr_import_batch", {
    _name: name,
    _facility: null,
    _mode: mode,
    _items: rows,
  });
  if (error) throw error;
  batches.push(data as string);
  return data as string;
}

const submit = (
  tag: string,
  item: string,
  o: {
    acuity?: string | null;
    needs_info?: boolean;
    routes?: string[];
    no_specialty?: boolean;
  } = {},
) =>
  clients[tag]!.rpc("pr_save_review", {
    _item_id: item,
    _status: "submitted",
    _acuity: o.acuity ?? null,
    _needs_info: o.needs_info ?? false,
    _rationale: "Synthetic rationale recorded for this workflow test.",
    _routes: o.routes ?? [],
    _no_specialty: o.no_specialty ?? false,
  });

const outcome = async (item: string) =>
  (
    await service
      .from("pr_outcomes")
      .select("state, final_acuity, label_quality, routes_state")
      .eq("item_id", item)
  ).data?.[0] as Record<string, unknown>;

const queueRow = async (tag: string, item: string) =>
  ((await clients[tag]!.rpc("pr_my_queue", { _include_done: true })).data ?? []).find(
    (r: { item_id: string }) => r.item_id === item,
  );

beforeAll(async () => {
  if (!enabled) return;
  service = createClient(URL_!, SERVICE!, { auth: { persistSession: false } });
  await account("coord", ["admin"]);
  await Promise.all([
    account("a", ["clinical_reviewer"]),
    account("b", ["clinical_reviewer"]),
    account("c", ["clinical_reviewer"]),
    account("outsider", []),
  ]);

  const clinical = await importBatch("Synthetic clinical batch", "clinical", [
    row("agree-1", "Synthetic: sore throat for two days, no fever."),
    row("disagree-1", "Synthetic: intermittent chest tightness while walking."),
    row("needsinfo-1", "Synthetic: feeling off since yesterday."),
    row("unassigned-1", "Synthetic: routine medication refill request."),
  ]);
  const practice = await importBatch("Synthetic practice batch", "practice", [
    row("practice-1", "Synthetic practice: mild ankle swelling after a long flight."),
  ]);

  for (const b of [clinical, practice]) {
    const { data } = await service.from("pr_items").select("id, record_id").eq("batch_id", b);
    for (const it of data ?? []) items[it.record_id] = it.id;
  }

  await clients["coord"]!.rpc("pr_assign_reviewers", {
    _item_ids: [items["agree-1"], items["disagree-1"], items["needsinfo-1"]],
    _a: ids["a"],
    _b: ids["b"],
  });
}, 120_000);

afterAll(async () => {
  if (!enabled) return;
  await service.from("pr_batches").delete().in("id", batches);
  /* Roles come off first: the append-only audit trail keeps a row for every
     synthetic actor, so the account itself may legitimately refuse to delete
     and must not be left holding a reviewer role. */
  await service.from("user_roles").delete().in("user_id", users);
  for (const id of users) await service.auth.admin.deleteUser(id);
});

describe.skipIf(!enabled)("physician review access control", () => {
  it("refuses anonymous callers everywhere", async () => {
    const anon = createClient(URL_!, ANON!, { auth: { persistSession: false } });
    expect((await anon.rpc("pr_my_queue", {})).error).toBeTruthy();
    expect((await anon.from("pr_items").select("id")).data ?? []).toHaveLength(0);
    expect((await anon.rpc("pr_overview")).error).toBeTruthy();
  }, 60_000);

  it("refuses a signed-in user who holds neither role", async () => {
    expect((await clients["outsider"]!.rpc("pr_my_queue", {})).error).toBeTruthy();
    expect((await clients["outsider"]!.from("pr_items").select("id")).data ?? []).toHaveLength(0);
    expect((await clients["outsider"]!.rpc("pr_overview")).error).toBeTruthy();
  }, 60_000);

  it("refuses a physician on an item nobody assigned to them", async () => {
    const id = items["unassigned-1"]!;
    expect(await queueRow("a", id)).toBeUndefined();
    expect(
      (await clients["a"]!.from("pr_items").select("id").eq("id", id)).data ?? [],
    ).toHaveLength(0);
    expect((await submit("a", id, { acuity: "low" })).error).toBeTruthy();
  }, 60_000);

  it("keeps imported row flags out of a physician's reach", async () => {
    const flags = await clients["a"]!.from("pr_item_flags").select("*");
    expect(flags.data ?? []).toHaveLength(0);
  }, 60_000);
});

describe.skipIf(!enabled)("blinding and the review ladder", () => {
  it("saves and reloads a draft from the backend", async () => {
    const id = items["agree-1"]!;
    const save = await clients["a"]!.rpc("pr_save_review", {
      _item_id: id,
      _status: "draft",
      _acuity: "low",
      _needs_info: false,
      _rationale: "Draft in progress.",
      _routes: [],
      _no_specialty: false,
    });
    expect(save.error).toBeNull();
    const reloaded = await queueRow("a", id);
    expect(reloaded).toMatchObject({ my_status: "draft", my_acuity: "low" });
  }, 60_000);

  it("never carries the first physician's answer to the second", async () => {
    const id = items["agree-1"]!;
    expect((await submit("a", id, { acuity: "high", routes: ["cardiology"] })).error).toBeNull();
    expect(await outcome(id)).toMatchObject({
      state: "in_review",
      final_acuity: null,
      label_quality: null,
    });

    const seen = await queueRow("b", id);
    expect(seen).toBeTruthy();
    const { message, context, ...rest } = seen as Record<string, unknown>;
    void message;
    void context;
    expect(JSON.stringify(rest)).not.toMatch(/high|cardiology/);

    /* Direct table reads are closed too. */
    expect(
      (await clients["b"]!.from("pr_reviews").select("*").eq("item_id", id)).data ?? [],
    ).toHaveLength(0);
    expect(
      (await clients["b"]!.from("pr_outcomes").select("*").eq("item_id", id)).data ?? [],
    ).toHaveLength(0);
  }, 60_000);

  it("resolves on agreement and drops the case from the queue", async () => {
    const id = items["agree-1"]!;
    expect((await submit("b", id, { acuity: "high", routes: ["cardiology"] })).error).toBeNull();
    expect(await outcome(id)).toMatchObject({
      state: "agreed",
      final_acuity: "high",
      label_quality: "expert_reviewed",
      routes_state: "agreed",
    });
    const open = (await clients["a"]!.rpc("pr_my_queue", { _include_done: false })).data ?? [];
    expect(open.find((r: { item_id: string }) => r.item_id === id)).toBeUndefined();
  }, 60_000);

  it("accepts a duplicate submission without changing anything", async () => {
    const id = items["agree-1"]!;
    const again = await submit("a", id, { acuity: "low" });
    expect(again.error).toBeNull();
    expect(await outcome(id)).toMatchObject({ final_acuity: "high", state: "agreed" });
  }, 60_000);

  it("never approves a label when both physicians need more information", async () => {
    const id = items["needsinfo-1"]!;
    await submit("a", id, { needs_info: true });
    await submit("b", id, { needs_info: true });
    expect(await outcome(id)).toMatchObject({
      state: "needs_info",
      final_acuity: null,
      label_quality: null,
    });
  }, 60_000);
});

describe.skipIf(!enabled)("disagreement and adjudication", () => {
  it("holds a disagreement unlabelled and refuses a self-adjudicator", async () => {
    const id = items["disagree-1"]!;
    await submit("a", id, { acuity: "low", no_specialty: true });
    await submit("b", id, { acuity: "high", routes: ["cardiology"] });
    expect(await outcome(id)).toMatchObject({
      state: "disagreement",
      final_acuity: null,
      label_quality: null,
    });

    const self = await clients["coord"]!.rpc("pr_assign_adjudicator", {
      _item_id: id,
      _who: ids["a"],
    });
    expect(self.error).toBeTruthy();
  }, 60_000);

  it("lets an independent adjudicator resolve it", async () => {
    const id = items["disagree-1"]!;
    expect(
      (await clients["coord"]!.rpc("pr_assign_adjudicator", { _item_id: id, _who: ids["c"] }))
        .error,
    ).toBeNull();
    /* The adjudicator still cannot read the two verdicts under adjudication. */
    expect(
      (await clients["c"]!.from("pr_reviews").select("acuity").eq("item_id", id)).data ?? [],
    ).toHaveLength(0);

    expect((await submit("c", id, { acuity: "medium", routes: ["cardiology"] })).error).toBeNull();
    expect(await outcome(id)).toMatchObject({
      state: "adjudicated",
      final_acuity: "medium",
      label_quality: "adjudicated",
      routes_state: "adjudicated",
    });
  }, 60_000);
});

describe.skipIf(!enabled)("export governance", () => {
  const clinicalBatch = () => batches[0]!;

  it("refuses export until all three approvals are recorded", async () => {
    expect(
      (await clients["coord"]!.rpc("pr_export_batch", { _batch: clinicalBatch() })).error,
    ).toBeTruthy();
    await clients["coord"]!.rpc("pr_set_export_approval", {
      _batch: clinicalBatch(),
      _clinical: true,
      _privacy: true,
      _training: false,
    });
    expect(
      (await clients["coord"]!.rpc("pr_export_batch", { _batch: clinicalBatch() })).error,
    ).toBeTruthy();
  }, 60_000);

  it("exports resolved clinical rows only, excluding needs-information", async () => {
    await clients["coord"]!.rpc("pr_set_export_approval", {
      _batch: clinicalBatch(),
      _clinical: true,
      _privacy: true,
      _training: true,
    });
    const { data, error } = await clients["coord"]!.rpc("pr_export_batch", {
      _batch: clinicalBatch(),
    });
    expect(error).toBeNull();
    const records = (data ?? []) as { record_id: string }[];
    expect(records.map((r) => r.record_id).sort()).toEqual(["agree-1", "disagree-1"]);
  }, 60_000);

  it("never exports practice data", async () => {
    const practice = batches[1]!;
    await clients["coord"]!.rpc("pr_set_export_approval", {
      _batch: practice,
      _clinical: true,
      _privacy: true,
      _training: true,
    });
    const r = await clients["coord"]!.rpc("pr_export_batch", { _batch: practice });
    expect(r.error).toBeTruthy();
  }, 60_000);

  it("refuses export to a physician who is not a coordinator", async () => {
    expect(
      (await clients["a"]!.rpc("pr_export_batch", { _batch: clinicalBatch() })).error,
    ).toBeTruthy();
    expect((await clients["a"]!.rpc("pr_list_items", {})).error).toBeTruthy();
  }, 60_000);
});
