/* Virtualis Note against real row-level security: two synthetic clinicians at
   different facilities. Synthetic text only. Skipped without backend credentials. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL_ = process.env["SUPABASE_URL"];
const SERVICE = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const ANON = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_ANON_KEY"];
const enabled = Boolean(URL_ && SERVICE && ANON);
const PASSWORD = `Synthetic-${crypto.randomUUID()}`;

let service: SupabaseClient;
const users: string[] = [];
const c: Record<string, SupabaseClient> = {};
let thread = "";

async function clinician(tag: string, facility: string) {
  const email = `note-${tag}-${Date.now()}@example.test`;
  const { data } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  const id = data.user!.id;
  users.push(id);
  await service.from("profiles").update({ must_change_password: false }).eq("id", id);
  await service.from("provider_credentials").insert({
    user_id: id,
    facility_id: facility,
    privileges: "Synthetic",
    expires_on: "2099-01-01",
  });
  const client = createClient(URL_!, ANON!, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password: PASSWORD });
  c[tag] = client;
}

const soap = { _s: "Synthetic S", _o: "Synthetic O", _a: "Synthetic A", _p: "Synthetic P" };

beforeAll(async () => {
  if (!enabled) return;
  service = createClient(URL_!, SERVICE!, { auth: { persistSession: false } });
  await clinician("a", "saint");
  await clinician("b", "mercy");
  const { data } = await service
    .from("threads")
    .insert({ name: "Synthetic", context: "Test", facility_id: "saint", patient: "—", room: "—", reason: "", confidence: 0 })
    .select("id")
    .single();
  thread = data!.id;
});

afterAll(async () => {
  if (!enabled) return;
  await service.from("clinical_notes").delete().eq("thread_id", thread);
  await service.from("threads").delete().eq("id", thread);
  for (const u of users) await service.auth.admin.deleteUser(u);
});

describe.skipIf(!enabled)("clinical notes (live RLS)", () => {
  let note = "";

  it("credentialed clinician saves a draft; others cannot see it", async () => {
    const r = await c["a"]!.rpc("note_save", { _id: null, _thread: thread, _parent: null, ...soap });
    expect(r.error).toBeNull();
    note = r.data as string;
    const other = await c["b"]!.from("clinical_notes").select("id").eq("id", note);
    expect(other.data).toEqual([]);
  });

  it("cross-facility clinician cannot create, edit or sign", async () => {
    expect((await c["b"]!.rpc("note_save", { _id: null, _thread: thread, _parent: null, ...soap })).error).not.toBeNull();
    expect((await c["b"]!.rpc("note_save", { _id: note, _thread: thread, _parent: null, ...soap })).error).not.toBeNull();
    expect((await c["b"]!.rpc("note_sign", { _id: note })).error).not.toBeNull();
  });

  it("signed-out caller is refused", async () => {
    const anon = createClient(URL_!, ANON!, { auth: { persistSession: false } });
    expect((await anon.rpc("note_save", { _id: null, _thread: thread, _parent: null, ...soap })).error).not.toBeNull();
  });

  it("signed notes are immutable; corrections are addenda", async () => {
    expect((await c["a"]!.rpc("note_sign", { _id: note })).error).toBeNull();
    expect((await c["a"]!.rpc("note_save", { _id: note, _thread: thread, _parent: null, ...soap })).error).not.toBeNull();
    const add = await c["a"]!.rpc("note_save", { _id: null, _thread: thread, _parent: note, ...soap });
    expect(add.error).toBeNull();
    const audit = await service.from("audit_log").select("action").eq("entity_id", note);
    expect(audit.data!.map((r) => r.action)).toEqual(expect.arrayContaining(["note_save", "note_sign"]));
  });
});
