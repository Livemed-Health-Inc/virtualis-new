import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { T, card, inputStyle, mono } from "../theme";
import { VMark } from "../ui";
import { LABELS, USE_CASES } from "@/lib/modellab/training";
import {
  HIGH_ACUITY_TARGET,
  OUTCOME_CODES,
  REVIEW_STATES,
  agreementRate,
  highAcuityProgress,
} from "@/lib/modellab/review";
import {
  exportAdjudicatedLabels,
  getReviewStats,
  listReviewQueue,
  submitVerdict,
} from "@/lib/modellab/review.functions";

/* ═══ CLINICAL REVIEW CONSOLE ══════════════════════════════════════
   A labelling and adjudication instrument, not a dashboard. Verdicts are
   structured only; the server decides what a reviewer may see, and no
   action here can mark the model validated or promote it. */

const pct = (n) => (n == null ? "—" : `${Math.round(n * 100)}%`);

const STATE_LABEL = {
  pending: "Awaiting first review",
  single_reviewed: "One review",
  disagreement: "Disagreement — needs adjudication",
  expert_reviewed: "Two reviewers agree",
  adjudicated: "Adjudicated",
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
      padding: "6px 11px",
      borderRadius: 12,
      fontSize: 12.5,
      fontWeight: 620,
      color: on ? "#fff" : T.blueDeep,
      background: on ? T.blue : T.blueSoft,
      border: "1px solid " + (on ? T.blue : "#DCE6FF"),
    }}
  >
    {children}
  </button>
);

const Stat = ({ label, value, sub }) => (
  <div style={{ ...card(), padding: 14, minWidth: 150, flex: "1 1 150px" }}>
    <div style={{ fontSize: 12, color: T.sub, fontWeight: 620 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 760, color: T.ink, marginTop: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>{sub}</div>}
  </div>
);

export default function ClinicalReview() {
  const queueFn = useServerFn(listReviewQueue);
  const statsFn = useServerFn(getReviewStats);
  const verdictFn = useServerFn(submitVerdict);
  const exportFn = useServerFn(exportAdjudicatedLabels);

  const [filters, setFilters] = useState({});
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [verdict, setVerdict] = useState({
    acuity: null,
    route_accepted: null,
    outcome_code: null,
  });

  const current = queue[0];

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [q, s] = await Promise.all([queueFn({ data: filters }), statsFn()]);
      setQueue(q);
      setStats(s);
    } catch (e) {
      setNote(
        e?.message === "Forbidden" ? "You are not a clinical reviewer." : "Queue unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }, [filters, queueFn, statsFn]);

  useEffect(() => {
    load();
  }, [load]);

  const complete =
    verdict.acuity && verdict.outcome_code && typeof verdict.route_accepted === "boolean";

  const record = async () => {
    if (!current || !complete) return;
    setBusy(true);
    setNote("");
    try {
      const r = await verdictFn({ data: { case_id: current.id, ...verdict } });
      setQueue((q) => q.slice(1));
      setVerdict({ acuity: null, route_accepted: null, outcome_code: null });
      setNote(
        `Recorded — ${STATE_LABEL[r.case.state]}${r.forwarded ? "" : " (stored locally; runtime not reachable)"}.`,
      );
      setStats(await statsFn());
    } catch (e) {
      setNote(e?.message ?? "Verdict was not recorded.");
    } finally {
      setBusy(false);
    }
  };

  const doExport = async () => {
    setBusy(true);
    try {
      const r = await exportFn();
      const url = URL.createObjectURL(new Blob([r.jsonl], { type: "application/x-ndjson" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "adjudicated-labels.jsonl";
      a.click();
      URL.revokeObjectURL(url);
      setNote(
        `Exported ${r.exported} adjudicated label(s)${r.blocked.length ? `; ${r.blocked.length} withheld by identifier screening` : ""}.`,
      );
    } catch (e) {
      setNote(e?.message ?? "Export unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const progress = useMemo(() => (stats ? highAcuityProgress(stats) : null), [stats]);

  return (
    <div style={{ padding: 22, maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <VMark size={26} />
        <div style={{ fontSize: 19, fontWeight: 780, color: T.ink }}>Clinical Review</div>
        <Link to="/model-lab" style={{ marginLeft: "auto", fontSize: 12.5, color: T.blueDeep }}>
          Model Lab
        </Link>
      </div>

      <Section
        title="Progress toward a release-grade evaluation set"
        hint="Adjudicated high-acuity cases are the number that bounds high-acuity recall. Nothing here validates or promotes a model."
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Stat
            label="Adjudicated high-acuity"
            value={`${stats?.adjudicated_high ?? 0} / ${HIGH_ACUITY_TARGET}`}
            sub={progress ? `${progress.remaining} more for ±5 points` : undefined}
          />
          <Stat label="Single reviewed" value={stats?.single_reviewed ?? 0} />
          <Stat label="Two reviewers agree" value={stats?.expert_reviewed ?? 0} />
          <Stat label="Adjudicated" value={stats?.adjudicated ?? 0} />
          <Stat label="Disagreement queue" value={stats?.disagreement ?? 0} />
          <Stat
            label="Inter-rater agreement"
            value={stats ? pct(agreementRate(stats)) : "—"}
            sub={stats ? `${stats.second_reviewed} twice-reviewed` : undefined}
          />
        </div>
        <button
          onClick={doExport}
          disabled={busy}
          style={{
            all: "unset",
            marginTop: 14,
            cursor: busy ? "not-allowed" : "pointer",
            padding: "9px 14px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 660,
            color: T.blueDeep,
            background: T.blueSoft,
            border: "1px solid #DCE6FF",
          }}
        >
          Export adjudicated labels (JSONL)
        </button>
      </Section>

      <Section
        title="Queue"
        hint="Least confident first. You never see another reviewer's verdict."
      >
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
          {LABELS.map((l) => (
            <Chip
              key={l}
              on={filters.predicted === l}
              onClick={() =>
                setFilters((f) => ({ ...f, predicted: f.predicted === l ? undefined : l }))
              }
            >
              Predicted {l}
            </Chip>
          ))}
          {REVIEW_STATES.filter((s) => s !== "adjudicated").map((s) => (
            <Chip
              key={s}
              on={filters.state === s}
              onClick={() => setFilters((f) => ({ ...f, state: f.state === s ? undefined : s }))}
            >
              {STATE_LABEL[s]}
            </Chip>
          ))}
          <select
            value={filters.use_case ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, use_case: e.target.value || undefined }))}
            style={{ ...inputStyle, width: 190 }}
          >
            <option value="">All use cases</option>
            {USE_CASES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {!current && (
          <div style={{ fontSize: 13, color: T.sub }}>
            {busy ? "Loading…" : "Nothing awaiting your review with these filters."}
          </div>
        )}

        {current && (
          <div>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 6 }}>
              {STATE_LABEL[current.state]} · {queue.length} in your queue
            </div>
            <div
              style={{
                ...card(),
                padding: 14,
                fontSize: 14,
                lineHeight: 1.5,
                color: T.ink,
                whiteSpace: "pre-wrap",
              }}
            >
              {current.message_text}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <Stat
                label="Model prediction"
                value={current.predicted_acuity}
                sub={`confidence ${pct(current.confidence)}`}
              />
              <Stat
                label="Probabilities"
                value={LABELS.map(
                  (l) => `${l[0].toUpperCase()} ${pct(current.probabilities?.[l])}`,
                ).join("  ")}
              />
              <Stat
                label="Proposed route"
                value={current.route_destination ?? "—"}
                sub={`policy ${current.policy_version ?? "—"}`}
              />
              <Stat label="Model version" value={current.model_version} />
            </div>
            <div style={{ fontFamily: mono, fontSize: 11.5, color: T.sub, marginTop: 8 }}>
              reason codes: {current.reason_codes?.join(", ") || "—"}
            </div>

            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 680, color: T.ink }}>
              Correct acuity
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 6 }}>
              {LABELS.map((l) => (
                <Chip
                  key={l}
                  on={verdict.acuity === l}
                  onClick={() => setVerdict((v) => ({ ...v, acuity: l }))}
                >
                  {l}
                </Chip>
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 680, color: T.ink }}>
              Proposed route
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 6 }}>
              <Chip
                on={verdict.route_accepted === true}
                onClick={() => setVerdict((v) => ({ ...v, route_accepted: true }))}
              >
                Accept
              </Chip>
              <Chip
                on={verdict.route_accepted === false}
                onClick={() => setVerdict((v) => ({ ...v, route_accepted: false }))}
              >
                Reject
              </Chip>
            </div>

            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 680, color: T.ink }}>
              Outcome code
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 6 }}>
              {OUTCOME_CODES.map((c) => (
                <Chip
                  key={c}
                  on={verdict.outcome_code === c}
                  onClick={() => setVerdict((v) => ({ ...v, outcome_code: c }))}
                >
                  {c.replaceAll("_", " ").toLowerCase()}
                </Chip>
              ))}
            </div>

            <button
              onClick={record}
              disabled={busy || !complete}
              style={{
                all: "unset",
                marginTop: 16,
                cursor: busy || !complete ? "not-allowed" : "pointer",
                opacity: busy || !complete ? 0.55 : 1,
                padding: "12px 18px",
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 680,
                color: "#fff",
                background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
              }}
            >
              Record verdict
            </button>
          </div>
        )}

        {note && <div style={{ marginTop: 12, fontSize: 12.5, color: T.sub }}>{note}</div>}
      </Section>
    </div>
  );
}
