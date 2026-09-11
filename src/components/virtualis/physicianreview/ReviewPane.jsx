import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { T, card, inputStyle } from "../theme";
import { ACUITY_UI, MIN_RATIONALE, SPECIALTIES, submissionProblem } from "@/lib/physicianreview/review";
import { listMyQueue, saveReview } from "@/lib/physicianreview/review.functions";

/* ═══ PHYSICIAN REVIEW ═════════════════════════════════════════════
   One assigned case at a time. Acuity is Low / Moderate / High only —
   never a number — and the reviewer sees no model label, no other
   reviewer's answer and no final label while judging. Drafts live on the
   server, so nothing clinical is ever kept in browser storage. */

const TONE = { green: T.green, amber: T.amber, red: T.red };
const empty = { acuity: null, needs_info: false, rationale: "", routes: [], no_specialty: false };
const pretty = (s) => s.replace(/_/g, " ");

const Btn = ({ on, color, children, ...rest }) => (
  <button
    {...rest}
    style={{
      all: "unset",
      cursor: "pointer",
      padding: "11px 18px",
      borderRadius: 14,
      fontSize: 14.5,
      fontWeight: 700,
      textAlign: "center",
      color: on ? "#fff" : color || T.ink,
      background: on ? color || T.blue : "#fff",
      border: `1.5px solid ${color || T.line}`,
      opacity: on ? 1 : 0.85,
    }}
  >
    {children}
  </button>
);

export default function ReviewPane() {
  const queueFn = useServerFn(listMyQueue);
  const saveFn = useServerFn(saveReview);

  const [queue, setQueue] = useState([]);
  const [i, setI] = useState(0);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const current = queue[i];

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const rows = await queueFn({ data: { include_done: false } });
      setQueue(rows);
      setI(0);
      setError("");
    } catch (e) {
      setError(e?.message === "Forbidden" ? "You are not assigned to review cases." : "Your review list could not be loaded.");
    } finally {
      setBusy(false);
      setLoaded(true);
    }
  }, [queueFn]);

  useEffect(() => {
    load();
  }, [load]);

  /* Resume whatever the server holds for this case. */
  useEffect(() => {
    if (!current) return setForm(empty);
    setForm({
      acuity: current.my_acuity ?? null,
      needs_info: !!current.my_needs_info,
      rationale: current.my_rationale ?? "",
      routes: current.my_routes ?? [],
      no_specialty: !!current.my_no_specialty_needed,
    });
    setNote("");
  }, [current]);

  const draft = useMemo(
    () => ({
      item_id: current?.item_id,
      acuity: form.acuity,
      needs_info: form.needs_info,
      rationale: form.rationale,
      routes: form.routes,
      no_specialty_needed: form.no_specialty,
      submit: true,
    }),
    [current, form],
  );
  const problem = current ? submissionProblem(draft) : "No case selected.";

  const send = async (submit) => {
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      await saveFn({ data: { ...draft, submit } });
      if (submit) {
        setQueue((q) => q.filter((_, n) => n !== i));
        setI((n) => Math.max(0, Math.min(n, queue.length - 2)));
        setNote("Review recorded.");
      } else setNote("Draft saved.");
    } catch (e) {
      setError(e?.message ?? "Could not save. Nothing was recorded.");
    } finally {
      setBusy(false);
    }
  };

  const toggleRoute = (s) =>
    setForm((f) => ({
      ...f,
      no_specialty: false,
      routes: f.routes.includes(s) ? f.routes.filter((x) => x !== s) : [...f.routes, s],
    }));

  if (loaded && !queue.length)
    return (
      <div style={{ ...card(), padding: 22, fontSize: 13.5, color: T.sub }}>
        {error || "Nothing is assigned to you yet. A coordinator assigns cases; nothing is imported automatically."}
      </div>
    );

  return (
    <div>
      {current && (
        <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 8 }}>
          Case {i + 1} of {queue.length} · {current.batch_name}
          {current.mode === "practice" && (
            <span
              style={{
                marginLeft: 8,
                padding: "2px 8px",
                borderRadius: 9,
                background: "#FFF4E5",
                color: "#B54708",
                fontWeight: 700,
                fontSize: 11.5,
              }}
            >
              Practice — excluded from all counts and export
            </span>
          )}
          {current.assignment_role === "adjudicator" && (
            <span style={{ marginLeft: 8, color: T.blueDeep, fontWeight: 660 }}>
              You are adjudicating this case
            </span>
          )}
        </div>
      )}

      {current && (
        <div style={{ ...card(), padding: 18, whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.5, color: T.ink }}>
          {current.message}
          {current.context && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.line}`, fontSize: 13.5, color: T.sub }}>
              {current.context}
            </div>
          )}
        </div>
      )}

      <div style={{ ...card(), padding: 18, marginTop: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>Acuity</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
          {Object.entries(ACUITY_UI).map(([key, v]) => (
            <Btn
              key={key}
              color={TONE[v.tone]}
              on={form.acuity === key}
              onClick={() => setForm((f) => ({ ...f, acuity: key, needs_info: false }))}
            >
              {v.label}
            </Btn>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <Btn
            on={form.needs_info}
            color={T.sub}
            onClick={() => setForm((f) => ({ ...f, needs_info: !f.needs_info, acuity: null }))}
          >
            Not enough information — no acuity
          </Btn>
        </div>

        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, marginTop: 18 }}>
          Rationale <span style={{ color: T.sub, fontWeight: 500 }}>(required, at least {MIN_RATIONALE} characters)</span>
        </div>
        <textarea
          value={form.rationale}
          onChange={(e) => setForm((f) => ({ ...f, rationale: e.target.value }))}
          rows={3}
          placeholder="Why this acuity, in one or two lines. No patient identifiers."
          style={{ ...inputStyle, marginTop: 8, resize: "vertical", fontSize: 14 }}
        />

        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, marginTop: 18 }}>
          Acceptable specialist routes <span style={{ color: T.sub, fontWeight: 500 }}>(optional)</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              onClick={() => toggleRoute(s)}
              style={{
                all: "unset",
                cursor: "pointer",
                padding: "6px 11px",
                borderRadius: 12,
                fontSize: 12.5,
                fontWeight: 620,
                textTransform: "capitalize",
                color: form.routes.includes(s) ? "#fff" : T.blueDeep,
                background: form.routes.includes(s) ? T.blue : T.blueSoft,
                border: "1px solid #DCE6FF",
              }}
            >
              {pretty(s)}
            </button>
          ))}
          <button
            onClick={() => setForm((f) => ({ ...f, no_specialty: !f.no_specialty, routes: [] }))}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "6px 11px",
              borderRadius: 12,
              fontSize: 12.5,
              fontWeight: 700,
              color: form.no_specialty ? "#fff" : T.ink,
              background: form.no_specialty ? T.ink : T.ghost,
              border: `1px solid ${T.line}`,
            }}
          >
            No specialty needed
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: T.faint, marginTop: 6 }}>
          Leaving this blank means not reviewed. “No specialty needed” is a deliberate answer.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
          <Btn on color={T.blue} disabled={busy || !current || !!problem} onClick={() => send(true)}>
            Save and next
          </Btn>
          <Btn disabled={busy || !current} onClick={() => send(false)}>
            Save draft
          </Btn>
          <span style={{ fontSize: 12.5, color: error ? T.red : T.sub }}>
            {error || note || problem || ""}
          </span>
        </div>
      </div>
    </div>
  );
}
