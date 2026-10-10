import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { throttle } from "@/lib/modellab/guards";
import {
  NOTE_INSTRUCTIONS,
  SOAP_JSON_SCHEMA,
  clampSoap,
  screenLines,
  soapSchema,
  transcriptSchema,
  type Soap,
} from "./note";

const uuid = z.string().uuid();
const PHI_REFUSED =
  "AI drafting is not enabled for live hospital threads yet. Write the note manually, or try a demo thread.";

/** AI draft from a demo transcript. Live threads are refused until PHI coverage
    is confirmed and NOTE_PHI_ENABLED is set; identifiers are refused always. */
export const draftNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ threadId: z.union([uuid, z.number()]), lines: transcriptSchema })
      .strict()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (typeof data.threadId === "string" && process.env["NOTE_PHI_ENABLED"] !== "true")
      throw new Error(PHI_REFUSED);
    if (screenLines(data.lines).length)
      throw new Error("The conversation contains possible patient identifiers and was not sent.");
    await throttle(context.userId, "note_draft", {
      limit: 20,
      windowSeconds: 3600,
      lockSeconds: 600,
    });
    const { completeJson } = await import("./ai.server");
    const raw = await completeJson<Soap>(
      NOTE_INSTRUCTIONS,
      [{ role: "user", content: data.lines.join("\n") }],
      "soap_note",
      SOAP_JSON_SCHEMA,
    );
    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit(context.userId, {
      action: "note_ai_draft",
      entity_type: "clinical_note",
      entity_id: typeof data.threadId === "string" ? data.threadId : null,
    });
    return clampSoap(raw);
  });

export const listNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ threadId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("clinical_notes")
      .select(
        "id,parent_note_id,status,subjective,objective,assessment,plan,author_id,signed_at,updated_at",
      )
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Notes could not be loaded.");
    return rows.map((r) => ({ ...r, mine: r.author_id === context.userId }));
  });

export const saveNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ id: uuid.nullable(), threadId: uuid, parentId: uuid.nullable(), note: soapSchema })
      .strict()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await throttle(context.userId, "note_save", {
      limit: 120,
      windowSeconds: 3600,
      lockSeconds: 300,
    });
    const { note } = data;
    const { data: id, error } = await context.supabase.rpc("note_save", {
      _id: data.id as string,
      _thread: data.threadId,
      _parent: data.parentId as string,
      _s: note.subjective,
      _o: note.objective,
      _a: note.assessment,
      _p: note.plan,
    });
    if (error || !id) throw new Error("The note could not be saved.");
    return { id };
  });

export const signNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("note_sign", { _id: data.id });
    if (error) throw new Error("The note could not be signed. Assessment or plan is required.");
    return { ok: true };
  });
