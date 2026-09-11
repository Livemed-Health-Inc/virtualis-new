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

const row = (record_id: string, message: string, extra: Record<string, unknown> = {}) => ({
  record_id,
  message,
  group_key: record_id,
  deidentification_reviewed: true,
  ...extra,
});

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
    row("noroute-1", "Synthetic: recurring headaches in the afternoon.", {
      patient_group: "pt-1",
      encounter_group: "enc-1",
      template_group: "tpl-1",
      split: "validation",
    }),
    row("unflagged-1", "Synthetic: mild sunburn after a weekend outdoors.", {
      deidentification_reviewed: false,
    }),
  ]);
  const blind = await importBatch("Synthetic blinding batch", "clinical", [
    row("blind-1", "Synthetic: shortness of breath climbing one flight."),
  ]);
  const practice = await importBatch("Synthetic practice batch", "practice", [
    row("practice-1", "Synthetic practice: mild ankle swelling after a long flight."),
  ]);

  for (const b of [clinical, blind, practice]) {
    const { data } = await service.from("pr_items").select("id, record_id").eq("batch_id", b);
    for (const it of data ?? []) items[it.record_id] = it.id;
  }

  await clients["coord"]!.rpc("pr_assign_reviewers", {
    _item_ids: [
      items["agree-1"],
      items["disagree-1"],
      items["needsinfo-1"],
      items["noroute-1"],
      items["unflagged-1"],
    ],
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

describe.skipIf(!enabled)("assignment limits and blinding", () => {
  it("refuses a third independent reviewer and will not replace one who answered", async () => {
    const id = items["agree-1"]!;
    const swap = await clients["coord"]!.rpc("pr_assign_reviewers", {
      _item_ids: [id],
      _a: ids["a"],
      _b: ids["c"],
    });
    expect(swap.error).toBeTruthy();
    /* The structural cap holds even against a direct privileged insert. */
    const direct = await service
      .from("pr_assignments")
      .insert({ item_id: id, reviewer_id: ids["c"], role: "reviewer" });
    expect(direct.error).toBeTruthy();
    const { data: assigned } = await service
      .from("pr_assignments")
      .select("reviewer_id")
      .eq("item_id", id)
      .eq("role", "reviewer");
    expect(assigned ?? []).toHaveLength(2);
  }, 60_000);

  it("hides every outcome from a coordinator who owes a review on the case", async () => {
    const id = items["blind-1"]!;
    await clients["coord"]!.rpc("pr_assign_reviewers", {
      _item_ids: [id],
      _a: ids["a"],
      _b: ids["coord"],
    });
    expect((await submit("a", id, { acuity: "high", routes: ["cardiology"] })).error).toBeNull();

    const listed = ((await clients["coord"]!.rpc("pr_list_items", { _batch: batches[1] })).data ??
      []) as Record<string, unknown>[];
    const seen = listed.find((r) => r["item_id"] === id)!;
    expect(seen).toMatchObject({ blinded: true, state: "blinded", final_acuity: null });
    expect(JSON.stringify(seen)).not.toMatch(/high|cardiology/);

    expect(
      (await clients["coord"]!.from("pr_outcomes").select("*").eq("item_id", id)).data ?? [],
    ).toHaveLength(0);
    expect(
      (await clients["coord"]!.from("pr_reviews").select("*").eq("item_id", id)).data ?? [],
    ).toHaveLength(0);
    /* Nor may they export around it. */
    await clients["coord"]!.rpc("pr_set_export_approval", {
      _batch: batches[1],
      _clinical: true,
      _privacy: true,
      _training: true,
    });
    expect(
      (await clients["coord"]!.rpc("pr_export_batch", { _batch: batches[1] })).error,
    ).toBeTruthy();
  }, 60_000);
});

describe.skipIf(!enabled)("import integrity", () => {
  it("refuses a file that repeats a record id, leaving no batch behind", async () => {
    const name = `Synthetic duplicate ${Date.now()}`;
    const r = await clients["coord"]!.rpc("pr_import_batch", {
      _name: name,
      _facility: null,
      _mode: "clinical",
      _items: [row("dup-1", "Synthetic: first."), row("dup-1", "Synthetic: second.")],
    });
    expect(r.error).toBeTruthy();
    const { data } = await service.from("pr_batches").select("id").eq("name", name);
    expect(data ?? []).toHaveLength(0);
  }, 60_000);

  it("keeps lineage and the declared split instead of defaulting to train", async () => {
    const { data } = await service
      .from("pr_items")
      .select("split, patient_group, encounter_group, template_group")
      .eq("id", items["noroute-1"]!);
    expect(data?.[0]).toMatchObject({
      split: "validation",
      patient_group: "pt-1",
      encounter_group: "enc-1",
      template_group: "tpl-1",
    });
    const plain = await service.from("pr_items").select("split").eq("id", items["agree-1"]!);
    expect(plain.data?.[0]?.["split"]).toBe("unassigned");
  }, 60_000);
});

describe.skipIf(!enabled)("route decisions", () => {
  it("never turns an unanswered route question into a decision", async () => {
    const id = items["noroute-1"]!;
    await submit("a", id, { acuity: "low", routes: ["neurology"] });
    await submit("b", id, { acuity: "high" });
    await clients["coord"]!.rpc("pr_assign_adjudicator", { _item_id: id, _who: ids["c"] });
    expect((await submit("c", id, { acuity: "low" })).error).toBeNull();
    expect(await outcome(id)).toMatchObject({
      state: "adjudicated",
      final_acuity: "low",
      routes_state: "unreviewed",
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

  it("holds back a row until it is privacy reviewed and approved for training use", async () => {
    /* Resolve the row whose imported privacy flag is false. */
    await submit("a", items["unflagged-1"]!, { acuity: "low", no_specialty: true });
    await submit("b", items["unflagged-1"]!, { acuity: "low", no_specialty: true });

    await clients["coord"]!.rpc("pr_set_export_approval", {
      _batch: clinicalBatch(),
      _clinical: true,
      _privacy: true,
      _training: true,
    });
    /* Batch approvals alone export nothing: no row is approved yet. */
    const none = await clients["coord"]!.rpc("pr_export_batch", { _batch: clinicalBatch() });
    expect(none.error).toBeNull();
    expect((none.data ?? []) as unknown[]).toHaveLength(0);

    /* Approving the unflagged row for training use still cannot export it,
       because its per-row privacy flag is false. */
    await clients["coord"]!.rpc("pr_set_item_training_use", {
      _item_ids: [items["unflagged-1"], items["agree-1"], items["disagree-1"], items["noroute-1"]],
      _approved: true,
    });
    const { data, error } = await clients["coord"]!.rpc("pr_export_batch", {
      _batch: clinicalBatch(),
    });
    expect(error).toBeNull();
    const records = (data ?? []) as { record_id: string; split: string; routes_state: string }[];
    expect(records.map((r) => r.record_id).sort()).toEqual(["agree-1", "disagree-1", "noroute-1"]);
    expect(records.find((r) => r.record_id === "noroute-1")).toMatchObject({
      split: "validation",
      routes_state: "unreviewed",
    });
  }, 60_000);

  it("stops exporting a row once its training-use approval is withdrawn", async () => {
    await clients["coord"]!.rpc("pr_set_item_training_use", {
      _item_ids: [items["agree-1"]],
      _approved: false,
    });
    const { data } = await clients["coord"]!.rpc("pr_export_batch", { _batch: clinicalBatch() });
    const records = (data ?? []) as { record_id: string }[];
    expect(records.map((r) => r.record_id)).not.toContain("agree-1");
  }, 60_000);

  it("never exports practice data", async () => {
    const practice = batches[2]!;
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

describe.skipIf(!enabled)("facility scope is re-checked on every read", () => {
  it("closes every read path the moment a credential is withdrawn", async () => {
    const { data: facilities } = await service.from("facilities").select("id").limit(1);
    const facility = facilities?.[0]?.["id"] as string | undefined;
    if (!facility) return; // no facility configured in this environment

    const credential = (user: string) =>
      service.from("provider_credentials").insert({
        user_id: user,
        facility_id: facility,
        privileges: "synthetic test",
        expires_on: "2099-01-01",
      });
    await Promise.all([credential(ids["coord"]!), credential(ids["a"]!), credential(ids["b"]!)]);

    const { data: batch, error } = await clients["coord"]!.rpc("pr_import_batch", {
      _name: `Synthetic facility batch ${Date.now()}`,
      _facility: facility,
      _mode: "clinical",
      _items: [row("fac-1", "Synthetic: persistent cough at a facility.")],
    });
    expect(error).toBeNull();
    batches.push(batch as string);
    const { data: rows } = await service.from("pr_items").select("id").eq("batch_id", batch);
    const id = rows![0]!["id"] as string;

    await clients["coord"]!.rpc("pr_assign_reviewers", {
      _item_ids: [id],
      _a: ids["a"],
      _b: ids["b"],
    });
    expect(await queueRow("a", id)).toBeTruthy();

    await service.from("provider_credentials").delete().eq("user_id", ids["a"]!);
    expect(await queueRow("a", id)).toBeUndefined();
    expect(
      (await clients["a"]!.from("pr_items").select("id").eq("id", id)).data ?? [],
    ).toHaveLength(0);
    expect((await submit("a", id, { acuity: "low" })).error).toBeTruthy();
    /* The still-credentialed reviewer is unaffected. */
    expect(await queueRow("b", id)).toBeTruthy();

    await service.from("provider_credentials").delete().in("user_id", users);
  }, 90_000);
});
