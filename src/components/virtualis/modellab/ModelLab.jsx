import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { T, font, mono, card, inputStyle, KEYFRAMES } from "../theme";
import { VMark } from "../ui";
import {
  assignSplits,
  buildExamples,
  datasetStats,
  exportJsonl,
  parseRecords,
} from "@/lib/modellab/training";
import { getModelInfo, runDecision, stageTrainingBatch } from "@/lib/modellab/acuity.functions";

/* ═══ VIRTUALIS® MODEL LAB ════════════════════════════════════════
   Engineering surface for the acuity model. Synthetic or approved
   deidentified data only — nothing here is production-validated and
   nothing here retrains or promotes the live model. */

const SCALE = "Scale: 1 = low · 2–3 = moderate · 4–5 = high";

const SAMPLES = {
  low: "Synthetic: patient asks whether to take their evening statin with food. No symptoms reported.",
  moderate:
    "Synthetic: post-op day 3 knee replacement, incision warm with mild drainage, temp 100.2F, ambulating.",
  high: "Synthetic: 68yo with crushing substernal chest pain radiating to left arm, diaphoretic, BP 84/52.",
};

const SELECTS = {
  care_setting: ["ed", "inpatient", "clinic", "telehealth", "home"],
  sender_role: ["patient", "nurse", "provider", "device"],
  use_case: ["triage", "routing", "escalation", "quality_review"],
};

const Section = ({ title, hint, children, style }) => (
  <div style={{ ...card(), padding: 18, marginBottom: 14, ...style }}>
    <div style={{ fontSize: 15.5, fontWeight: 720, color: T.ink }}>{title}</div>
    {hint && <div style={{ fontSize: 12.5, color: T.sub, marginTop: 4 }}>{hint}</div>}
    <div style={{ marginTop: 14 }}>{children}</div>
  </div>
);

const Chip = ({ on, children, ...rest }) => (
  <button
    {...rest}
    style={{
      all: "unset",
      cursor: "pointer",
      padding: "7px 12px",
      borderRadius: 12,
      fontSize: 12.5,
      fontWeight: 620,
      whiteSpace: "nowrap",
      color: on ? "#fff" : T.blueDeep,
      background: on ? T.blue : T.blueSoft,
      border: "1px solid " + (on ? T.blue : "#DCE6FF"),
    }}
  >
    {children}
  </button>
);

const Primary = ({ children, ...rest }) => (
  <button
    {...rest}
    style={{
      all: "unset",
      cursor: rest.disabled ? "not-allowed" : "pointer",
      opacity: rest.disabled ? 0.55 : 1,
      textAlign: "center",
      padding: "12px 18px",
      borderRadius: 14,
      fontSize: 14,
      fontWeight: 680,
      color: "#fff",
      background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
    }}
  >
    {children}
  </button>
);

const Ghost = ({ children, ...rest }) => (
  <button
    {...rest}
    style={{
      all: "unset",
      cursor: "pointer",
      padding: "11px 15px",
      borderRadius: 14,
      fontSize: 13.5,
      fontWeight: 640,
      color: T.blueDeep,
      border: "1px solid " + T.line,
      background: "#fff",
    }}
  >
    {children}
  </button>
);

const Field = ({ label, children }) => (
  <label style={{ display: "grid", gap: 6 }}>
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.faint }}>
      {label.toUpperCase()}
    </span>
    {children}
  </label>
);

const KV = ({ k, v }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" }}>
    <span style={{ fontSize: 12.5, color: T.sub }}>{k}</span>
    <span style={{ fontSize: 12.5, fontWeight: 640, color: T.ink, fontFamily: mono }}>
      {v ?? "—"}
    </span>
  </div>
);

const ValidationBanner = () => (
  <div
    style={{
      display: "flex",
      gap: 10,
      background: "#FFF7E6",
      border: "1px solid #FCE3B0",
      borderRadius: 16,
      padding: "12px 14px",
      marginBottom: 14,
    }}
  >
    <span style={{ width: 4, borderRadius: 2, background: T.amber, flexShrink: 0 }} />
    <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "#7A4A05" }}>
      <strong>Engineering validation — human review required.</strong> clinically_validated =
      false. Output is not production-ready, is not medical advice, and must not drive patient
      care. Use synthetic or approved deidentified data only.
    </div>
  </div>
);

const PROB_COLOR = { low: T.green, medium: T.amber, high: T.red };

function ProbBar({ label, value }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
        <span style={{ color: T.sub, textTransform: "capitalize" }}>{label}</span>
        <span style={{ fontFamily: mono, fontWeight: 660, color: T.ink }}>{pct}%</span>
      </div>
      <div
        style={{ height: 8, borderRadius: 6, background: T.ghost, marginTop: 5, overflow: "hidden" }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 6,
            background: PROB_COLOR[label] || T.blue,
          }}
        />
      </div>
    </div>
  );
}

/* ── Tab 1: test model ─────────────────────────────────────────── */
function TestModel() {
  const decide = useServerFn(runDecision);
  const info = useServerFn(getModelInfo);
  const [form, setForm] = useState({
    text: SAMPLES.moderate,
    care_setting: "inpatient",
    sender_role: "nurse",
    use_case: "triage",
    specialty_hint: "",
  });
  const [state, setState] = useState({ busy: false, result: null, error: null, info: null });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const run = async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      const [result, meta] = await Promise.all([
        decide({ data: { ...form, specialty_hint: form.specialty_hint || undefined } }),
        info().catch(() => null),
      ]);
      setState({ busy: false, result, error: null, info: meta });
    } catch (e) {
      setState((s) => ({
        ...s,
        busy: false,
        error: e?.message?.includes("not configured")
          ? "Model runtime is not configured for this environment."
          : "Analysis failed. Check the runtime connection and try again.",
      }));
    }
  };

  const r = state.result || {};
  const probs = r.probabilities || r.class_probabilities || {};
  const routing = r.routing || {};

  return (
    <>
      <ValidationBanner />
      <Section title="Synthetic input" hint={SCALE}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {Object.entries(SAMPLES).map(([k, v]) => (
            <Chip key={k} onClick={() => set("text", v)} on={form.text === v}>
              Example · {k}
            </Chip>
          ))}
        </div>
        <textarea
          value={form.text}
          onChange={(e) => set("text", e.target.value)}
          rows={5}
          placeholder="Synthetic clinical message — never paste real patient data"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          {Object.entries(SELECTS).map(([k, opts]) => (
            <Field key={k} label={k.replace("_", " ")}>
              <select value={form[k]} onChange={(e) => set(k, e.target.value)} style={inputStyle}>
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <Field label="Specialty hint">
            <input
              value={form.specialty_hint}
              onChange={(e) => set("specialty_hint", e.target.value)}
              placeholder="e.g. cardiology"
              style={inputStyle}
            />
          </Field>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <Primary onClick={run} disabled={state.busy || !form.text.trim()}>
            {state.busy ? "Analyzing…" : "Run analysis"}
          </Primary>
          {state.error && <span style={{ fontSize: 12.5, color: T.red }}>{state.error}</span>}
        </div>
      </Section>

      {state.result && (
        <Section
          title="Decision"
          hint="Engineering output · human review required before any clinical use"
          style={{ animation: "rise .25s ease" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, marginBottom: 10 }}>
                CLASS PROBABILITIES
              </div>
              {["low", "medium", "high"].map((c) => (
                <ProbBar key={c} label={c} value={probs[c]} />
              ))}
              <div style={{ fontSize: 11.5, color: T.faint, marginTop: 6 }}>{SCALE}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, marginBottom: 4 }}>
                ROUTING & GOVERNANCE
              </div>
              <KV k="Predicted class" v={r.label || r.predicted_label} />
              <KV
                k="Review required"
                v={r.review_required === false ? "no" : "yes — human review"}
              />
              <KV k="Model version" v={r.model_version} />
              <KV k="Policy version" v={r.policy_version} />
              <KV k="Destination" v={routing.destination} />
              <KV k="Service line" v={routing.service_line} />
              <KV k="Priority" v={routing.priority} />
              <KV k="Fallback" v={routing.fallback} />
              <KV
                k="Clinically validated"
                v={r.clinically_validated ? "true" : "false — engineering only"}
              />
              {state.info?.info?.model_version && (
                <KV k="Runtime model" v={state.info.info.model_version} />
              )}
            </div>
          </div>
        </Section>
      )}
    </>
  );
}

/* ── Tab 2: training data ──────────────────────────────────────── */
function TrainingData() {
  const stage = useServerFn(stageTrainingBatch);
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [batchLabel, setBatchLabel] = useState("synthetic-batch-01");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const stats = useMemo(() => datasetStats(rows), [rows]);

  const load = async (file) => {
    try {
      const text = await file.text();
      setRows(assignSplits(buildExamples(parseRecords(text))));
      setMsg({ tone: "ok", text: `Imported ${file.name}` });
    } catch {
      setMsg({ tone: "bad", text: "Could not parse that file. Expected CSV or JSONL." });
    }
  };

  const patch = (id, next) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...next } : r)));

  const download = () => {
    const { jsonl, blocked } = exportJsonl(rows);
    if (!jsonl) {
      setMsg({
        tone: "bad",
        text: "Export blocked: " + blocked.map((b) => `${b.reason} (${b.ids.length})`).join(", "),
      });
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([jsonl], { type: "application/jsonl" }));
    a.download = `${batchLabel}.jsonl`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg({ tone: "ok", text: `Exported ${jsonl.split("\n").length} approved examples` });
  };

  const send = async () => {
    const { jsonl, blocked } = exportJsonl(rows);
    if (!jsonl) {
      setMsg({
        tone: "bad",
        text: "Staging blocked: " + blocked.map((b) => `${b.reason} (${b.ids.length})`).join(", "),
      });
      return;
    }
    setBusy(true);
    try {
      const res = await stage({
        data: {
          batch_label: batchLabel,
          provenance: "synthetic_or_approved_deidentified",
          examples: jsonl.split("\n").map((l) => JSON.parse(l)),
        },
      });
      setMsg({
        tone: "ok",
        text: `Staged ${res.example_count} examples · batch ${res.batch_id} · state ${res.state} · sha256 ${String(res.sha256).slice(0, 12)}… · no retraining triggered`,
      });
    } catch {
      setMsg({ tone: "bad", text: "Staging failed. The live model was not modified." });
    }
    setBusy(false);
  };

  return (
    <>
      <ValidationBanner />
      <Section
        title="Import dataset"
        hint="CSV or JSONL with text and label columns. Labels normalize 1 → low, 2–3 → medium, 4–5 → high."
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.jsonl,.json,.txt"
            onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
            style={{ display: "none" }}
          />
          <Primary onClick={() => fileRef.current?.click()}>Import CSV or JSONL</Primary>
          <input
            value={batchLabel}
            onChange={(e) => setBatchLabel(e.target.value)}
            aria-label="Batch label"
            style={{ ...inputStyle, width: 220 }}
          />
          {rows.length > 0 && (
            <>
              <Ghost onClick={() => setRows((rs) => assignSplits(rs))}>Reassign splits</Ghost>
              <Ghost onClick={download}>Export JSONL</Ghost>
              <Ghost onClick={send} disabled={busy}>
                {busy ? "Staging…" : "Stage batch"}
              </Ghost>
            </>
          )}
        </div>
        {msg && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12.5,
              fontWeight: 600,
              color: msg.tone === "ok" ? T.green : T.red,
            }}
          >
            {msg.text}
          </div>
        )}
        <div style={{ fontSize: 11.5, color: T.faint, marginTop: 10 }}>
          Staging stores a governed batch for review. It never retrains or promotes the live model.
        </div>
      </Section>

      {rows.length > 0 && (
        <>
          <Section title="Dataset summary">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                gap: 10,
              }}
            >
              {[
                ["Examples", stats.total],
                ["Included", stats.included],
                ["Approved", stats.approved],
                ["Duplicates", stats.duplicates],
                ["Flagged", stats.flagged],
                ["Low", stats.labels.low],
                ["Moderate", stats.labels.medium],
                ["High", stats.labels.high],
                ["Train", stats.splits.train],
                ["Validation", stats.splits.validation],
                ["Test", stats.splits.test],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    background: T.blueSoft,
                    border: "1px solid #DCE6FF",
                    borderRadius: 16,
                    padding: "12px 0",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 19, fontWeight: 720, color: T.blueDeep }}>{v}</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{k}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Review & approve" hint="Nothing exports or stages until it is approved.">
            <div style={{ display: "grid", gap: 10 }}>
              {rows.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid " + (r.warnings.length ? "#FCE3B0" : T.line),
                    background: r.include ? "#fff" : "#FAFBFC",
                    borderRadius: 16,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontFamily: mono, fontSize: 11.5, color: T.faint }}>{r.id}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: PROB_COLOR[r.label] || T.faint,
                      }}
                    >
                      {r.label ? r.label.toUpperCase() : "UNLABELED"}
                      {r.rawLabel ? ` · raw ${r.rawLabel}` : ""}
                    </span>
                    {r.duplicateOf && (
                      <span style={{ fontSize: 11, color: T.sub }}>duplicate of {r.duplicateOf}</span>
                    )}
                    <span style={{ fontSize: 11, color: T.sub }}>group {r.groupId}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: T.ink, margin: "8px 0", lineHeight: 1.5 }}>
                    {r.text || <em style={{ color: T.faint }}>empty</em>}
                  </div>
                  {r.warnings.length > 0 && (
                    <div style={{ fontSize: 12, color: "#7A4A05", marginBottom: 8 }}>
                      ⚠ {r.warnings.join(" · ")} — remove or redact before approval
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Chip on={r.include} onClick={() => patch(r.id, { include: !r.include })}>
                      {r.include ? "Included" : "Excluded"}
                    </Chip>
                    <Chip
                      on={r.approved}
                      onClick={() => patch(r.id, { approved: !r.approved })}
                      disabled={r.warnings.length > 0}
                    >
                      {r.approved ? "Approved" : "Approve"}
                    </Chip>
                    {["low", "medium", "high"].map((l) => (
                      <Chip key={l} on={r.label === l} onClick={() => patch(r.id, { label: l })}>
                        {l}
                      </Chip>
                    ))}
                    {["train", "validation", "test"].map((s) => (
                      <Chip key={s} on={r.split === s} onClick={() => patch(r.id, { split: s })}>
                        {s}
                      </Chip>
                    ))}
                    {["good", "needs_work"].map((q) => (
                      <Chip key={q} on={r.quality === q} onClick={() => patch(r.id, { quality: q })}>
                        {q.replace("_", " ")}
                      </Chip>
                    ))}
                    {["self_serve", "nurse_line", "provider", "escalate"].map((rt) => (
                      <Chip
                        key={rt}
                        on={r.routeLabel === rt}
                        onClick={() => patch(r.id, { routeLabel: rt })}
                      >
                        {rt.replace("_", " ")}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </>
  );
}

export default function ModelLab() {
  const [tab, setTab] = useState("test");
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: T.bg,
        fontFamily: font,
        color: T.ink,
      }}
    >
      <style>{KEYFRAMES}</style>
      <header
        style={{
          background: "linear-gradient(135deg,#0E1A3E,#12275E)",
          color: "#fff",
          padding: "18px clamp(16px,4vw,40px)",
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <VMark size={30} mono />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 17, fontWeight: 740, letterSpacing: -0.4 }}>
              Virtualis<span style={{ fontSize: 9, verticalAlign: "super" }}>®</span> Model Lab
            </div>
            <div style={{ fontSize: 12, color: "#AFC6FF" }}>
              Acuity model evaluation and governed training data
            </div>
          </div>
          <Link
            to="/"
            style={{
              fontSize: 13,
              fontWeight: 640,
              color: "#fff",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,.25)",
              borderRadius: 12,
              padding: "8px 13px",
            }}
          >
            Back to workstation
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "18px clamp(12px,4vw,40px) 60px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            ["test", "Test model"],
            ["data", "Training data"],
          ].map(([k, label]) => (
            <Chip key={k} on={tab === k} onClick={() => setTab(k)}>
              {label}
            </Chip>
          ))}
        </div>
        {tab === "test" ? <TestModel /> : <TrainingData />}
      </div>
    </div>
  );
}
