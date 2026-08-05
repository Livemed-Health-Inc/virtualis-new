import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════  VIRTUALIS® · intelligent medicine
   Full-app prototype. Screens: Login → tabbed shell (Inbox, Team,
   + New Consult, ALIS AI™, Schedule) plus pushed views (Thread,
   Consult Detail) and a voice-dictation overlay.
   Acuity Glyph system: ||| Critical · || Urgent · | Routine.
   Acuity binds to unread; read threads carry no grading.        ═══ */

const T = {
  bg: "#F4F5F7", card: "#FFFFFF", ink: "#0B0F1A", sub: "#667085",
  faint: "#98A2B3", line: "#EAECF0", blue: "#2E5CFF", blueDeep: "#1B3FA0",
  blueSoft: "#EFF4FF", red: "#F04438", amber: "#F79009", green: "#12B76A",
  ghost: "#EDF0F4",
};
const mono = '"SF Mono", ui-monospace, Menlo, Consolas, monospace';
const font = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif';

const ACUITY = {
  critical: { bars: 3, color: T.red, glow: "rgba(240,68,56,.35)", label: "Critical" },
  urgent: { bars: 2, color: T.amber, glow: "rgba(247,144,9,.35)", label: "Urgent" },
  routine: { bars: 1, color: T.green, glow: "rgba(18,183,106,.3)", label: "Routine" },
};

/* ── Seed data ─────────────────────────────────────────────────── */
const INITIAL_THREADS = [
  { id: 1, name: "Team Consultation", team: true, members: "Dr. M. Hussain, Dr. E. Vasquez +2", context: "Tele-ICU · Critical Care", patient: "Jon Smith", room: "404", mrn: "MRN-176471", dob: "1965-10-11", time: "Just now", acuity: "critical", newCount: 3, reason: "Patient in Rm 404 with chest pain, escalating pressor requirement.", confidence: 92,
    msgs: [
      { me: false, who: "Amy Smith, RN", kind: "consult", text: "New consult request: patient in Room 404 is experiencing chest pain with escalating O2 requirement.", t: "9:28 AM" },
      { me: false, who: "Dr. E. Vasquez", text: "MAP holding at 62 on norepi 12 mcg. Lactate 4.1, up from 3.2.", t: "9:31 AM" },
      { me: false, who: "Dr. E. Vasquez", kind: "attachment", text: "Echocardiogram report — 2-D & M-Mode, color flow Doppler", t: "9:36 AM" },
      { me: true, who: "You", text: "Joining the cart in Rm 404 in 2 minutes. Pull up the last ABG for me.", t: "9:40 AM" },
    ] },
  { id: 2, name: "Dr. Elena Vasquez", context: "Tele-Cardiology", patient: "Maria Chen", room: "212", mrn: "MRN-208114", dob: "1958-03-22", time: "12m", acuity: "critical", newCount: 2, reason: "Troponin rise with anterior ST changes.", confidence: 88,
    msgs: [
      { me: false, who: "Dr. E. Vasquez", text: "Troponin trending up on repeat draw. ECG attached — ST changes in V3–V4.", t: "9:30 AM" },
      { me: true, who: "You", text: "Reviewing the ECG now. Get cath lab on standby and repeat troponin at 11.", t: "9:33 AM" },
    ] },
  { id: 3, name: "Amy Smith, RN", context: "Tele-Infectious Disease", patient: "Robert Diaz", room: "318", mrn: "MRN-355902", dob: "1971-07-02", time: "38m", acuity: "urgent", newCount: 1, reason: "Positive blood cultures, needs antimicrobial guidance.", confidence: 85,
    msgs: [
      { me: false, who: "Amy Smith, RN", text: "Blood cultures resulted — gram-positive cocci in clusters, 2 of 2 bottles.", t: "9:04 AM" },
      { me: true, who: "You", text: "Start vancomycin per protocol, trough before 4th dose. I'll see him on rounds at 1.", t: "9:12 AM" },
    ] },
  { id: 4, name: "Dr. Raj Patel", context: "Tele-Pulmonology", patient: "Linda Okafor", room: "126", mrn: "MRN-441238", dob: "1949-12-30", time: "1h", acuity: "urgent", newCount: 1, reason: "COPD exacerbation, improving.", confidence: 90,
    msgs: [{ me: false, who: "Dr. R. Patel", text: "O2 requirement down to 3L. Okay to space nebs to q6h overnight?", t: "8:42 AM" }] },
  { id: 5, name: "James Torres, RN", context: "Tele-Cardiology", patient: "Maria Chen", room: "212", mrn: "MRN-208114", dob: "1958-03-22", time: "3h", acuity: "routine", newCount: 1, reason: "Discharge co-sign.", confidence: 96,
    msgs: [{ me: false, who: "James Torres, RN", text: "Discharge summary drafted for your co-sign when you have a moment.", t: "6:20 AM" }] },
  { id: 6, name: "Dr. Lisa Wong", context: "Scheduling", patient: "—", room: "—", time: "1d", acuity: "routine", newCount: 1, reason: "", confidence: 0,
    msgs: [{ me: false, who: "Dr. L. Wong", text: "Can we move Thursday's tumor board to 2:30? Radiology has a conflict.", t: "1d ago" }] },
];

const STAFF = [
  { id: "s1", name: "Dr. M. Mark, DO", role: "Physician", dept: "Emergency Medicine", initials: "MM", online: true },
  { id: "s2", name: "Saamer Siddiqi, MD", role: "Physician", dept: "Internal Medicine", initials: "SS", online: true },
  { id: "s3", name: "Dr. Elena Vasquez", role: "Physician", dept: "Cardiology", initials: "EV", online: true, threadId: 2 },
  { id: "s4", name: "Amy Smith, RN", role: "Virtual Nurse", dept: "Surgery", initials: "AS", online: true, threadId: 3 },
  { id: "s5", name: "James Torres, RN", role: "Virtual Nurse", dept: "Cardiology", initials: "JT", online: false, threadId: 5 },
  { id: "s6", name: "Dr. Lisa Wong", role: "Physician", dept: "Oncology", initials: "LW", online: false, threadId: 6 },
];

const SPECIALTIES = [
  "Anesthesiology", "Cardiology", "Cardiovascular Disease", "Case Manager", "Diagnostic Radiology",
  "Emergency Medicine", "Family Medicine", "Family Medicine w/ OB", "Family Nurse Practitioner",
  "General Surgery", "Geriatrics", "Infectious Diseases", "Internal Medicine", "Interventional Radiology",
  "Maternal-Fetal Medicine", "Midwifery", "Nephrology", "Neurology", "Obstetrics & Gynecology",
  "Oncology", "Ophthalmology", "Orthopaedic Surgery", "Pulmonology", "Tele-ICU / Critical Care",
];

const SHIFTS = {
  4: [{ label: "Tele-ICU Coverage · Saint Anthony", time: "7:00 AM – 7:00 PM", acuity: "critical" }],
  5: [{ label: "Cardiology Reads · Edgerton", time: "8:00 AM – 12:00 PM", acuity: "urgent" }],
  6: [],
  7: [{ label: "Tele-ID Rounds · Saint Anthony", time: "1:00 PM – 4:00 PM", acuity: "routine" },
      { label: "Tumor Board", time: "2:30 PM – 3:30 PM", acuity: "routine" }],
  8: [{ label: "Tele-ICU Coverage · Saint Anthony", time: "7:00 PM – 7:00 AM", acuity: "critical" }],
};

/* ── Shared bits ───────────────────────────────────────────────── */
function VMark({ size = 30, mono }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs><linearGradient id="vg" x1="4" y1="4" x2="28" y2="28"><stop offset="0" stopColor="#4C8DFF" /><stop offset="1" stopColor="#1B3FA0" /></linearGradient></defs>
      <path d="M6 7 L14.5 26 C15.1 27.3 16.9 27.3 17.5 26 L26 7" stroke={mono ? "#fff" : "url(#vg)"} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="3.5" y="3.5" width="3.4" height="3.4" rx="0.9" fill={mono ? "#fff" : "#4C8DFF"} />
      <rect x="8" y="2" width="2.2" height="2.2" rx="0.7" fill={mono ? "#fff" : "#8FB6FF"} opacity="0.9" />
    </svg>
  );
}

function Glyph({ level, size = 16, gap = 3, w = 6 }) {
  const a = ACUITY[level];
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap }}>
      {Array.from({ length: a.bars }).map((_, i) => (
        <span key={i} style={{ width: w, height: size, borderRadius: 3.5, background: `linear-gradient(180deg, ${a.color}, ${a.color}D9)`, boxShadow: `0 0 10px ${a.glow}` }} />
      ))}
    </span>
  );
}

function AcuityBadge({ level }) {
  const a = ACUITY[level];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: a.color + "14", border: `1px solid ${a.color}40`, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 650, color: a.color }}>
      <Glyph level={level} size={7} gap={1.5} w={3.5} /> {a.label}
    </span>
  );
}

function Avatar({ initials, team, size = 46, online }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: team ? "linear-gradient(135deg,#4C8DFF,#1B3FA0)" : "linear-gradient(135deg,#F2F6FE,#DCE7FA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 600, color: team ? "#fff" : T.blueDeep, boxShadow: "inset 0 0 0 1px rgba(27,63,160,.08)" }}>{initials}</div>
      {online != null && <span style={{ position: "absolute", right: 0, bottom: 1, width: 11, height: 11, borderRadius: 6, background: online ? T.green : T.faint, border: "2.5px solid #fff" }} />}
    </div>
  );
}

const Back = ({ onClick, label = "Back" }) => (
  <button onClick={onClick} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", color: T.blue, fontSize: 15, fontWeight: 570, gap: 2, padding: "4px 6px 4px 0" }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5 L8 12 L15 19" /></svg>{label}
  </button>
);

const PersonIcon = ({ c = "#F27059" }) => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.3" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>);
const DoorIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B9BF5" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="3" width="12" height="18" rx="1.5" /><circle cx="15" cy="12" r="0.9" fill="#3B9BF5" /></svg>);

const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid " + T.line, background: "#fff", borderRadius: 14, padding: "13px 15px", fontSize: 15, fontFamily: font, outline: "none", color: T.ink };

/* ── Login ─────────────────────────────────────────────────────── */
function Login({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 22px", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 64 }}>
        <VMark size={40} />
        <div>
          <div style={{ fontSize: 26, fontWeight: 750, letterSpacing: -0.6, color: T.ink, lineHeight: 1 }}>virtualis<span style={{ fontSize: 13, verticalAlign: "super" }}>®</span></div>
          <div style={{ fontSize: 12.5, color: T.sub, letterSpacing: 0.2 }}>intelligent medicine</div>
        </div>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", background: "#fff", border: "1px solid " + T.line, borderRadius: 22, padding: "8px 16px", marginTop: 42, fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: 2.4, color: T.ink }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: T.blue }} /> THE PLATFORM
      </div>
      <div style={{ fontSize: 36, fontWeight: 780, letterSpacing: -1.4, color: T.ink, marginTop: 16, lineHeight: 1.08 }}>Messaging that<br />triages itself.</div>
      <div style={{ fontSize: 16, color: T.sub, marginTop: 12, lineHeight: 1.5 }}>Acuity-routed clinical communication. Sent once — triaged, matched, and delivered to the right specialist on call.</div>
      <div style={{ background: "#fff", borderRadius: 24, border: "1px solid " + T.line, boxShadow: "0 12px 32px rgba(27,63,160,.06)", padding: 22, marginTop: 30 }}>
        <div style={{ fontSize: 14, fontWeight: 620, color: T.ink, marginBottom: 8 }}>Email</div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hospital.org" style={{ ...inputStyle, borderColor: email ? T.blue : T.line }} />
        <div style={{ fontSize: 14, fontWeight: 620, color: T.ink, margin: "18px 0 8px" }}>Password</div>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" style={inputStyle} />
        <div style={{ textAlign: "right", marginTop: 12 }}>
          <span style={{ fontSize: 13.5, color: T.blue, fontWeight: 570 }}>Forgot password?</span>
        </div>
        <button onClick={onSignIn} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", textAlign: "center", marginTop: 18, background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)", color: "#fff", fontSize: 16, fontWeight: 650, borderRadius: 16, padding: "15px 0", boxShadow: "0 8px 20px rgba(41,112,255,.3)" }}>Sign In  →</button>
        <button onClick={onSignIn} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", textAlign: "center", marginTop: 10, border: "1px solid " + T.line, color: T.ink, fontSize: 15, fontWeight: 600, borderRadius: 16, padding: "13px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M7 21H5a2 2 0 0 1-2-2v-2M17 21h2a2 2 0 0 0 2-2v-2" /><circle cx="9" cy="10" r="0.8" fill={T.ink} /><circle cx="15" cy="10" r="0.8" fill={T.ink} /><path d="M9 15c.8.8 1.8 1.2 3 1.2s2.2-.4 3-1.2" /></svg>
          Sign in with Face ID
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 16, fontSize: 12.5, color: T.sub }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.1"><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          Secure login with additional verification for staff
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: T.faint, margin: "auto 0 18px", paddingTop: 26 }}>Virtualis® · intelligent medicine</div>
    </div>
  );
}

/* ── Inbox ─────────────────────────────────────────────────────── */
function Inbox({ threads, acked, liveCounts, openThread, filter, setFilter }) {
  const counts = {
    all: threads.length,
    critical: threads.filter((t) => t.acuity === "critical").length,
    urgent: threads.filter((t) => t.acuity === "urgent").length,
    routine: threads.filter((t) => t.acuity === "routine").length,
  };
  const unreadCritical = threads.filter((t) => t.acuity === "critical" && !acked.has(t.id)).length;
  const unreadTotal = threads.filter((t) => !acked.has(t.id)).length;
  const shown = threads.filter((t) => filter === "all" || t.acuity === filter);
  const pills = [
    { k: "all", label: `All (${counts.all})` },
    { k: "critical", label: `Critical (${counts.critical})`, c: T.red, bg: "#FEF0EF", bd: "#FBD9D6" },
    { k: "urgent", label: `Urgent (${counts.urgent})`, c: T.amber, bg: "#FFF6E8", bd: "#FDE3BC" },
    { k: "routine", label: `Routine (${counts.routine})`, c: T.green, bg: "#EDFBF3", bd: "#C9F0DB" },
  ];
  return (
    <>
      <div style={{ padding: "18px 18px 12px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <VMark size={32} />
          <div>
            <div style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 2.2, color: T.blue, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: T.blue }} /> LIVE · ACUITY INBOX
            </div>
            <div style={{ fontSize: 21, fontWeight: 730, letterSpacing: -0.6, color: T.ink, marginTop: 3 }}>Hello, Dr. Hussain</div>
            <div style={{ fontSize: 12.5, color: T.sub, marginTop: 1 }}>
              Tuesday, Aug 4 ·{" "}
              {unreadCritical > 0 ? <span style={{ color: T.red, fontWeight: 600 }}>{unreadCritical} critical unread</span>
                : unreadTotal > 0 ? <span style={{ color: T.blue, fontWeight: 600 }}>{unreadTotal} unread</span>
                : <span style={{ color: T.green, fontWeight: 600 }}>all caught up</span>}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}><Avatar initials="MH" team size={40} /></div>
        </div>
        <div style={{ marginTop: 14, background: "rgba(255,255,255,.85)", borderRadius: 24, border: "1px solid " + T.line, display: "flex", alignItems: "center", gap: 9, padding: "11px 16px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2.3" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20 L16.5 16.5" /></svg>
          <input placeholder="Search messages and people" style={{ border: "none", background: "transparent", outline: "none", fontSize: 14.5, fontFamily: font, flex: 1, color: T.ink }} />
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 13, paddingBottom: 2 }}>
          {pills.map((p) => {
            const active = filter === p.k, dark = p.k === "all";
            return (
              <button key={p.k} onClick={() => setFilter(p.k)} style={{ all: "unset", cursor: "pointer", flexShrink: 0, fontSize: 13, fontWeight: 600, padding: "8px 15px", borderRadius: 22, color: active ? (dark ? "#fff" : p.c) : (dark ? T.ink : p.c), background: active ? (dark ? "linear-gradient(135deg,#1B3FA0,#12275E)" : p.bg) : "#fff", border: "1px solid " + (active ? (dark ? "#12275E" : p.bd) : T.line), display: "inline-flex", alignItems: "center", gap: 6, transition: "all .2s ease" }}>
                {p.c && <span style={{ width: 7, height: 7, borderRadius: 4, background: p.c }} />}{p.label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "2px 15px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map((t, i) => {
          const ack = acked.has(t.id);
          return (
            <button key={t.id} onClick={() => openThread(t.id)} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", display: "flex", background: ack ? "#fff" : "linear-gradient(135deg,#FFFFFF 30%,#F2F7FF 78%,#EBF2FF 100%)", borderRadius: 20, padding: 15, border: ack ? "1px solid " + T.line : "1px solid #CFE0FF", boxShadow: ack ? "0 2px 6px rgba(16,24,40,.04)" : "0 4px 10px rgba(41,112,255,.06), 0 14px 30px rgba(41,112,255,.11)", transition: "all .45s ease", animation: `rise .3s ${i * 0.03}s cubic-bezier(.2,.8,.3,1) backwards` }}>
              {!ack && <span style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginRight: 13 }}><Glyph level={t.acuity} /></span>}
              <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
                <Avatar initials={t.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()} team={t.team} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: ack ? 600 : 680, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: -0.25 }}>{t.name}</span>
                    {t.team && <span style={{ fontSize: 10.5, fontWeight: 620, color: T.blue, background: T.blueSoft, border: "1px solid #D6E4FF", borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>Team</span>}
                    <span style={{ marginLeft: "auto", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 12, color: ack ? T.faint : T.blue, fontWeight: ack ? 400 : 620 }}>{t.time}</span>
                      {ack ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 560, color: T.faint }}>
                          <svg width="14" height="10" viewBox="0 0 20 14" fill="none" stroke={T.faint} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 7.5 L5.5 11.5 L12 4" /><path d="M9 10 L10.5 11.5 L18 3.5" /></svg>Read
                        </span>
                      ) : (
                        <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)", color: "#fff", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 6px", boxShadow: "0 3px 10px rgba(41,112,255,.4)" }}>{liveCounts[t.id] ?? t.newCount}</span>
                      )}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: T.blue, fontWeight: 530, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.team ? t.members : t.context}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.sub, marginTop: 4 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><PersonIcon /> {t.patient}</span>
                    {t.room !== "—" && <><span style={{ color: T.line }}>|</span><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><DoorIcon /> Room {t.room}</span></>}
                  </div>
                  <div style={{ fontSize: 13.5, marginTop: 6, color: ack ? T.sub : T.ink, fontWeight: ack ? 400 : 530, lineHeight: 1.4, letterSpacing: -0.1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", transition: "color .4s ease" }}>
                    {t.msgs[t.msgs.length - 1].kind === "attachment" ? "📎 " : ""}{t.msgs[t.msgs.length - 1].text}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ── Directory (Team) ──────────────────────────────────────────── */
function Directory({ onChat }) {
  const [seg, setSeg] = useState("All");
  const shown = STAFF.filter((s) => seg === "All" || (seg === "Physicians" ? s.role === "Physician" : s.role !== "Physician"));
  return (
    <>
      <div style={{ padding: "18px 18px 10px" }}>
        <div style={{ fontSize: 21, fontWeight: 720, letterSpacing: -0.5, color: T.ink }}>Team Directory</div>
        <div style={{ display: "flex", background: "#E8EAEF", borderRadius: 12, padding: 3, gap: 2, marginTop: 14 }}>
          {["All", "Physicians", "Nurses"].map((s) => (
            <button key={s} onClick={() => setSeg(s)} style={{ all: "unset", cursor: "pointer", flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 9.5, background: seg === s ? "#fff" : "transparent", boxShadow: seg === s ? "0 1px 4px rgba(11,18,32,.12)" : "none", fontSize: 13.5, fontWeight: seg === s ? 640 : 500, color: seg === s ? T.ink : T.sub, transition: "all .2s ease" }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 15px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map((s, i) => (
          <div key={s.id} style={{ background: "#fff", borderRadius: 20, border: "1px solid " + T.line, boxShadow: "0 2px 6px rgba(16,24,40,.04)", padding: 15, display: "flex", alignItems: "center", gap: 13, animation: `rise .3s ${i * 0.03}s ease backwards` }}>
            <Avatar initials={s.initials} online={s.online} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 650, color: T.ink, letterSpacing: -0.2 }}>{s.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.sub, background: "#F2F4F7", borderRadius: 14, padding: "2.5px 9px" }}>{s.role}</span>
                <span style={{ fontSize: 12, color: T.sub }}>{s.dept}</span>
              </div>
            </div>
            <button onClick={() => onChat(s)} style={{ all: "unset", cursor: "pointer", background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)", color: "#fff", fontSize: 13.5, fontWeight: 640, borderRadius: 14, padding: "9px 18px", boxShadow: "0 4px 12px rgba(41,112,255,.28)" }}>Chat</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Voice overlay ─────────────────────────────────────────────── */
function VoiceOverlay({ onStop }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(246,248,251,.98)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", padding: "70px 24px 40px", animation: "fadeIn .25s ease" }}>
      <div style={{ fontSize: 26, fontWeight: 720, color: T.ink, letterSpacing: -0.5 }}>Listening…</div>
      <div style={{ fontSize: 14.5, color: T.sub, marginTop: 6 }}>Speak clearly — ELYN™ is transcribing</div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {[10, 22, 14, 30, 18, 26, 12].map((h, i) => <span key={i} style={{ width: 3.5, height: h, borderRadius: 2, background: "#A9C4FF", animation: `eq 1s ${i * 0.09}s ease-in-out infinite alternate` }} />)}
        </div>
        <div style={{ position: "relative", width: 150, height: 150 }}>
          <span style={{ position: "absolute", inset: -22, borderRadius: "50%", border: "2px dashed #C9DBFF", animation: "spinSlow 14s linear infinite" }} />
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(240,68,56,.14)", animation: "pulseRing 1.6s ease-out infinite" }} />
          <div style={{ position: "absolute", inset: 18, borderRadius: "50%", background: "linear-gradient(135deg,#F35B50,#D92D20)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(240,68,56,.35)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0h-1.6a4.4 4.4 0 0 1-8.8 0H6Z" /><rect x="11.2" y="17" width="1.6" height="3.4" /><rect x="8.5" y="20.2" width="7" height="1.6" rx="0.8" /></svg>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {[12, 26, 18, 30, 14, 22, 10].map((h, i) => <span key={i} style={{ width: 3.5, height: h, borderRadius: 2, background: "#A9C4FF", animation: `eq 1s ${i * 0.11}s ease-in-out infinite alternate` }} />)}
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid " + T.line, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center", boxShadow: "0 8px 22px rgba(16,24,40,.06)", width: "100%", boxSizing: "border-box" }}>
        <span style={{ width: 40, height: 40, borderRadius: 20, background: T.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ display: "flex", gap: 2 }}>{[8, 14, 10, 16, 9].map((h, i) => <span key={i} style={{ width: 2.5, height: h, borderRadius: 2, background: T.blue, animation: `eq .9s ${i * 0.1}s ease-in-out infinite alternate` }} />)}</span>
        </span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 650, color: T.ink }}>Detecting your voice…</div>
          <div style={{ fontSize: 12.5, color: T.sub }}>Ambient transcription for accurate documentation</div>
        </div>
      </div>
      <button onClick={onStop} style={{ all: "unset", cursor: "pointer", marginTop: 26, background: "linear-gradient(135deg,#F35B50,#D92D20)", color: "#fff", fontSize: 15.5, fontWeight: 650, borderRadius: 26, padding: "13px 30px", display: "flex", alignItems: "center", gap: 9, boxShadow: "0 8px 20px rgba(240,68,56,.3)" }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: "#fff" }} /> Stop &amp; Insert Transcript</button>
    </div>
  );
}

/* ── New Consult ───────────────────────────────────────────────── */
function NewConsult({ onBack, onSend }) {
  const [mode, setMode] = useState("Existing Patient");
  const [patient, setPatient] = useState("");
  const [reason, setReason] = useState("");
  const [acuity, setAcuity] = useState(null);
  const [spec, setSpec] = useState(null);
  const [voice, setVoice] = useState(false);
  const ready = patient && reason && acuity && spec;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", animation: "slideIn .32s cubic-bezier(.2,.8,.3,1)" }}>
      {voice && <VoiceOverlay onStop={() => { setVoice(false); setReason("58M in Room 404 with substernal chest pain radiating to the left arm, diaphoretic, BP 92/60, requesting urgent cardiology evaluation."); }} />}
      <div style={{ background: "rgba(255,255,255,.86)", backdropFilter: "blur(18px)", borderBottom: "1px solid " + T.line, padding: "12px 16px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <Back onClick={onBack} label="" />
        <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 680, color: T.ink, letterSpacing: -0.3 }}>New Consult</div>
        <div style={{ width: 30 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 24px" }}>
        <div style={{ background: "linear-gradient(135deg,#EDF3FF,#E4EDFF)", border: "1px solid #D6E4FF", borderRadius: 18, padding: "14px 17px", fontSize: 14 }}>
          <div><span style={{ color: T.sub }}>Hospital:</span> <span style={{ fontWeight: 650, color: T.ink }}>University Hospital</span></div>
          <div style={{ marginTop: 5 }}><span style={{ color: T.sub }}>Department:</span> <span style={{ fontWeight: 650, color: T.ink }}>Emergency Department</span></div>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "15px 0 7px" }}>
            <span style={{ fontSize: 14, fontWeight: 620, color: T.ink }}>Reason *</span>
            <button onClick={() => setVoice(true)} style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 620, color: T.blue, background: T.blueSoft, border: "1px solid #D6E4FF", borderRadius: 16, padding: "5px 11px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={T.blue}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0h-1.6a4.4 4.4 0 0 1-8.8 0H6Z" /></svg>
              Dictate
            </button>
          </div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the patient's condition and reason for consultation…" rows={4} style={{ ...inputStyle, resize: "none", lineHeight: 1.45 }} />
        </div>

        <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 20, padding: 17, marginTop: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 680, color: T.ink }}>Acuity *</div>
          <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>Sets the glyph the receiving clinician sees: ||| Critical · || Urgent · | Routine</div>
          <div style={{ display: "flex", gap: 9, marginTop: 13 }}>
            {["critical", "urgent", "routine"].map((k) => {
              const a = ACUITY[k], sel = acuity === k;
              return (
                <button key={k} onClick={() => setAcuity(k)} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", flex: 1, textAlign: "center", padding: "13px 0 11px", borderRadius: 16, background: sel ? a.color + "14" : "#FAFBFC", border: sel ? `1.5px solid ${a.color}` : "1px solid " + T.line, transition: "all .2s ease" }}>
                  <div style={{ display: "flex", justifyContent: "center" }}><Glyph level={k} size={12} gap={2} w={5} /></div>
                  <div style={{ fontSize: 12.5, fontWeight: 660, color: sel ? a.color : T.sub, marginTop: 7 }}>{a.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 20, padding: 17, marginTop: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 680, color: T.ink }}>Specialist *</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 13 }}>
            {SPECIALTIES.map((s) => {
              const sel = spec === s;
              return (
                <button key={s} onClick={() => setSpec(s)} style={{ all: "unset", cursor: "pointer", fontSize: 13, fontWeight: sel ? 640 : 500, color: sel ? "#fff" : T.ink, background: sel ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#F7F8FA", border: "1px solid " + (sel ? "#1B3FA0" : T.line), borderRadius: 18, padding: "8px 14px", transition: "all .18s ease" }}>{s}</button>
              );
            })}
          </div>
        </div>

        <button disabled={!ready} onClick={() => onSend({ patient, reason, acuity, spec })} style={{ all: "unset", boxSizing: "border-box", cursor: ready ? "pointer" : "default", width: "100%", textAlign: "center", marginTop: 18, background: ready ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : T.ghost, color: ready ? "#fff" : T.faint, fontSize: 16, fontWeight: 660, borderRadius: 17, padding: "16px 0", boxShadow: ready ? "0 8px 22px rgba(41,112,255,.3)" : "none", transition: "all .25s ease" }}>
          Send Consult Request
        </button>
      </div>
    </div>
  );
}

/* ── ALIS AI™ (live via Claude) ────────────────────────────────── */
function Alis() {
  const [msgs, setMsgs] = useState([{ me: false, text: "Hello, Dr. Hussain — I'm ALIS AI™, your clinical assistant. I can help with medical information, clinical questions, and drafting consults. How can I help?" }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const next = [...msgs, { me: true, text }];
    setMsgs(next); setDraft(""); setBusy(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1000,
          messages: [
            { role: "user", content: "You are ALIS AI™, the clinical AI assistant inside Virtualis® by Livemed. You assist physicians and nurses. Keep answers concise (2–5 sentences), professional, and clinically precise. You provide informational support only — never a definitive diagnosis or treatment order; the clinician decides. Where relevant, offer to help draft a consult. Acknowledge these instructions with 'Ready.'" },
            { role: "assistant", content: "Ready." },
            ...next.map((m) => ({ role: m.me ? "user" : "assistant", content: m.text })),
          ],
        }),
      });
      const data = await res.json();
      const reply = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      setMsgs((m) => [...m, { me: false, text: reply || "I hit a connection issue — please try again." }]);
    } catch {
      setMsgs((m) => [...m, { me: false, text: "I hit a connection issue — please try again." }]);
    }
    setBusy(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ textAlign: "center", padding: "22px 16px 6px" }}>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: "linear-gradient(135deg,#2E5CD6,#0F1E52)", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px rgba(27,63,160,.32)" }}><VMark size={34} mono /></div>
        <div style={{ fontSize: 21, fontWeight: 720, color: T.ink, letterSpacing: -0.4, marginTop: 10 }}>ALIS AI™</div>
        <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Clinical AI assistant · USPTO-patented</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "84%", display: "flex", gap: 8, alignItems: "flex-end" }}>
            {!m.me && <span style={{ width: 28, height: 28, borderRadius: 14, background: "linear-gradient(135deg,#2E5CD6,#0F1E52)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><VMark size={15} mono /></span>}
            <div style={{ background: m.me ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#fff", color: m.me ? "#fff" : T.ink, border: m.me ? "none" : "1px solid " + T.line, borderRadius: m.me ? "20px 20px 6px 20px" : "20px 20px 20px 6px", padding: "11px 15px", fontSize: 14.5, lineHeight: 1.48, whiteSpace: "pre-wrap", boxShadow: m.me ? "0 6px 16px rgba(41,112,255,.22)" : "0 2px 6px rgba(16,24,40,.04)" }}>{m.text}</div>
          </div>
        ))}
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
      <div style={{ padding: "8px 16px 10px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask ALIS anything clinical…" style={{ ...inputStyle, borderRadius: 24, flex: 1 }} />
          <button onClick={send} style={{ all: "unset", cursor: "pointer", width: 44, height: 44, borderRadius: 22, background: draft.trim() && !busy ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : T.ghost, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s ease", flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19 V5 M6 11 L12 5 L18 11" /></svg>
          </button>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: T.faint, marginTop: 7 }}>ALIS responses are informational only — clinical decisions remain with the provider.</div>
      </div>
    </div>
  );
}

/* ── Thread view ───────────────────────────────────────────────── */
function Thread({ t, onBack, onDetail }) {
  const [draft, setDraft] = useState("");
  const [extra, setExtra] = useState([]);
  const [sheet, setSheet] = useState(null); // index of message with open actions
  const msgs = [...t.msgs, ...extra];
  const send = () => { if (!draft.trim()) return; setExtra((e) => [...e, { me: true, who: "You", text: draft.trim(), t: "Now" }]); setDraft(""); };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "slideIn .32s cubic-bezier(.2,.8,.3,1)", position: "relative" }}>
      <div style={{ background: "rgba(255,255,255,.86)", backdropFilter: "blur(18px)", borderBottom: "1px solid " + T.line, padding: "12px 14px 10px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Back onClick={onBack} label="" />
          <Avatar initials={t.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()} team={t.team} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 660, color: T.ink, letterSpacing: -0.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
            <div style={{ fontSize: 11.5, color: T.sub }}>{t.team ? t.members : t.context}</div>
          </div>
          <button style={{ all: "unset", cursor: "pointer", background: "#101828", color: "#fff", fontSize: 12.5, fontWeight: 620, borderRadius: 20, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>
            Call
          </button>
        </div>
        {t.patient !== "—" && (
          <button onClick={onDetail} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", marginTop: 10, width: "100%", display: "flex", alignItems: "center", gap: 8, background: T.blueSoft, border: "1px solid #D6E4FF", borderRadius: 13, padding: "9px 13px" }}>
            <PersonIcon c={T.blueDeep} />
            <span style={{ fontSize: 13, color: T.blueDeep, fontWeight: 620 }}>{t.patient}</span>
            <span style={{ color: "#C3D5F7" }}>|</span>
            <DoorIcon /><span style={{ fontSize: 12.5, color: T.blueDeep, fontWeight: 560 }}>Room {t.room}</span>
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <AcuityBadge level={t.acuity} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.blueDeep} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5 L16 12 L9 19" /></svg>
            </span>
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 11 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "82%" }}>
            {!m.me && <div style={{ fontSize: 11, color: T.sub, margin: "0 0 3px 13px", fontWeight: 560 }}>{m.who}</div>}
            <button onClick={() => setSheet(sheet === i ? null : i)} style={{ all: "unset", cursor: "pointer", display: "block", textAlign: "left" }}>
              {m.kind === "attachment" ? (
                <div style={{ background: m.me ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#fff", border: m.me ? "none" : "1px solid " + T.line, borderRadius: 18, padding: 10, boxShadow: "0 2px 8px rgba(16,24,40,.06)" }}>
                  <div style={{ background: "#F7F8FA", border: "1px solid " + T.line, borderRadius: 12, padding: "22px 16px", textAlign: "center" }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /><path d="M9 14h6M9 17h4" /></svg>
                    <div style={{ fontSize: 12.5, fontWeight: 620, color: T.ink, marginTop: 6 }}>Echocardiogram Report.pdf</div>
                    <div style={{ fontSize: 11, color: T.sub }}>2-D &amp; M-Mode · Color flow Doppler · 1.2 MB</div>
                  </div>
                  <div style={{ fontSize: 12, color: m.me ? "rgba(255,255,255,.85)" : T.sub, marginTop: 7, padding: "0 3px" }}>{m.text}</div>
                </div>
              ) : m.kind === "consult" ? (
                <div style={{ background: "#0A0F1E", border: "1px solid #1C2740", borderRadius: 18, padding: "13px 16px", boxShadow: `0 10px 26px rgba(10,15,30,.35), 0 0 0 1.5px ${ACUITY[t.acuity].color}33` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: ACUITY[t.acuity].color }} />
                    <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: "#8DA2CF", letterSpacing: 2 }}>LIVE · CONSULT · <span style={{ color: ACUITY[t.acuity].color }}>{ACUITY[t.acuity].label.toUpperCase()}</span></span>
                    <span style={{ marginLeft: "auto" }}><Glyph level={t.acuity} size={7} gap={1.5} w={3.5} /></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 2.5, marginTop: 11, height: 22 }}>
                    {[6, 12, 8, 16, 10, 20, 14, 8, 12, 18, 9, 15, 7, 11, 17, 10, 6, 13, 8].map((h, j) => (
                      <span key={j} style={{ width: 3, height: h, borderRadius: 2, background: "#2E5CFF", opacity: 0.9 }} />
                    ))}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 12.5, color: "#D7DEF0", lineHeight: 1.6, marginTop: 11 }}>"{m.text}"</div>
                </div>
              ) : (
                <div style={{ background: m.me ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#fff", color: m.me ? "#fff" : T.ink, border: m.me ? "none" : "1px solid " + T.line, borderRadius: m.me ? "20px 20px 6px 20px" : "20px 20px 20px 6px", padding: "11px 15px", fontSize: 14.5, lineHeight: 1.45, boxShadow: m.me ? "0 6px 16px rgba(41,112,255,.22)" : "0 2px 6px rgba(16,24,40,.04)" }}>{m.text}</div>
              )}
            </button>
            <div style={{ fontSize: 10.5, color: T.faint, marginTop: 3.5, textAlign: m.me ? "right" : "left", padding: "0 7px" }}>{m.t}{m.me && "  ✓✓"}</div>
            {sheet === i && (
              <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 16, marginTop: 6, boxShadow: "0 14px 34px rgba(16,24,40,.14)", overflow: "hidden", animation: "rise .2s ease" }}>
                <div style={{ display: "flex", gap: 6, padding: "10px 12px", borderBottom: "1px solid " + T.line }}>
                  {[["✓", "Acknowledge"], ["👍", "Agree"], ["❗", "Escalate"]].map(([e, l]) => (
                    <button key={l} onClick={() => setSheet(null)} style={{ all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 620, color: T.ink, background: "#F7F8FA", border: "1px solid " + T.line, borderRadius: 16, padding: "6px 12px" }}>{e} {l}</button>
                  ))}
                </div>
                {["Reply", "Copy", "Info"].map((a) => (
                  <button key={a} onClick={() => setSheet(null)} style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", display: "block", width: "100%", padding: "11px 16px", fontSize: 14, fontWeight: 550, color: T.ink, borderBottom: a !== "Info" ? "1px solid " + T.line : "none" }}>{a}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: "8px 14px 10px", display: "flex", gap: 8, alignItems: "center" }}>
        <button style={{ all: "unset", cursor: "pointer", width: 42, height: 42, borderRadius: 14, background: "#EDF0F4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message" style={{ ...inputStyle, borderRadius: 24, flex: 1 }} />
        <button onClick={send} style={{ all: "unset", cursor: "pointer", width: 42, height: 42, borderRadius: 21, background: draft.trim() ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : T.ghost, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .2s ease", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19 V5 M6 11 L12 5 L18 11" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Consult detail + AI analysis ──────────────────────────────── */
function ConsultDetail({ t, onBack }) {
  const [fb, setFb] = useState(null);
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "slideIn .32s cubic-bezier(.2,.8,.3,1)" }}>
      <div style={{ background: "rgba(255,255,255,.86)", backdropFilter: "blur(18px)", borderBottom: "1px solid " + T.line, padding: "12px 16px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <Back onClick={onBack} label="" />
        <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 680, color: T.ink, letterSpacing: -0.3 }}>Consult Detail</div>
        <div style={{ width: 30 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 26px" }}>
        <div style={{ background: "#fff", border: "1px solid " + T.line, borderRadius: 20, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 17px", borderBottom: "1px solid " + T.line }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: ACUITY[t.acuity].color }} />
            <span style={{ fontSize: 17.5, fontWeight: 700, color: T.ink, letterSpacing: -0.3 }}>{t.patient}</span>
            <span style={{ marginLeft: "auto" }}><AcuityBadge level={t.acuity} /></span>
          </div>
          <div style={{ padding: "15px 17px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 32, height: 32, borderRadius: 16, background: "linear-gradient(135deg,#2E5CD6,#0F1E52)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><VMark size={16} mono /></span>
            <span style={{ fontSize: 16, fontWeight: 680, color: T.ink }}>ALIS AI™ Clinical Analysis</span>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 620, color: T.blue, border: "1px solid #C9DBFF", borderRadius: 16, padding: "4px 11px" }}>{t.confidence}% confidence</span>
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
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional context or observations (optional)…" rows={3} style={{ ...inputStyle, resize: "none", marginTop: 11, fontSize: 13.5 }} />
                <button disabled={!fb} onClick={() => setSent(true)} style={{ all: "unset", boxSizing: "border-box", cursor: fb ? "pointer" : "default", width: "100%", textAlign: "center", marginTop: 11, background: fb ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : T.ghost, color: fb ? "#fff" : T.faint, fontSize: 14.5, fontWeight: 650, borderRadius: 14, padding: "13px 0", transition: "all .25s ease" }}>Submit Feedback</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Schedule ──────────────────────────────────────────────────── */
function Schedule() {
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
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 15px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[4, 5, 6, 7, 8].map((d, i) => {
          const days = ["Tue", "Wed", "Thu", "Fri", "Sat"];
          const shifts = SHIFTS[d] || [];
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
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 630, color: T.ink }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{s.time}</div>
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

/* ── Tab bar ───────────────────────────────────────────────────── */
function TabBar({ tab, setTab, unread, onNew }) {
  const Item = ({ k, label, icon, badge }) => (
    <button onClick={() => setTab(k)} style={{ all: "unset", cursor: "pointer", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "9px 0 7px", position: "relative" }}>
      <span style={{ position: "relative" }}>
        {icon(tab === k ? T.blue : T.faint)}
        {badge > 0 && <span style={{ position: "absolute", top: -5, right: -9, minWidth: 16, height: 16, borderRadius: 8, background: T.red, color: "#fff", fontSize: 9.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" }}>{badge}</span>}
      </span>
      <span style={{ fontSize: 10, fontWeight: tab === k ? 660 : 520, color: tab === k ? T.blue : T.faint }}>{label}</span>
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-end", background: "rgba(255,255,255,.92)", backdropFilter: "blur(20px)", borderTop: "1px solid " + T.line, paddingBottom: 6 }}>
      <Item k="inbox" label="Inbox" badge={unread} icon={(c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.35-4.1-1L3 21l1.5-5.4A8.5 8.5 0 1 1 21 12Z" /></svg>} />
      <Item k="team" label="Team" icon={(c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20c0-3.4 3-5.6 6.5-5.6S15.5 16.6 15.5 20" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.7c2.9.3 5 2.2 5 5.3" /></svg>} />
      <button onClick={onNew} style={{ all: "unset", cursor: "pointer", width: 54, height: 54, borderRadius: 27, background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 8px 12px", boxShadow: "0 10px 24px rgba(41,112,255,.4)", flexShrink: 0 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <Item k="alis" label="ALIS AI" icon={(c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" /><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" /></svg>} />
      <Item k="schedule" label="Schedule" icon={(c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M8 3v4M16 3v4M3.5 10.5h17" /></svg>} />
    </div>
  );
}

/* ── Floating Virtualis quick-action FAB ───────────────────────── */
function VFab({ onConsult, onAlis, onPage }) {
  const [open, setOpen] = useState(false);
  const actions = [
    { label: "STAT Page On-Call", sub: "Cardiology · Dr. E. Vasquez", color: T.red, run: () => onPage("stat"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg> },
    { label: "Page On-Call", sub: "Routine callback", color: T.amber, run: () => onPage("routine"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><rect x="4" y="6" width="16" height="12" rx="3" /><path d="M8 10h8M8 13.5h5" /></svg> },
    { label: "New Consult", sub: "Structured request", color: T.blue, run: onConsult, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg> },
    { label: "Ask ALIS AI™", sub: "Clinical assistant", color: T.blueDeep, run: onAlis, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" /></svg> },
  ];
  return (
    <>
      {open && <div onClick={() => setOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(16,24,40,.32)", backdropFilter: "blur(2px)", zIndex: 40, animation: "fadeIn .2s ease" }} />}
      <div style={{ position: "absolute", right: 16, bottom: 96, zIndex: 41, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {open && actions.map((a, i) => (
          <button key={a.label} onClick={() => { setOpen(false); a.run(); }} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, animation: `rise .22s ${(actions.length - 1 - i) * 0.04}s cubic-bezier(.2,.8,.3,1) backwards` }}>
            <span style={{ background: "#fff", borderRadius: 13, padding: "7px 13px", boxShadow: "0 8px 20px rgba(16,24,40,.16)", textAlign: "right" }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 650, color: T.ink }}>{a.label}</span>
              <span style={{ display: "block", fontSize: 11, color: T.sub }}>{a.sub}</span>
            </span>
            <span style={{ width: 44, height: 44, borderRadius: 22, background: `linear-gradient(135deg, ${a.color}, ${a.color}CC)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 18px ${a.color}55`, flexShrink: 0 }}>{a.icon}</span>
          </button>
        ))}
        <button onClick={() => setOpen(!open)} style={{ all: "unset", cursor: "pointer", width: 58, height: 58, borderRadius: 29, background: "linear-gradient(135deg,#2E5CD6,#0F1E52)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 28px rgba(27,63,160,.42)", transform: open ? "rotate(45deg) scale(1.04)" : "rotate(0)", transition: "transform .28s cubic-bezier(.2,.8,.3,1)" }}>
          <VMark size={28} mono />
        </button>
      </div>
    </>
  );
}

/* ── Acuity Routing™ — the patented moment, made visible ───────── */
function RoutingScreen({ payload }) {
  const a = ACUITY[payload.acuity];
  const steps = [
    { t: "Acuity triaged", d: `${a.label} — glyph assigned`, delay: 0.2 },
    { t: "On-call matched", d: `Dr. E. Vasquez · ${payload.spec} · 96% match`, delay: 1.0 },
    { t: "Secure notification delivered", d: "Read-receipt tracking active", delay: 1.8 },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 70, background: "linear-gradient(180deg,#0E1A3E 0%,#12275E 55%,#1B3FA0 130%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px", animation: "fadeIn .3s ease", color: "#fff" }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2.4, color: "#8FB6FF", textTransform: "uppercase" }}>Acuity Routing</div>
      <div style={{ fontSize: 23, fontWeight: 730, letterSpacing: -0.5, marginTop: 6, textAlign: "center" }}>Routing your consult</div>

      <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 38 }}>
        <div style={{ width: 74, height: 74, borderRadius: 22, background: "rgba(255,255,255,.07)", border: `1.5px solid ${a.color}88`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 34px ${a.glow}`, animation: "glowPulse 1.6s ease-in-out infinite" }}>
          <Glyph level={payload.acuity} size={15} gap={2.5} w={6} />
        </div>
        <div style={{ display: "flex", gap: 5, margin: "0 12px" }}>
          {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 3, background: "#8FB6FF", animation: `flow 1.2s ${i * 0.14}s ease-in-out infinite` }} />)}
        </div>
        <div style={{ width: 74, height: 74, borderRadius: "50%", background: "linear-gradient(135deg,#F2F6FE,#DCE7FA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 650, color: T.blueDeep, border: "2.5px solid rgba(255,255,255,.5)", boxShadow: "0 0 30px rgba(143,182,255,.4)" }}>EV</div>
      </div>

      <div style={{ width: "100%", maxWidth: 330, marginTop: 40, display: "flex", flexDirection: "column", gap: 13 }}>
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

      <div style={{ position: "absolute", bottom: 34, display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#7E9BE8", letterSpacing: 0.3 }}>
        <VMark size={15} mono /> Acuity-based clinical routing · patent pending
      </div>
    </div>
  );
}

/* ── App shell ─────────────────────────────────────────────────── */
export default function VirtualisApp() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("inbox");
  const [threads, setThreads] = useState(INITIAL_THREADS);
  const [acked, setAcked] = useState(new Set());
  const [liveCounts, setLiveCounts] = useState({});
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [consulting, setConsulting] = useState(false);
  const [routing, setRouting] = useState(null);
  const [toast, setToast] = useState(null);

  const unread = threads.filter((t) => !acked.has(t.id)).length;
  const activeThread = threads.find((t) => t.id === openId);
  const detailThread = threads.find((t) => t.id === detailId);

  const openThread = (id) => { setAcked((s) => new Set(s).add(id)); setOpenId(id); };
  const openFromStaff = (s) => {
    if (s.threadId) { openThread(s.threadId); setTab("inbox"); return; }
    const id = Math.max(...threads.map((t) => t.id)) + 1;
    const nt = { id, name: s.name, context: s.dept, patient: "—", room: "—", time: "Now", acuity: "routine", newCount: 0, reason: "", confidence: 0, msgs: [] };
    setThreads((th) => [nt, ...th]); setAcked((a) => new Set(a).add(id)); setOpenId(id); setTab("inbox");
  };
  const sendConsult = (payload) => {
    setConsulting(false);
    setRouting(payload);
    setTimeout(() => {
      const { patient, reason, acuity, spec } = payload;
      const id = Math.max(...threads.map((t) => t.id)) + 1;
      const nt = { id, name: "Dr. Elena Vasquez", context: `Tele-${spec} · On-Call`, patient, room: "—", time: "Now", acuity, newCount: 0, reason, confidence: 0, team: false,
        msgs: [{ me: true, who: "You", kind: "consult", text: reason, t: "Now" }] };
      setThreads((th) => [nt, ...th]); setAcked((a) => new Set(a).add(id));
      setRouting(null); setTab("inbox");
      setToast(`Routed · ${ACUITY[acuity].label} · ${spec} on-call`);
      setTimeout(() => setToast(null), 2600);
    }, 3200);
  };

  let body;
  if (!authed) body = <Login onSignIn={() => setAuthed(true)} />;
  else if (routing) body = <RoutingScreen payload={routing} />;
  else if (consulting) body = <NewConsult onBack={() => setConsulting(false)} onSend={sendConsult} />;
  else if (detailThread) body = <ConsultDetail t={detailThread} onBack={() => setDetailId(null)} />;
  else if (activeThread) body = <Thread t={activeThread} onBack={() => setOpenId(null)} onDetail={() => setDetailId(activeThread.id)} />;
  else body = (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {tab === "inbox" && <Inbox threads={threads} acked={acked} liveCounts={liveCounts} openThread={openThread} filter={filter} setFilter={setFilter} />}
        {tab === "team" && <Directory onChat={openFromStaff} />}
        {tab === "alis" && <Alis />}
        {tab === "schedule" && <Schedule />}
      </div>
      {tab !== "alis" && (
        <VFab
          onConsult={() => setConsulting(true)}
          onAlis={() => setTab("alis")}
          onPage={(kind) => {
            setToast(kind === "stat" ? "STAT page sent · Dr. E. Vasquez · Cardiology on-call" : "Page sent · on-call will call back");
            setTimeout(() => setToast(null), 2600);
          }}
        />
      )}
      <TabBar tab={tab} setTab={setTab} unread={unread} onNew={() => setConsulting(true)} />
    </>
  );

  return (
    <div style={{ fontFamily: font, background: T.bg, height: "100vh", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", WebkitFontSmoothing: "antialiased", overflow: "hidden", position: "relative" }}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(28px); opacity:.4 } to { transform: translateX(0); opacity:1 } }
        @keyframes rise { from { transform: translateY(12px); opacity:0 } to { transform: translateY(0); opacity:1 } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes drift { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-14px,10px) } }
        @keyframes eq { from { transform: scaleY(.4) } to { transform: scaleY(1) } }
        @keyframes blink { 0%,100% { opacity:.25 } 50% { opacity:1 } }
        @keyframes pulseRing { 0% { transform: scale(.85); opacity:.7 } 100% { transform: scale(1.25); opacity:0 } }
        @keyframes spinSlow { to { transform: rotate(360deg) } }
        @keyframes flow { 0%,100% { opacity:.25; transform: translateX(0) } 50% { opacity:1; transform: translateX(3px) } }
        @keyframes glowPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.05) } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important } }
        button:focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; border-radius: 12px }
        ::placeholder { color: ${T.faint} }
        ::-webkit-scrollbar { display: none }
      `}</style>
      <div style={{ position: "absolute", top: -140, left: -80, width: 340, height: 340, background: "radial-gradient(circle, rgba(76,141,255,.14), transparent 65%)", pointerEvents: "none", animation: "drift 14s ease-in-out infinite", zIndex: 0 }} />
      {toast && (
        <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "#101828", color: "#fff", fontSize: 13, fontWeight: 600, borderRadius: 22, padding: "10px 18px", boxShadow: "0 10px 26px rgba(16,24,40,.3)", animation: "rise .3s ease", whiteSpace: "nowrap" }}>✓ {toast}</div>
      )}
      {body}
    </div>
  );
}
