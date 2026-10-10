/* Virtualis Note: SOAP draft → edit → sign. Saved notes live server-side only;
   nothing is written to browser storage. */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { T, inputStyle } from "./ui";
import { draftNote, listNotes, saveNote, signNote } from "@/lib/note/note.functions";
import { SECTIONS, canSign, isRealThread } from "@/lib/note/note";

const EMPTY = { subjective: "", objective: "", assessment: "", plan: "" };
const LABEL = { subjective: "Subjective", objective: "Objective", assessment: "Assessment", plan: "Plan" };
const pick = (n) => Object.fromEntries(SECTIONS.map((s) => [s, n[s] ?? ""]));

const btn = (primary, disabled) => ({
  all: "unset",
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.5 : 1,
  fontSize: 13,
  fontWeight: 640,
  borderRadius: 18,
  padding: "8px 14px",
  background: primary ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#fff",
  color: primary ? "#fff" : T.ink,
  border: primary ? "none" : "1px solid " + T.line,
});

export default function NoteSheet({ t, onClose }) {
  const real = isRealThread(t.id);
  const [notes, setNotes] = useState([]);
  const [edit, setEdit] = useState(null); // { id, parentId, note }
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const fns = {
    draft: useServerFn(draftNote),
    list: useServerFn(listNotes),
    save: useServerFn(saveNote),
    sign: useServerFn(signNote),
  };

  const load = () =>
    real &&
    fns.list({ data: { threadId: t.id } }).then(setNotes, (e) => setStatus(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id]);

  const run = async (label, fn) => {
    setBusy(true);
    setStatus(label);
    try {
      await fn();
    } catch (e) {
      setStatus(e.message || "Something went wrong.");
      setBusy(false);
      return false;
    }
    setBusy(false);
    return true;
  };

  const aiDraft = () =>
    run("Drafting…", async () => {
      const lines = (t.msgs ?? []).map((m) => `${m.who ?? "Care team"}: ${m.text}`).filter(Boolean);
      const note = await fns.draft({ data: { threadId: t.id, lines } });
      setEdit({ id: edit?.id ?? null, parentId: edit?.parentId ?? null, note });
      setStatus("AI draft ready — review every section before saving.");
    });

  const save = () =>
    run("Saving…", async () => {
      const { id } = await fns.save({
        data: { id: edit.id, threadId: t.id, parentId: edit.parentId, note: edit.note },
      });
      setEdit({ ...edit, id });
      setStatus("Draft saved.");
      await load();
    });

  const sign = () =>
    run("Signing…", async () => {
      const { id } = await fns.save({
        data: { id: edit.id, threadId: t.id, parentId: edit.parentId, note: edit.note },
      });
      await fns.sign({ data: { id } });
      setEdit(null);
      setStatus("Note signed.");
      await load();
    });

  return (
    <div
      role="dialog"
      aria-label="Virtualis Note"
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(16,24,40,.35)", display: "flex", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(560px,100%)", height: "100%", background: T.bg ?? "#F7F8FA", overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>Virtualis Note</div>
          <button onClick={onClose} style={btn(false)}>Close</button>
        </div>
        {!real && (
          <div style={{ fontSize: 12.5, color: T.sub }}>
            Demo thread — you can try an AI draft here, but demo notes are not saved.
          </div>
        )}

        {edit ? (
          <>
            {SECTIONS.map((s) => (
              <label key={s} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 640, color: T.sub }}>
                {LABEL[s]}
                <textarea
                  value={edit.note[s]}
                  maxLength={8000}
                  rows={s === "plan" || s === "assessment" ? 5 : 4}
                  onChange={(e) => setEdit({ ...edit, note: { ...edit.note, [s]: e.target.value } })}
                  style={{ ...inputStyle, borderRadius: 12, resize: "vertical", fontWeight: 400 }}
                />
              </label>
            ))}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button disabled={busy} onClick={aiDraft} style={btn(false, busy)}>Draft with ALIS</button>
              {real && <button disabled={busy} onClick={save} style={btn(false, busy)}>Save draft</button>}
              {real && (
                <button disabled={busy || !canSign(edit.note)} onClick={sign} style={btn(true, busy || !canSign(edit.note))}>
                  Sign
                </button>
              )}
              <button disabled={busy} onClick={() => setEdit(null)} style={btn(false, busy)}>Cancel</button>
            </div>
          </>
        ) : (
          <button onClick={() => setEdit({ id: null, parentId: null, note: EMPTY })} style={{ ...btn(true), alignSelf: "flex-start" }}>
            New note
          </button>
        )}

        {status && <div role="status" style={{ fontSize: 12.5, color: T.sub }}>{status}</div>}

        {notes.map((n) => (
          <div key={n.id} style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 14, padding: 12, fontSize: 13.5, color: T.ink }}>
            <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 6 }}>
              {n.status === "signed" ? `Signed ${new Date(n.signed_at).toLocaleString()}` : "Your draft"}
              {n.parent_note_id ? " · Addendum" : ""}
            </div>
            {SECTIONS.map((s) => n[s] && (
              <p key={s} style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>
                <b>{LABEL[s]}:</b> {n[s]}
              </p>
            ))}
            <div style={{ marginTop: 8 }}>
              {n.status === "draft" && n.mine && (
                <button onClick={() => setEdit({ id: n.id, parentId: n.parent_note_id, note: pick(n) })} style={btn(false)}>Resume</button>
              )}
              {n.status === "signed" && (
                <button onClick={() => setEdit({ id: null, parentId: n.id, note: EMPTY })} style={btn(false)}>Add addendum</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
