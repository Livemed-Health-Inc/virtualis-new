import { useEffect, useRef, useState } from "react";
import { T, mono, inputStyle, VMark } from "./ui";

/* Deterministic on-device demo assistant. No network call — the
   prototype must never leak PHI to a third-party endpoint. */
const PLAYBOOK = [
  { k: ["sepsis", "lactate", "culture", "infection"], a: "For suspected sepsis: draw lactate and two sets of blood cultures before antibiotics, start broad-spectrum coverage within the first hour, and give 30 mL/kg crystalloid if hypotensive or lactate ≥ 4. Reassess perfusion at 3 hours. Want me to draft a Critical consult to Infectious Diseases?" },
  { k: ["chest pain", "troponin", "stemi", "ecg", "cardio"], a: "Chest pain workup: 12-lead within 10 minutes, serial troponins at 0 and 2 hours, and continuous telemetry. Anterior ST elevation with a rising troponin should activate the cath lab. I can page the on-call cardiologist as Critical." },
  { k: ["copd", "asthma", "o2", "oxygen", "vent"], a: "For COPD exacerbation: titrate to SpO2 88–92%, bronchodilators q4–6h, systemic steroids for 5 days, and consider NIV if pH < 7.35 with hypercapnia. Spacing nebs is reasonable once the O2 requirement is stable." },
  { k: ["discharge", "summary", "co-sign", "note"], a: "I can draft the discharge summary from the thread: presenting complaint, hospital course, medication changes, and follow-up. It will queue for your co-sign — nothing is filed to the chart until you sign it." },
  { k: ["telehealth", "video", "visit"], a: "Telehealth visits open a secure, HIPAA-compliant room. I capture the encounter transcript and draft the note in SOAP format for your review at the end of the visit." },
  { k: ["acuity", "triage", "route", "glyph"], a: "Acuity Routing™ grades every message: three red bars Critical (5-minute SLA), two amber Urgent (30 minutes), one green Routine (4 hours). Unacknowledged Critical consults auto-escalate to the backup on-call." },
];

function reply(text) {
  const s = text.toLowerCase();
  const hit = PLAYBOOK.find((p) => p.k.some((k) => s.includes(k)));
  if (hit) return hit.a;
  if (s.includes("?")) return "I can help with clinical reference, acuity guidance, consult drafting, and encounter notes. Tell me the presenting problem and I'll outline a workup — the clinical decision stays with you.";
  return "Noted. Give me the presenting problem, vitals trend, or the specialty you need and I'll suggest an acuity and draft the consult for your review.";
}

const SUGGESTIONS = ["Sepsis bundle timing?", "Draft a cardiology consult", "How does acuity routing work?"];

export default function Alis({ compact }) {
  const [msgs, setMsgs] = useState([{ me: false, text: "Hello, Dr. Hussain — I'm ALIS AI™, the clinical assistant inside Virtualis®. Ask me about a workup, draft a consult, or have me summarize a telehealth encounter." }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = (preset) => {
    const text = (preset ?? draft).trim();
    if (!text || busy) return;
    setMsgs((m) => [...m, { me: true, text }]);
    setDraft(""); setBusy(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { me: false, text: reply(text) }]);
      setBusy(false);
    }, 750);
  };

  const Bubble = ({ m }) => (
    <div style={{ alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "min(84%, 620px)", display: "flex", gap: 8, alignItems: "flex-end" }}>
      {!m.me && <span style={{ width: 28, height: 28, borderRadius: 14, background: "linear-gradient(135deg,#2E5CD6,#0F1E52)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><VMark size={15} mono /></span>}
      <div style={{ background: m.me ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#fff", color: m.me ? "#fff" : T.ink, border: m.me ? "none" : "1px solid " + T.line, borderRadius: m.me ? "20px 20px 6px 20px" : "20px 20px 20px 6px", padding: "11px 15px", fontSize: 14.5, lineHeight: 1.5, whiteSpace: "pre-wrap", boxShadow: m.me ? "0 6px 16px rgba(41,112,255,.22)" : "0 2px 6px rgba(16,24,40,.04)" }}>{m.text}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {!compact && (
        <div style={{ textAlign: "center", padding: "22px 16px 6px" }}>
          <div style={{ width: 66, height: 66, borderRadius: "50%", background: "linear-gradient(135deg,#2E5CD6,#0F1E52)", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px rgba(27,63,160,.32)" }}><VMark size={34} mono /></div>
          <div style={{ fontSize: 21, fontWeight: 720, color: T.ink, letterSpacing: -0.4, marginTop: 10 }}>ALIS AI™</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Clinical AI assistant · Virtualis® patented</div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
        <div style={{ width: "100%", maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 11 }}>
          {msgs.map((m, i) => <Bubble key={i} m={m} />)}
          {busy && (
            <div style={{ alignSelf: "flex-start", display: "flex", gap: 8, alignItems: "flex-end" }}>
              <span style={{ width: 28, height: 28, borderRadius: 14, background: "linear-gradient(135deg,#2E5CD6,#0F1E52)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><VMark size={15} mono /></span>
              <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: "20px 20px 20px 6px", padding: "13px 16px", display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 3, background: T.faint, animation: `blink 1.1s ${i * 0.18}s ease-in-out infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div style={{ padding: "8px 16px 12px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {msgs.length < 3 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} style={{ all: "unset", cursor: "pointer", flexShrink: 0, fontSize: 12.5, fontWeight: 570, color: T.blueDeep, background: T.blueSoft, border: "1px solid #D6E4FF", borderRadius: 18, padding: "7px 13px" }}>{s}</button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask ALIS anything clinical…" style={{ ...inputStyle, borderRadius: 24, flex: 1, minWidth: 0 }} />
            <button onClick={() => send()} style={{ all: "unset", cursor: "pointer", width: 44, height: 44, borderRadius: 22, background: draft.trim() && !busy ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : T.ghost, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s ease", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19 V5 M6 11 L12 5 L18 11" /></svg>
            </button>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: T.faint, marginTop: 7, fontFamily: mono, letterSpacing: 0.2 }}>Informational only — clinical decisions remain with the provider.</div>
        </div>
      </div>
    </div>
  );
}
