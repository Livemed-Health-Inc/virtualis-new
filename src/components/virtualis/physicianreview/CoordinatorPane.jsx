import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { T, card, inputStyle } from "../theme";
import { STATE_LABEL, completionRate, parseImport } from "@/lib/physicianreview/review";
import {
  assignAdjudicator,
  assignPair,
  exportBatch,
  getOverview,
  importBatch,
  listBatches,
  listItems,
  listPhysicians,
  setExportApproval,
  setItemTrainingUse,
} from "@/lib/physicianreview/review.functions";


/* ═══ COORDINATION ═════════════════════════════════════════════════
   Import, assign two distinct physicians, adjudicate disagreements and
   export approved labels. Nothing is imported automatically, no email is
   ever sent, and practice data is counted and exported separately —
   which is to say, never. */

const Section = ({ title, hint, children }) => (
  <div style={{ ...card(), padding: 18, marginBottom: 14 }}>
    <div style={{ fontSize: 15.5, fontWeight: 720, color: T.ink }}>{title}</div>
    {hint && <div style={{ fontSize: 12.5, color: T.sub, marginTop: 4 }}>{hint}</div>}
    <div style={{ marginTop: 14 }}>{children}</div>
  </div>
);

const Stat = ({ label, value, sub }) => (
  <div style={{ ...card(), padding: 13, minWidth: 130, flex: "1 1 130px" }}>
    <div style={{ fontSize: 11.5, color: T.sub, fontWeight: 620 }}>{label}</div>
    <div style={{ fontSize: 23, fontWeight: 760, color: T.ink, marginTop: 3 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.faint }}>{sub}</div>}
  </div>
);

const Action = ({ children, tone, ...rest }) => (
  <button
    {...rest}
    style={{
      all: "unset",
      cursor: rest.disabled ? "not-allowed" : "pointer",
      padding: "9px 14px",
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 660,
      opacity: rest.disabled ? 0.5 : 1,
      color: tone === "primary" ? "#fff" : T.blueDeep,
      background: tone === "primary" ? T.blue : T.blueSoft,
      border: "1px solid #DCE6FF",
    }}
  >
    {children}
  </button>
);

export default function CoordinatorPane() {
  const fns = {
    overview: useServerFn(getOverview),
    items: useServerFn(listItems),
    batches: useServerFn(listBatches),
    physicians: useServerFn(listPhysicians),
    import: useServerFn(importBatch),
    assign: useServerFn(assignPair),
    adjudicator: useServerFn(assignAdjudicator),
    approve: useServerFn(setExportApproval),
    rowApprove: useServerFn(setItemTrainingUse),
    export: useServerFn(exportBatch),
  };


  const [overview, setOverview] = useState(null);
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [physicians, setPhysicians] = useState([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState([]);
  const [pair, setPair] = useState({ a: "", b: "" });
  const [adjudicator, setAdj] = useState("");
  const [imp, setImp] = useState({ name: "", mode: "clinical", text: "" });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [o, it, b] = await Promise.all([
        fns.overview(),
        fns.items({ data: filter ? { state: filter } : {} }),
        fns.batches(),
      ]);
      setOverview(o);
      setItems(it);
      setBatches(b);
      setError("");
    } catch (e) {
      setError(e?.message === "Forbidden" ? "Coordination is limited to administrators." : "Could not load progress.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    fns.physicians().then(setPhysicians).catch(() => setPhysicians([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (label, fn) => {
    setBusy(true);
    setError("");
    try {
      const r = await fn();
      setNote(label(r));
      await refresh();
    } catch (e) {
      setError(e?.message ?? "That did not go through.");
    } finally {
      setBusy(false);
    }
  };

  const parsed = imp.text.trim() ? parseImport(imp.text) : null;

  const doImport = () =>
    run(
      (r) => `Imported ${r.imported} row(s).`,
      () =>
        fns.import({
          data: {
            name: imp.name.trim(),
            mode: imp.mode,
            facility_id: null,
            rows: parsed.rows,
          },
        }),
    );

  const doExport = (batchId) =>
    run(
      (r) => {
        const url = URL.createObjectURL(new Blob([r.jsonl], { type: "application/x-ndjson" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = "approved-labels.jsonl";
        a.click();
        URL.revokeObjectURL(url);
        return `Exported ${r.exported} approved label(s)${r.blocked.length ? `; ${r.blocked.length} withheld by identifier screening` : ""}.`;
      },
      () => fns.export({ data: { batch_id: batchId } }),
    );

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const disagreements = items.filter((i) => i.state === "disagreement");
  const c = overview?.clinical;

  return (
    <div>
      <Section
        title="Progress"
        hint="Clinical counts only. Practice cases are tracked separately and never enter these numbers or an export."
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Stat label="Clinical cases" value={c?.total ?? 0} sub={`${Math.round((overview ? completionRate(overview) : 0) * 100)}% resolved`} />
          <Stat label="Not yet reviewed" value={c?.unreviewed ?? 0} />
          <Stat label="One review" value={c?.in_review ?? 0} />
          <Stat label="Two agree" value={c?.agreed ?? 0} />
          <Stat label="Disagreement" value={c?.disagreement ?? 0} />
          <Stat label="Adjudicated" value={c?.adjudicated ?? 0} />
          <Stat label="Not enough info" value={c?.needs_info ?? 0} />
          <Stat label="Practice (isolated)" value={overview?.practice?.total ?? 0} />
          <Stat label="Hidden from you" value={overview?.blinded ?? 0} sub="Cases you owe a review on" />

        </div>
        <div style={{ fontSize: 12, color: T.sub, marginTop: 10 }}>
          Refreshes automatically. {error && <span style={{ color: T.red }}>{error}</span>}
        </div>
      </Section>

      <Section title="Get physicians to the page" hint="Send this link however you normally reach them. This app sends no email or invitation.">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <code style={{ fontSize: 12.5, color: T.sub }}>
            {typeof window !== "undefined" ? `${window.location.origin}/physician-review` : "/physician-review"}
          </code>
          <Action
            onClick={() => {
              navigator.clipboard?.writeText(`${window.location.origin}/physician-review`);
              setNote("Link copied. The physician must already have an account and the reviewer role.");
            }}
          >
            Copy link
          </Action>
        </div>
      </Section>

      <Section
        title="Import a batch"
        hint="Reviewer JSONL. Imported labels and reviewer identities are discarded, not used to prefill anything; per-row flags are kept exactly as written."
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <input
            value={imp.name}
            onChange={(e) => setImp((s) => ({ ...s, name: e.target.value }))}
            placeholder="Batch name"
            style={{ ...inputStyle, width: 240 }}
          />
          <select value={imp.mode} onChange={(e) => setImp((s) => ({ ...s, mode: e.target.value }))} style={{ ...inputStyle, width: 220 }}>
            <option value="clinical">Clinical</option>
            <option value="practice">Practice (isolated, never exported)</option>
          </select>
          <input
            type="file"
            accept=".jsonl,.json,.txt"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              setImp((s) => ({ ...s, text }));
            }}
            style={{ fontSize: 12.5 }}
          />
        </div>
        <textarea
          value={imp.text}
          onChange={(e) => setImp((s) => ({ ...s, text: e.target.value }))}
          rows={4}
          placeholder='{"record_id":"r1","message":"…","deidentification_reviewed":true}'
          style={{ ...inputStyle, resize: "vertical", fontSize: 12.5 }}
        />
        {parsed && (
          <div style={{ fontSize: 12.5, color: T.sub, marginTop: 8 }}>
            {parsed.rows.length} row(s) ready
            {parsed.rejected.length ? `, ${parsed.rejected.length} refused` : ""}
            {parsed.discardedFields.length ? ` · discarded from the file: ${parsed.discardedFields.join(", ")}` : ""}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Action tone="primary" disabled={busy || !imp.name.trim() || !parsed?.rows.length} onClick={doImport}>
            Import batch
          </Action>
        </div>
      </Section>

      <Section title="Assign" hint="Two distinct physicians who already hold the reviewer role. Both must have access to the batch facility.">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          {["a", "b"].map((k) => (
            <select key={k} value={pair[k]} onChange={(e) => setPair((p) => ({ ...p, [k]: e.target.value }))} style={{ ...inputStyle, width: 240 }}>
              <option value="">{k === "a" ? "First reviewer" : "Second reviewer"}</option>
              {physicians.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ))}
          <Action
            tone="primary"
            disabled={busy || !pair.a || !pair.b || pair.a === pair.b || !selected.length}
            onClick={() =>
              run(
                (r) => `Assigned ${r.assigned} case(s).`,
                () => fns.assign({ data: { item_ids: selected, reviewer_a: pair.a, reviewer_b: pair.b } }),
              )
            }
          >
            Assign {selected.length || ""} selected
          </Action>
          {/* Training use is attested for the named rows only; the imported
              privacy flags are never touched by this control. */}
          {[true, false].map((v) => (
            <Action
              key={String(v)}
              disabled={busy || !selected.length}
              onClick={() =>
                run(
                  (r) => `Training use ${v ? "approved" : "withdrawn"} for ${r.updated} row(s).`,
                  () => fns.rowApprove({ data: { item_ids: selected, approved: v } }),
                )
              }
            >
              {v ? "Approve selected for training use" : "Withdraw training use"}
            </Action>
          ))}
        </div>

        {!physicians.length && (
          <div style={{ fontSize: 12.5, color: T.sub }}>
            No accounts hold the clinical reviewer role yet. Tell me who should, and I will grant it.
          </div>
        )}

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "12px 0" }}>
          {["", "unreviewed", "in_review", "agreed", "disagreement", "needs_info", "adjudicated"].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setFilter(s)}
              style={{
                all: "unset",
                cursor: "pointer",
                padding: "5px 10px",
                borderRadius: 11,
                fontSize: 12,
                fontWeight: 620,
                color: filter === s ? "#fff" : T.blueDeep,
                background: filter === s ? T.blue : T.blueSoft,
              }}
            >
              {s ? STATE_LABEL[s] : "All"}
            </button>
          ))}
        </div>

        {!items.length && <div style={{ fontSize: 13, color: T.sub }}>No cases yet. Import a batch to begin.</div>}
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {items.map((it) => (
            <label
              key={it.item_id}
              style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${T.line}`, cursor: "pointer" }}
            >
              <input type="checkbox" checked={selected.includes(it.item_id)} onChange={() => toggle(it.item_id)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.message}
                </div>
                <div style={{ fontSize: 11.5, color: T.sub }}>
                  {it.record_id} · {it.batch_name} ·{" "}
                  {it.blinded
                    ? "Hidden until you record your own review"
                    : `${STATE_LABEL[it.state] ?? it.state} · ${it.submitted ?? 0} submitted`}
                  {it.mode === "practice" && " · practice"}
                  {it.split && it.split !== "unassigned" && ` · ${it.split}`}
                  {" · privacy "}
                  {it.privacy_reviewed ? "reviewed" : "not reviewed"}
                  {" · training use "}
                  {it.training_use_approved ? "approved" : "not approved"}
                </div>

              </div>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Disagreements" hint="A third physician who has not reviewed the case records the deciding answer.">
        {!disagreements.length && <div style={{ fontSize: 13, color: T.sub }}>Nothing awaiting adjudication.</div>}
        {!!disagreements.length && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <select value={adjudicator} onChange={(e) => setAdj(e.target.value)} style={{ ...inputStyle, width: 240 }}>
              <option value="">Adjudicating physician</option>
              {physicians.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {disagreements.map((it) => (
          <div key={it.item_id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
            <div style={{ flex: 1, fontSize: 13, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {it.record_id} — {it.message}
            </div>
            <Action
              disabled={busy || !adjudicator}
              onClick={() =>
                run(
                  () => "Adjudicator assigned.",
                  () => fns.adjudicator({ data: { item_id: it.item_id, reviewer_id: adjudicator } }),
                )
              }
            >
              Assign adjudicator
            </Action>
          </div>
        ))}
      </Section>

      <Section
        title="Export"
        hint="Batch attestations are recorded exactly as you set them, and each row must also be privacy reviewed and approved for training use before it can leave. Nothing here retrains or promotes a model."
      >
        {!batches.length && <div style={{ fontSize: 13, color: T.sub }}>No batches yet.</div>}
        {batches.map((b) => {
          const ap = b.approval ?? {};
          const set = (patch) =>
            run(
              () => "Attestations saved.",
              () =>
                fns.approve({
                  data: {
                    batch_id: b.id,
                    clinical_approved: !!ap.clinical_approved,
                    privacy_reviewed: !!ap.privacy_reviewed,
                    training_use_approved: !!ap.training_use_approved,
                    ...patch,
                  },
                }),
            );
          const ready = ap.clinical_approved && ap.privacy_reviewed && ap.training_use_approved;
          return (
            <div key={b.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.line}` }}>
              <div style={{ fontSize: 13.5, fontWeight: 660, color: T.ink }}>
                {b.name} <span style={{ color: T.sub, fontWeight: 500 }}>· {b.mode}</span>
              </div>
              {b.mode === "clinical" ? (
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                  {[
                    ["clinical_approved", "Clinical approval"],
                    ["privacy_reviewed", "Privacy review"],
                    ["training_use_approved", "Training-use approval"],
                  ].map(([key, label]) => (
                    <label key={key} style={{ fontSize: 12.5, color: T.ink, display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="checkbox" checked={!!ap[key]} onChange={(e) => set({ [key]: e.target.checked })} />
                      {label}
                    </label>
                  ))}
                  <Action tone="primary" disabled={busy || !ready} onClick={() => doExport(b.id)}>
                    Export approved labels
                  </Action>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: T.sub, marginTop: 4 }}>
                  Practice batch — isolated from clinical counts and never exportable.
                </div>
              )}
            </div>
          );
        })}
      </Section>

      {(note || error) && (
        <div style={{ fontSize: 12.5, color: error ? T.red : T.sub, paddingBottom: 18 }}>{error || note}</div>
      )}
    </div>
  );
}
