import { useMemo, useState } from "react";
import {
  T, font, mono, ACUITY, FACILITIES, useMediaQuery, KEYFRAMES,
} from "./virtualis/theme";
import { VMark, Avatar, Glyph, Wordmark } from "./virtualis/ui";
import { INITIAL_THREADS, ME, credentialedFacilities } from "./virtualis/data";
import Inbox from "./virtualis/Inbox";
import Thread from "./virtualis/Thread";
import Alis from "./virtualis/Alis";
import Telehealth from "./virtualis/Telehealth";
import {
  Login, Directory, Schedule, NewConsult, ConsultDetail, RoutingScreen, Credentials,
} from "./virtualis/screens";

/* ═══ VIRTUALIS® · intelligent medicine ════════════════════════════
   Responsive clinical workstation. Mobile: tab shell with push
   navigation. Tablet/desktop: persistent rail + inbox + thread panes.
   Acuity Routing™ glyphs: ||| Critical · || Urgent · | Routine.  ═══ */

const TABS = [
  { k: "inbox", label: "Inbox", icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.35-4.1-1L3 21l1.5-5.4A8.5 8.5 0 1 1 21 12Z" /></svg> },
  { k: "team", label: "Team", icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20c0-3.4 3-5.6 6.5-5.6S15.5 16.6 15.5 20" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.7c2.9.3 5 2.2 5 5.3" /></svg> },
  { k: "alis", label: "ALIS AI", icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" /><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" /></svg> },
  { k: "schedule", label: "Schedule", icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M8 3v4M16 3v4M3.5 10.5h17" /></svg> },
];

function TabBar({ tab, setTab, unread, onNew }) {
  const Item = ({ t: item }) => (
    <button onClick={() => setTab(item.k)} style={{ all: "unset", cursor: "pointer", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "9px 0 7px" }}>
      <span style={{ position: "relative" }}>
        {item.icon(tab === item.k ? T.blue : T.faint)}
        {item.k === "inbox" && unread > 0 && <span style={{ position: "absolute", top: -5, right: -9, minWidth: 16, height: 16, borderRadius: 8, background: T.red, color: "#fff", fontSize: 9.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" }}>{unread}</span>}
      </span>
      <span style={{ fontSize: 10, fontWeight: tab === item.k ? 660 : 520, color: tab === item.k ? T.blue : T.faint }}>{item.label}</span>
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-end", background: "rgba(255,255,255,.92)", backdropFilter: "blur(20px)", borderTop: "1px solid " + T.line, paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}>
      <Item t={TABS[0]} /><Item t={TABS[1]} />
      <button onClick={onNew} aria-label="New consult" style={{ all: "unset", cursor: "pointer", width: 54, height: 54, borderRadius: 27, background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 8px 12px", boxShadow: "0 10px 24px rgba(41,112,255,.4)", flexShrink: 0 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <Item t={TABS[2]} /><Item t={TABS[3]} />
    </div>
  );
}

function Rail({ tab, setTab, unread, onNew, onProfile, wide }) {
  return (
    <div style={{ width: wide ? 216 : 78, flexShrink: 0, background: "linear-gradient(180deg,#0E1A3E,#12275E)", display: "flex", flexDirection: "column", alignItems: wide ? "stretch" : "center", padding: wide ? "18px 14px" : "18px 0", gap: 8, color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: wide ? "0 4px 12px" : "0 0 12px", justifyContent: wide ? "flex-start" : "center" }}>
        <VMark size={30} mono />
        {wide && <span style={{ fontSize: 18, fontWeight: 740, letterSpacing: -0.5 }}>virtualis<span style={{ fontSize: 9, verticalAlign: "super" }}>®</span></span>}
      </div>
      {TABS.map((item) => {
        const on = tab === item.k;
        return (
          <button key={item.k} onClick={() => setTab(item.k)} title={item.label} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 11, padding: wide ? "11px 12px" : "11px 0", justifyContent: wide ? "flex-start" : "center", borderRadius: 14, background: on ? "rgba(255,255,255,.14)" : "transparent", position: "relative" }}>
            <span style={{ position: "relative", display: "inline-flex" }}>
              {item.icon(on ? "#fff" : "#8DA2CF")}
              {item.k === "inbox" && unread > 0 && <span style={{ position: "absolute", top: -5, right: -8, minWidth: 16, height: 16, borderRadius: 8, background: T.red, color: "#fff", fontSize: 9.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unread}</span>}
            </span>
            {wide && <span style={{ fontSize: 14, fontWeight: on ? 660 : 540, color: on ? "#fff" : "#AFC6FF" }}>{item.label}</span>}
          </button>
        );
      })}
      <button onClick={onNew} style={{ all: "unset", cursor: "pointer", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)", borderRadius: 16, padding: wide ? "12px 0" : "12px 0", width: wide ? "100%" : 46, boxShadow: "0 8px 20px rgba(41,112,255,.35)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        {wide && <span style={{ fontSize: 14, fontWeight: 650 }}>New consult</span>}
      </button>
      <button onClick={onProfile} style={{ all: "unset", cursor: "pointer", marginTop: "auto", display: "flex", alignItems: "center", gap: 10, justifyContent: wide ? "flex-start" : "center" }}>
        <Avatar initials={ME.initials} team size={36} />
        {wide && <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 640 }}>{ME.name}</span>
          <span style={{ display: "block", fontSize: 11, color: "#8DA2CF" }}>{ME.credentials.length} facilities</span>
        </span>}
      </button>
    </div>
  );
}

function FacilityBar({ scope, active, setActive, counts }) {
  const items = [{ id: "all", name: "All facilities", short: "ALL", hue: T.blueDeep }, ...scope.map((id) => FACILITIES[id])];
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10 }}>
      {items.map((f) => {
        const on = active === f.id;
        const n = counts[f.id] || 0;
        return (
          <button key={f.id} onClick={() => setActive(f.id)} style={{ all: "unset", cursor: "pointer", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 20, padding: "8px 14px", background: on ? f.hue : "#fff", border: `1px solid ${on ? f.hue : T.line}`, color: on ? "#fff" : T.ink, fontSize: 13, fontWeight: 620, transition: "all .2s ease" }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: on ? "#fff" : f.hue }} />
            {f.name}
            {n > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: on ? "#fff" : f.hue, background: on ? "rgba(255,255,255,.22)" : f.hue + "16", borderRadius: 10, padding: "1px 7px" }}>{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

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
        <button onClick={() => setOpen(!open)} aria-label="Quick actions" style={{ all: "unset", cursor: "pointer", width: 58, height: 58, borderRadius: 29, background: "linear-gradient(135deg,#2E5CD6,#0F1E52)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 28px rgba(27,63,160,.42)", transform: open ? "rotate(45deg) scale(1.04)" : "rotate(0)", transition: "transform .28s cubic-bezier(.2,.8,.3,1)" }}>
          <VMark size={28} mono />
        </button>
      </div>
    </>
  );
}

export default function VirtualisApp() {
  const isDesktop = useMediaQuery("(min-width: 1100px)");
  const isTablet = useMediaQuery("(min-width: 760px)");
  const multiPane = isTablet;

  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("inbox");
  const [threads, setThreads] = useState(INITIAL_THREADS);
  const [acked, setAcked] = useState(new Set());
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [facility, setFacility] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [consulting, setConsulting] = useState(false);
  const [routing, setRouting] = useState(null);
  const [creds, setCreds] = useState(false);
  const [toast, setToast] = useState(null);

  const scope = useMemo(() => credentialedFacilities(), []);
  /* Credentialing gate: nothing outside the physician's privileges is
     ever rendered, whatever the active facility filter is. */
  const visible = threads.filter((t) => scope.includes(t.facility));
  const scoped = visible.filter((t) => facility === "all" || t.facility === facility);
  const unread = visible.filter((t) => !acked.has(t.id)).length;
  const criticalUnread = visible.filter((t) => t.acuity === "critical" && !acked.has(t.id)).length;
  const perFacility = visible.reduce((m, t) => (acked.has(t.id) ? m : { ...m, [t.facility]: (m[t.facility] || 0) + 1, all: (m.all || 0) + 1 }), {});

  const activeThread = threads.find((t) => t.id === openId);
  const detailThread = threads.find((t) => t.id === detailId);
  const videoThread = threads.find((t) => t.id === videoId);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };
  const openThread = (id) => { setAcked((s) => new Set(s).add(id)); setOpenId(id); };
  const openFromStaff = (s) => {
    if (s.threadId) { openThread(s.threadId); setTab("inbox"); return; }
    const id = Math.max(...threads.map((t) => t.id)) + 1;
    setThreads((th) => [{ id, name: s.name, context: s.dept, facility: s.facility, patient: "—", room: "—", time: "Now", ageSec: 0, acuity: "routine", newCount: 0, reason: "", confidence: 0, msgs: [] }, ...th]);
    setAcked((a) => new Set(a).add(id)); setOpenId(id); setTab("inbox");
  };
  const sendConsult = (payload) => {
    setConsulting(false);
    setRouting(payload);
    setTimeout(() => {
      const { patient, reason, acuity, spec, facility: fac, telehealth } = payload;
      const id = Math.max(...threads.map((t) => t.id)) + 1;
      setThreads((th) => [{ id, name: "Dr. Elena Vasquez", context: `Tele-${spec} · On-Call`, facility: fac, patient, room: "—", time: "Now", ageSec: 0, acuity, newCount: 0, reason, confidence: 91, msgs: [{ me: true, who: "You", kind: "consult", text: reason, t: "Now" }] }, ...th]);
      setAcked((a) => new Set(a).add(id));
      setRouting(null); setTab("inbox"); setOpenId(id);
      if (telehealth) setVideoId(id);
      flash(`Routed · ${ACUITY[acuity].label} · ${spec} on-call`);
    }, 3200);
  };

  const inboxHeader = (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        {!multiPane && <VMark size={32} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 2.2, color: T.blue, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: T.blue }} /> LIVE · ACUITY INBOX
          </div>
          <div style={{ fontSize: 21, fontWeight: 730, letterSpacing: -0.6, color: T.ink, marginTop: 3 }}>Hello, Dr. Hussain</div>
          <div style={{ fontSize: 12.5, color: T.sub, marginTop: 1 }}>
            Tuesday, Aug 4 ·{" "}
            {criticalUnread > 0 ? <span style={{ color: T.red, fontWeight: 600 }}>{criticalUnread} critical unread</span>
              : unread > 0 ? <span style={{ color: T.blue, fontWeight: 600 }}>{unread} unread</span>
              : <span style={{ color: T.green, fontWeight: 600 }}>all caught up</span>}
          </div>
        </div>
        {!multiPane && (
          <button onClick={() => setCreds(true)} style={{ all: "unset", cursor: "pointer", marginLeft: "auto" }}><Avatar initials={ME.initials} team size={40} /></button>
        )}
      </div>
      <div style={{ marginTop: 13 }}>
        <FacilityBar scope={scope} active={facility} setActive={setFacility} counts={perFacility} />
      </div>
    </div>
  );

  const inboxPane = (
    <Inbox threads={scoped} acked={acked} liveCounts={{}} openThread={openThread} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} selectedId={multiPane ? openId : null} header={inboxHeader} />
  );

  const emptyPane = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 32, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: 32, background: "#fff", border: "1px solid " + T.line, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(16,24,40,.06)" }}><VMark size={32} /></div>
      <Wordmark size={20} />
      <div style={{ fontSize: 14, color: T.sub, maxWidth: 320, lineHeight: 1.5 }}>Select a consult to open the thread, patient context, and one-tap telehealth.</div>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        {["critical", "urgent", "routine"].map((k) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: T.sub, background: "#fff", border: "1px solid " + T.line, borderRadius: 14, padding: "6px 11px" }}>
            <Glyph level={k} size={9} gap={2} w={3.5} /> {ACUITY[k].label}
          </span>
        ))}
      </div>
    </div>
  );

  const pushed =
    consulting ? <NewConsult onBack={() => setConsulting(false)} onSend={sendConsult} facilityScope={scope} defaultFacility={facility === "all" ? ME.homeFacility : facility} />
    : detailThread ? <ConsultDetail t={detailThread} onBack={() => setDetailId(null)} />
    : null;

  let content;
  if (!authed) {
    content = <Login onSignIn={() => setAuthed(true)} />;
  } else if (!multiPane) {
    content = pushed || (activeThread
      ? <Thread t={activeThread} onBack={() => setOpenId(null)} onDetail={() => setDetailId(activeThread.id)} onVideo={() => setVideoId(activeThread.id)} />
      : (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {tab === "inbox" && inboxPane}
            {tab === "team" && <Directory onChat={openFromStaff} facilityScope={scope} />}
            {tab === "alis" && <Alis />}
            {tab === "schedule" && <Schedule facilityScope={scope} />}
          </div>
          {tab !== "alis" && <VFab onConsult={() => setConsulting(true)} onAlis={() => setTab("alis")} onPage={(k) => flash(k === "stat" ? "STAT page sent · Dr. E. Vasquez · Cardiology on-call" : "Page sent · on-call will call back")} />}
          <TabBar tab={tab} setTab={setTab} unread={unread} onNew={() => setConsulting(true)} />
        </>
      ));
  } else {
    const secondary =
      pushed ? pushed
      : tab === "inbox" ? (activeThread
          ? <Thread t={activeThread} embedded onDetail={() => setDetailId(activeThread.id)} onVideo={() => setVideoId(activeThread.id)} onBack={() => setOpenId(null)} />
          : emptyPane)
      : tab === "team" ? <Directory onChat={openFromStaff} facilityScope={scope} />
      : tab === "alis" ? <Alis />
      : <Schedule facilityScope={scope} />;

    content = (
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Rail tab={tab} setTab={setTab} unread={unread} wide={isDesktop} onNew={() => setConsulting(true)} onProfile={() => setCreds(true)} />
        {tab === "inbox" && (
          <div style={{ width: isDesktop ? 400 : 340, flexShrink: 0, borderRight: "1px solid " + T.line, display: "flex", flexDirection: "column", minHeight: 0, background: T.bg }}>
            {inboxPane}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0, background: tab === "inbox" ? "#FBFCFE" : T.bg }}>
          {secondary}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: font, background: T.bg, minHeight: "100dvh", height: "100dvh", display: "flex", flexDirection: "column", WebkitFontSmoothing: "antialiased", overflow: "hidden", position: "relative", color: T.ink }}>
      <style>{KEYFRAMES}</style>
      <div style={{ position: "absolute", top: -140, left: -80, width: 340, height: 340, background: "radial-gradient(circle, rgba(76,141,255,.14), transparent 65%)", pointerEvents: "none", animation: "drift 14s ease-in-out infinite", zIndex: 0 }} />
      {toast && (
        <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 90, background: "#101828", color: "#fff", fontSize: 13, fontWeight: 600, borderRadius: 22, padding: "10px 18px", boxShadow: "0 10px 26px rgba(16,24,40,.3)", animation: "rise .3s ease", maxWidth: "90%" }}>✓ {toast}</div>
      )}
      {content}
      {routing && <RoutingScreen payload={routing} />}
      {videoThread && <Telehealth t={videoThread} onEnd={() => { setVideoId(null); flash("Encounter note saved to " + (FACILITIES[videoThread.facility]?.emr || "chart")); }} />}
      {creds && <Credentials onClose={() => setCreds(false)} />}
    </div>
  );
}
