import { useState } from "react";
import { T, mono, ACUITY, FACILITIES, inputStyle, VMark, Glyph, AcuityBadge, Avatar, PersonIcon, VideoIcon, FacilityChip, ScreenHeader, Empty, Wordmark, Lockup } from "./ui";
import { SPECIALTIES, SHIFTS, STAFF, ME, credentialedFacilities } from "./data";

/* ── Login ─────────────────────────────────────────────────────── */
export function Login({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 1120, padding: "0 22px", display: "grid", gap: 34, gridTemplateColumns: "1fr", alignContent: "start" }} className="v-login-grid">
        <div style={{ paddingTop: 56 }}>
          <Lockup height={40} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid " + T.line, borderRadius: 22, padding: "8px 16px", marginTop: 34, fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: 2.4, color: T.ink }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: T.blue }} /> THE PLATFORM
          </div>
          <h1 style={{ fontSize: "clamp(34px, 5vw, 54px)", fontWeight: 780, letterSpacing: -1.6, color: T.ink, margin: "16px 0 0", lineHeight: 1.05 }}>Messaging that<br />triages itself.</h1>
          <p style={{ fontSize: "clamp(15px, 1.5vw, 18px)", color: T.sub, marginTop: 12, lineHeight: 1.55, maxWidth: 520 }}>
            Virtualis® is patented, AI-powered clinical communication with telehealth built in. Sent once — triaged by acuity, matched to the on-call specialist, delivered with escalation tracking.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
            {["critical", "urgent", "routine"].map((k) => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid " + T.line, borderRadius: 16, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, color: T.sub }}>
                <Glyph level={k} size={10} gap={2} w={4} /> {ACUITY[k].label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 24, border: "1px solid " + T.line, boxShadow: "0 12px 32px rgba(27,63,160,.06)", padding: 22, marginTop: 8, alignSelf: "start", width: "100%", maxWidth: 430, justifySelf: "center", boxSizing: "border-box" }}>
          <div style={{ fontSize: 14, fontWeight: 620, color: T.ink, marginBottom: 8 }}>Email</div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hospital.org" style={{ ...inputStyle, borderColor: email ? T.blue : T.line }} />
          <div style={{ fontSize: 14, fontWeight: 620, color: T.ink, margin: "18px 0 8px" }}>Password</div>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" style={inputStyle} />
          <div style={{ textAlign: "right", marginTop: 12 }}><span style={{ fontSize: 13.5, color: T.blue, fontWeight: 570 }}>Forgot password?</span></div>
          <button onClick={onSignIn} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", textAlign: "center", marginTop: 18, background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)", color: "#fff", fontSize: 16, fontWeight: 650, borderRadius: 16, padding: "15px 0", boxShadow: "0 8px 20px rgba(41,112,255,.3)" }}>Sign In →</button>
          <button onClick={onSignIn} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", textAlign: "center", marginTop: 10, border: "1px solid " + T.line, color: T.ink, fontSize: 15, fontWeight: 600, borderRadius: 16, padding: "13px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2" /><circle cx="9" cy="10" r="0.8" fill={T.ink} /><circle cx="15" cy="10" r="0.8" fill={T.ink} /><path d="M9 15c.8.8 1.8 1.2 3 1.2s2.2-.4 3-1.2" /></svg>
            Sign in with Face ID
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 16, fontSize: 12.5, color: T.sub, textAlign: "center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.1" style={{ flexShrink: 0 }}><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            HIPAA-secure login with staff verification
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: T.faint, marginTop: 18 }}>Virtualis® · intelligent medicine</div>
        </div>
      </div>
    </div>
  );
}

/* ── Directory ─────────────────────────────────────────────────── */
export function Directory({ onChat, facilityScope }) {
  const [seg, setSeg] = useState("All");
  const [q, setQ] = useState("");
  const shown = STAFF
    .filter((s) => facilityScope.includes(s.facility))
    .filter((s) => seg === "All" || (seg === "Physicians" ? s.role === "Physician" : s.role !== "Physician"))
    .filter((s) => !q || (s.name + s.dept).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div style={{ padding: "18px 18px 10px" }}>
        <div style={{ fontSize: 21, fontWeight: 720, letterSpacing: -0.5, color: T.ink }}>Team Directory</div>
        <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>On-call clinicians at your credentialed facilities</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clinicians" style={{ ...inputStyle, borderRadius: 24, marginTop: 13 }} />
        <div style={{ display: "flex", background: "#E8EAEF", borderRadius: 12, padding: 3, gap: 2, marginTop: 12 }}>
          {["All", "Physicians", "Nurses"].map((s) => (
            <button key={s} onClick={() => setSeg(s)} style={{ all: "unset", cursor: "pointer", flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 9.5, background: seg === s ? "#fff" : "transparent", boxShadow: seg === s ? "0 1px 4px rgba(11,18,32,.12)" : "none", fontSize: 13.5, fontWeight: seg === s ? 640 : 500, color: seg === s ? T.ink : T.sub, transition: "all .2s ease" }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 15px 16px", display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", alignContent: "start" }}>
        {shown.length === 0 && <div style={{ gridColumn: "1/-1" }}><Empty title="No clinicians found" sub="Try another name or department." /></div>}
        {shown.map((s, i) => (
          <div key={s.id} style={{ background: "#fff", borderRadius: 20, border: "1px solid " + T.line, boxShadow: "0 2px 6px rgba(16,24,40,.04)", padding: 15, display: "flex", alignItems: "center", gap: 13, animation: `rise .3s ${i * 0.03}s ease backwards` }}>
            <Avatar initials={s.initials} online={s.online} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 650, color: T.ink, letterSpacing: -0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.sub, background: "#F2F4F7", borderRadius: 14, padding: "2.5px 9px" }}>{s.role}</span>
                <FacilityChip id={s.facility} />
                <span style={{ fontSize: 12, color: T.sub }}>{s.dept}</span>
              </div>
            </div>
            <button onClick={() => onChat(s)} style={{ all: "unset", cursor: "pointer", background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)", color: "#fff", fontSize: 13.5, fontWeight: 640, borderRadius: 14, padding: "9px 18px", boxShadow: "0 4px 12px rgba(41,112,255,.28)", flexShrink: 0 }}>Chat</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Voice overlay ─────────────────────────────────────────────── */
export function VoiceOverlay({ onStop }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(246,248,251,.98)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", animation: "fadeIn .25s ease" }}>
      <div style={{ fontSize: 26, fontWeight: 720, color: T.ink, letterSpacing: -0.5 }}>Listening…</div>
      <div style={{ fontSize: 14.5, color: T.sub, marginTop: 6, textAlign: "center" }}>Speak clearly — ALIS AI™ is transcribing</div>
      <div style={{ display: "flex", alignItems: "center", gap: 26, margin: "34px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {[10, 22, 14, 30, 18, 26, 12].map((h, i) => <span key={i} style={{ width: 3.5, height: h, borderRadius: 2, background: "#A9C4FF", animation: `eq 1s ${i * 0.09}s ease-in-out infinite alternate` }} />)}
        </div>
        <div style={{ position: "relative", width: 130, height: 130 }}>
          <span style={{ position: "absolute", inset: -20, borderRadius: "50%", border: "2px dashed #C9DBFF", animation: "spinSlow 14s linear infinite" }} />
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(240,68,56,.14)", animation: "pulseRing 1.6s ease-out infinite" }} />
          <div style={{ position: "absolute", inset: 16, borderRadius: "50%", background: "linear-gradient(135deg,#F35B50,#D92D20)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(240,68,56,.35)" }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="#fff"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0h-1.6a4.4 4.4 0 0 1-8.8 0H6Z" /><rect x="11.2" y="17" width="1.6" height="3.4" /><rect x="8.5" y="20.2" width="7" height="1.6" rx="0.8" /></svg>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {[12, 26, 18, 30, 14, 22, 10].map((h, i) => <span key={i} style={{ width: 3.5, height: h, borderRadius: 2, background: "#A9C4FF", animation: `eq 1s ${i * 0.11}s ease-in-out infinite alternate` }} />)}
        </div>
      </div>
      <button onClick={onStop} style={{ all: "unset", cursor: "pointer", background: "linear-gradient(135deg,#F35B50,#D92D20)", color: "#fff", fontSize: 15.5, fontWeight: 650, borderRadius: 26, padding: "13px 30px", display: "flex", alignItems: "center", gap: 9, boxShadow: "0 8px 20px rgba(240,68,56,.3)" }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: "#fff" }} /> Stop &amp; Insert Transcript
      </button>
    </div>
  );
}

/* ALIS suggests acuity from the free-text reason; the clinician always
   makes the final call — we only surface the recommendation. */
const RED_FLAGS = ["chest pain", "stroke", "unresponsive", "hypotens", "sepsis", "stemi", "airway", "desat", "pressor", "code", "hemorrhage", "arrest"];
const AMBER_FLAGS = ["fever", "culture", "shortness", "pain", "vomit", "arrhythm", "confus", "wound", "trend"];
export function suggestAcuity(text) {
  const s = text.toLowerCase();
  if (RED_FLAGS.some((f) => s.includes(f))) return { level: "critical", confidence: 93 };
  if (AMBER_FLAGS.some((f) => s.includes(f))) return { level: "urgent", confidence: 86 };
  return s.length > 12 ? { level: "routine", confidence: 79 } : null;
}

/* ── New Consult ───────────────────────────────────────────────── */
export function NewConsult({ onBack, onSend, facilityScope, defaultFacility }) {
  const [mode, setMode] = useState("Existing Patient");
  const [facility, setFacility] = useState(defaultFacility);
  const [patient, setPatient] = useState("");
  const [reason, setReason] = useState("");
  const [acuity, setAcuity] = useState(null);
  const [spec, setSpec] = useState(null);
  const [telehealth, setTelehealth] = useState(false);
  const [voice, setVoice] = useState(false);
  const [specQuery, setSpecQuery] = useState("");
  const suggestion = suggestAcuity(reason);
  const ready = patient && reason && acuity && spec;
  const f = FACILITIES[facility];
  const specs = SPECIALTIES.filter((s) => s.toLowerCase().includes(specQuery.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", animation: "slideIn .32s cubic-bezier(.2,.8,.3,1)" }}>
      {voice && <VoiceOverlay onStop={() => { setVoice(false); setReason("58M in Room 404 with substernal chest pain radiating to the left arm, diaphoretic, BP 92/60, requesting urgent cardiology evaluation."); }} />}
      <ScreenHeader title="New Consult" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 28px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ background: "linear-gradient(135deg,#EDF3FF,#E4EDFF)", border: "1px solid #D6E4FF", borderRadius: 18, padding: "14px 17px" }}>
            <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.8, color: T.blueDeep, fontWeight: 650 }}>SENDING FACILITY</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {facilityScope.map((id) => (
                <button key={id} onClick={() => setFacility(id)} style={{ all: "unset", cursor: "pointer", fontSize: 13, fontWeight: 620, padding: "7px 13px", borderRadius: 16, color: facility === id ? "#fff" : FACILITIES[id].hue, background: facility === id ? FACILITIES[id].hue : "#fff", border: `1px solid ${FACILITIES[id].hue}44` }}>{FACILITIES[id].name}</button>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: T.sub, marginTop: 10 }}>Chart writes back to <b style={{ color: T.ink }}>{f?.emr}</b> · Emergency Department</div>
          </div>

          <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 20, padding: 17, marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 680, color: T.ink }}><PersonIcon c={T.blue} /> Patient Information</div>
            <div style={{ display: "flex", background: "#F2F4F7", borderRadius: 13, padding: 3, gap: 2, marginTop: 13 }}>
              {["Existing Patient", "New Patient"].map((m) => (
                <button key={m} onClick={() => setMode(m)} style={{ all: "unset", cursor: "pointer", flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 10.5, background: mode === m ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "transparent", color: mode === m ? "#fff" : T.sub, fontSize: 13.5, fontWeight: 620, transition: "all .2s ease" }}>{m}</button>
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 620, color: T.ink, margin: "15px 0 7px" }}>{mode === "Existing Patient" ? "Search patient *" : "Patient name *"}</div>
            <input value={patient} onChange={(e) => setPatient(e.target.value)} placeholder={mode === "Existing Patient" ? "Search by name or MRN…" : "Full name"} style={inputStyle} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "15px 0 7px", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 620, color: T.ink }}>Reason *</span>
              <button onClick={() => setVoice(true)} style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 620, color: T.blue, background: T.blueSoft, border: "1px solid #D6E4FF", borderRadius: 16, padding: "5px 11px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill={T.blue}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0h-1.6a4.4 4.4 0 0 1-8.8 0H6Z" /></svg> Dictate
              </button>
            </div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the patient's condition and reason for consultation…" rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.45 }} />
          </div>

          <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 20, padding: 17, marginTop: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 680, color: T.ink }}>Acuity *</div>
            <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>Three bars Critical · two Urgent · one Routine. The glyph travels with the message.</div>
            {suggestion && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F7F9FF", border: "1px solid #DEE8FF", borderRadius: 14, padding: "10px 13px", marginTop: 12, flexWrap: "wrap" }}>
                <span style={{ width: 26, height: 26, borderRadius: 13, background: "linear-gradient(135deg,#2E5CD6,#0F1E52)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><VMark size={14} mono /></span>
                <span style={{ fontSize: 13, color: T.ink, fontWeight: 560 }}>ALIS suggests <b style={{ color: ACUITY[suggestion.level].color }}>{ACUITY[suggestion.level].label}</b> · {suggestion.confidence}% confidence</span>
                {acuity !== suggestion.level && (
                  <button onClick={() => setAcuity(suggestion.level)} style={{ all: "unset", cursor: "pointer", marginLeft: "auto", fontSize: 12.5, fontWeight: 640, color: "#fff", background: T.blue, borderRadius: 14, padding: "6px 12px" }}>Apply</button>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 9, marginTop: 13 }}>
              {["critical", "urgent", "routine"].map((k) => {
                const a = ACUITY[k], sel = acuity === k;
                return (
                  <button key={k} onClick={() => setAcuity(k)} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", flex: 1, textAlign: "center", padding: "13px 0 11px", borderRadius: 16, background: sel ? a.color + "14" : "#FAFBFC", border: sel ? `1.5px solid ${a.color}` : "1px solid " + T.line, transition: "all .2s ease" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}><Glyph level={k} size={12} gap={2} w={5} /></div>
                    <div style={{ fontSize: 12.5, fontWeight: 660, color: sel ? a.color : T.sub, marginTop: 7 }}>{a.label}</div>
                    <div style={{ fontSize: 10.5, color: T.faint, marginTop: 2 }}>{k === "critical" ? "5 min SLA" : k === "urgent" ? "30 min" : "4 hr"}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 20, padding: 17, marginTop: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 680, color: T.ink }}>Specialist *</div>
            <input value={specQuery} onChange={(e) => setSpecQuery(e.target.value)} placeholder="Filter specialties" style={{ ...inputStyle, borderRadius: 24, marginTop: 11 }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, maxHeight: 190, overflowY: "auto" }}>
              {specs.map((s) => {
                const sel = spec === s;
                return <button key={s} onClick={() => setSpec(s)} style={{ all: "unset", cursor: "pointer", fontSize: 13, fontWeight: sel ? 640 : 500, color: sel ? "#fff" : T.ink, background: sel ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#F7F8FA", border: "1px solid " + (sel ? "#1B3FA0" : T.line), borderRadius: 18, padding: "8px 14px", transition: "all .18s ease" }}>{s}</button>;
              })}
            </div>
            <button onClick={() => setTelehealth((v) => !v)} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", display: "flex", alignItems: "center", gap: 11, marginTop: 15, background: telehealth ? "#EDF3FF" : "#FAFBFC", border: "1px solid " + (telehealth ? "#C9DBFF" : T.line), borderRadius: 16, padding: "12px 14px" }}>
              <span style={{ width: 34, height: 34, borderRadius: 12, background: telehealth ? T.blue : "#E7EAEF", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><VideoIcon c={telehealth ? "#fff" : T.sub} /></span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 640, color: T.ink }}>Request telehealth visit</span>
                <span style={{ display: "block", fontSize: 12, color: T.sub, marginTop: 1 }}>Opens a secure video room with the on-call specialist</span>
              </span>
              <span style={{ width: 42, height: 24, borderRadius: 12, background: telehealth ? T.blue : "#D8DDE6", position: "relative", flexShrink: 0, transition: "background .2s ease" }}>
                <span style={{ position: "absolute", top: 3, left: telehealth ? 21 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left .2s ease" }} />
              </span>
            </button>
          </div>

          <button disabled={!ready} onClick={() => onSend({ patient, reason, acuity, spec, facility, telehealth })} style={{ all: "unset", boxSizing: "border-box", cursor: ready ? "pointer" : "default", width: "100%", textAlign: "center", marginTop: 18, background: ready ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : T.ghost, color: ready ? "#fff" : T.faint, fontSize: 16, fontWeight: 660, borderRadius: 17, padding: "16px 0", boxShadow: ready ? "0 8px 22px rgba(41,112,255,.3)" : "none", transition: "all .25s ease" }}>
            Send Consult Request
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Consult detail ────────────────────────────────────────────── */
export function ConsultDetail({ t, onBack }) {
  const [fb, setFb] = useState(null);
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "slideIn .32s cubic-bezier(.2,.8,.3,1)" }}>
      <ScreenHeader title="Consult Detail" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 26px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 20, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 17px", borderBottom: "1px solid " + T.line, flexWrap: "wrap" }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: ACUITY[t.acuity].color }} />
              <span style={{ fontSize: 17.5, fontWeight: 700, color: T.ink, letterSpacing: -0.3 }}>{t.patient}</span>
              <FacilityChip id={t.facility} showEmr />
              <span style={{ marginLeft: "auto" }}><AcuityBadge level={t.acuity} /></span>
            </div>
            <div style={{ padding: "15px 17px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15 }}>
              {[["Patient name", t.patient], ["Date of birth", t.dob || "—"], ["Room", t.room], ["MRN", t.mrn || "—"]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: T.faint, letterSpacing: 1.8, textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontSize: 15, color: T.ink, fontWeight: 560, marginTop: 3 }}>{v}</div>
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: T.faint, letterSpacing: 1.8, textTransform: "uppercase" }}>Clinical reason</div>
                <div style={{ fontSize: 14.5, color: T.ink, lineHeight: 1.5, marginTop: 4 }}>{t.reason || "—"}</div>
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 20, padding: 17, marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <span style={{ width: 32, height: 32, borderRadius: 16, background: "linear-gradient(135deg,#2E5CD6,#0F1E52)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><VMark size={16} mono /></span>
              <span style={{ fontSize: 16, fontWeight: 680, color: T.ink }}>ALIS AI™ Clinical Analysis</span>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 620, color: T.blue, border: "1px solid #C9DBFF", borderRadius: 16, padding: "4px 11px" }}>{t.confidence || 90}% confidence</span>
            </div>
            <div style={{ fontSize: 12.5, color: T.sub, marginTop: 10, lineHeight: 1.5 }}>
              Acuity recommendation: <span style={{ fontWeight: 650, color: ACUITY[t.acuity].color }}>{ACUITY[t.acuity].label}</span> — based on presenting symptoms, vitals trend, and service-line routing rules. The final acuity is always the sending clinician's call.
            </div>
            <div style={{ background: "#FAFBFC", border: "1px solid " + T.line, borderRadius: 16, padding: 15, marginTop: 13 }}>
              {sent ? (
                <div style={{ textAlign: "center", padding: "8px 0", animation: "rise .3s ease" }}>
                  <div style={{ fontSize: 26 }}>✓</div>
                  <div style={{ fontSize: 14.5, fontWeight: 650, color: T.green, marginTop: 2 }}>Feedback submitted</div>
                  <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>Thank you — this trains ALIS on your clinical judgment.</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 14.5, fontWeight: 650, color: T.ink }}>How accurate was the AI recommendation?</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                    {[["correct", "✓ Correct", T.green], ["partial", "△ Partial", T.amber], ["incorrect", "✕ Incorrect", T.red]].map(([k, l, c]) => (
                      <button key={k} onClick={() => setFb(k)} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 13, fontSize: 12.5, fontWeight: 640, color: fb === k ? c : T.sub, background: fb === k ? c + "14" : "#fff", border: fb === k ? `1.5px solid ${c}` : "1px solid " + T.line, transition: "all .18s ease" }}>{l}</button>
                    ))}
                  </div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional context or observations (optional)…" rows={3} style={{ ...inputStyle, resize: "vertical", marginTop: 11, fontSize: 13.5 }} />
                  <button disabled={!fb} onClick={() => setSent(true)} style={{ all: "unset", boxSizing: "border-box", cursor: fb ? "pointer" : "default", width: "100%", textAlign: "center", marginTop: 11, background: fb ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : T.ghost, color: fb ? "#fff" : T.faint, fontSize: 14.5, fontWeight: 650, borderRadius: 14, padding: "13px 0", transition: "all .25s ease" }}>Submit Feedback</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Schedule ──────────────────────────────────────────────────── */
export function Schedule({ facilityScope }) {
  const days = ["Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <>
      <div style={{ padding: "18px 18px 10px" }}>
        <div style={{ fontSize: 21, fontWeight: 720, letterSpacing: -0.5, color: T.ink }}>My Schedule</div>
        <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 18, padding: "13px 17px", marginTop: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.1" strokeLinecap="round"><path d="M15 5 L8 12 L15 19" /></svg>
          <span style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: -0.3 }}>August 2026</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.1" strokeLinecap="round"><path d="M9 5 L16 12 L9 19" /></svg>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 15px 16px", display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", alignContent: "start" }}>
        {[4, 5, 6, 7, 8].map((d, i) => {
          const shifts = (SHIFTS[d] || []).filter((s) => facilityScope.includes(s.facility));
          const today = d === 4;
          return (
            <div key={d} style={{ background: "#fff", borderRadius: 20, border: today ? "1.5px solid " + T.blue : "1px solid " + T.line, boxShadow: today ? "0 8px 22px rgba(41,112,255,.1)" : "0 2px 6px rgba(16,24,40,.04)", padding: 15, animation: `rise .3s ${i * 0.04}s ease backwards` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 34, height: 34, borderRadius: 12, background: today ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#F2F4F7", color: today ? "#fff" : T.ink, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>{d}</span>
                <span style={{ fontSize: 14, fontWeight: 620, color: T.sub }}>{days[i]}</span>
                {today && <span style={{ fontSize: 10.5, fontWeight: 700, color: T.blue, background: T.blueSoft, borderRadius: 14, padding: "2.5px 9px" }}>TODAY</span>}
              </div>
              {shifts.length === 0 ? (
                <div style={{ textAlign: "center", fontSize: 13, color: T.faint, padding: "16px 0 8px" }}>No coverage scheduled</div>
              ) : shifts.map((s, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 11, background: "#FAFBFC", border: "1px solid " + T.line, borderRadius: 14, padding: "11px 13px", marginTop: 10 }}>
                  <Glyph level={s.acuity} size={9} gap={2} w={4} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 630, color: T.ink }}>{s.label}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4, flexWrap: "wrap" }}>
                      <FacilityChip id={s.facility} />
                      <span style={{ fontSize: 12, color: T.sub }}>{s.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── Credentials sheet ─────────────────────────────────────────── */
export function Credentials({ onClose }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 80, background: "rgba(16,24,40,.4)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn .2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxWidth: 520, borderRadius: "24px 24px 0 0", padding: "20px 20px 26px", animation: "rise .28s cubic-bezier(.2,.8,.3,1)", maxHeight: "80%", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#DEE2E9", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar initials={ME.initials} team size={46} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{ME.name}</div>
            <div style={{ fontSize: 12.5, color: T.sub }}>{ME.role} · Virtualis®</div>
          </div>
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.8, color: T.faint, fontWeight: 650, margin: "18px 0 8px" }}>ACTIVE CREDENTIALS</div>
        {ME.credentials.map((c) => (
          <div key={c.facility} style={{ display: "flex", alignItems: "center", gap: 11, border: "1px solid " + T.line, borderRadius: 16, padding: "12px 14px", marginBottom: 8 }}>
            <span style={{ width: 8, height: 34, borderRadius: 4, background: FACILITIES[c.facility].hue }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 640, color: T.ink }}>{FACILITIES[c.facility].name}</div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{c.privileges} · {FACILITIES[c.facility].emr}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 620, color: T.green, background: "#EDFBF3", border: "1px solid #C9F0DB", borderRadius: 14, padding: "4px 9px", whiteSpace: "nowrap" }}>to {c.expires}</span>
          </div>
        ))}
        <button onClick={onClose} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", textAlign: "center", marginTop: 10, background: "#F2F4F7", color: T.ink, fontSize: 15, fontWeight: 640, borderRadius: 16, padding: "13px 0" }}>Close</button>
      </div>
    </div>
  );
}

/* ── Acuity Routing™ — the patented moment ─────────────────────── */
export function RoutingScreen({ payload }) {
  const a = ACUITY[payload.acuity];
  const steps = [
    { t: "Acuity triaged", d: `${a.label} — glyph assigned`, delay: 0.2 },
    { t: "Credentialed on-call matched", d: `Dr. E. Vasquez · ${payload.spec} · 96% match`, delay: 1.0 },
    { t: payload.telehealth ? "Telehealth room provisioned" : "Secure notification delivered", d: payload.telehealth ? "Patient invite sent · waiting room open" : "Read-receipt & escalation tracking active", delay: 1.8 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 70, background: "linear-gradient(180deg,#0E1A3E 0%,#12275E 55%,#1B3FA0 130%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", animation: "fadeIn .3s ease", color: "#fff" }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2.4, color: "#8FB6FF", textTransform: "uppercase" }}>Acuity Routing™</div>
      <div style={{ fontSize: 23, fontWeight: 730, letterSpacing: -0.5, marginTop: 6, textAlign: "center" }}>Routing your consult to {FACILITIES[payload.facility]?.name}</div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 34 }}>
        <div style={{ width: 74, height: 74, borderRadius: 22, background: "rgba(255,255,255,.07)", border: `1.5px solid ${a.color}88`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 34px ${a.glow}` }}>
          <Glyph level={payload.acuity} size={15} gap={2.5} w={6} />
        </div>
        <div style={{ display: "flex", gap: 5, margin: "0 12px" }}>
          {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 3, background: "#8FB6FF", animation: `flow 1.2s ${i * 0.14}s ease-in-out infinite` }} />)}
        </div>
        <div style={{ width: 74, height: 74, borderRadius: "50%", background: "linear-gradient(135deg,#F2F6FE,#DCE7FA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 650, color: T.blueDeep, border: "2.5px solid rgba(255,255,255,.5)", boxShadow: "0 0 30px rgba(143,182,255,.4)" }}>EV</div>
      </div>
      <div style={{ width: "100%", maxWidth: 360, marginTop: 38, display: "flex", flexDirection: "column", gap: 13 }}>
        {steps.map((s) => (
          <div key={s.t} style={{ display: "flex", alignItems: "flex-start", gap: 12, animation: `rise .4s ${s.delay}s ease backwards` }}>
            <span style={{ width: 24, height: 24, borderRadius: 12, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7CE3AC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: `fadeIn .3s ${s.delay + 0.3}s ease backwards` }}><path d="M4.5 12.5 L10 18 L19.5 6.5" /></svg>
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: -0.2 }}>{s.t}</div>
              <div style={{ fontSize: 12.5, color: "#AFC6FF", marginTop: 2 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 30, display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#7E9BE8", letterSpacing: 0.3, textAlign: "center" }}>
        <VMark size={15} mono /> Virtualis® Acuity Routing™ · US patented
      </div>
    </div>
  );
}

export { credentialedFacilities, Wordmark };
