import { useState, useEffect } from "react";
import { T, font, mono, ACUITY, FACILITIES, useMediaQuery, KEYFRAMES } from "./virtualis/theme";
import { VMark, Avatar, Glyph, Wordmark, patientKey } from "./virtualis/ui";
import { VirtualisProvider, useVirtualis } from "@/lib/virtualis/store";
import Inbox from "./virtualis/Inbox";
import Thread from "./virtualis/Thread";
import Alis from "./virtualis/Alis";
import Telehealth from "./virtualis/Telehealth";
import Auscultation from "./virtualis/Auscultation";
import {
  Login,
  SetPassword,
  Directory,
  Schedule,
  NewConsult,
  ConsultDetail,
  RoutingScreen,
} from "./virtualis/screens";
import { Account } from "./virtualis/Account";
import NewMessage from "./virtualis/NewMessage";

/* ═══ VIRTUALIS® · intelligent medicine ════════════════════════════
   Responsive clinical workstation. Mobile: tab shell with push
   navigation. Tablet/desktop: persistent rail + inbox + thread panes.
   Acuity Routing™ glyphs: ||| Critical · || Urgent · | Routine.  ═══ */

const TABS = [
  {
    k: "inbox",
    label: "Inbox",
    icon: (c) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.35-4.1-1L3 21l1.5-5.4A8.5 8.5 0 1 1 21 12Z" />
      </svg>
    ),
  },
  {
    k: "team",
    label: "Team",
    icon: (c) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2.5 20c0-3.4 3-5.6 6.5-5.6S15.5 16.6 15.5 20" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M16.5 14.7c2.9.3 5 2.2 5 5.3" />
      </svg>
    ),
  },
  {
    k: "alis",
    label: "ALIS AI",
    icon: (c) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
        <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" />
      </svg>
    ),
  },
  {
    k: "schedule",
    label: "Schedule",
    icon: (c) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="3.5" y="5" width="17" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3.5 10.5h17" />
      </svg>
    ),
  },
  {
    k: "devices",
    label: "Devices",
    icon: (c) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4.5" width="14" height="10" rx="2.5" />
        <path d="M10 14.5V21M6.5 21h7M17 8h3.5v9H17" />
      </svg>
    ),
  },
  {
    k: "more",
    label: "More",
    icon: (c) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={c}>
        <circle cx="5" cy="12" r="1.9" />
        <circle cx="12" cy="12" r="1.9" />
        <circle cx="19" cy="12" r="1.9" />
      </svg>
    ),
  },
];

const byKey = (k) => TABS.find((t) => t.k === k);

/* Provider-like roles get the dedicated Devices tab; anything unrecognised
   keeps access so the default "Virtual Provider" is never locked out. */
const NON_PROVIDER = /nurse|rn\b|tech|admin|coordinator|clerk/i;
export const canUseDevices = (role) => !NON_PROVIDER.test(role || "");

function TabBar({ tab, setTab, unread, items, onMore }) {
  const Item = ({ t: item }) => (
    <button
      onClick={() => (item.k === "more" ? onMore() : setTab(item.k))}
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: 0,
        height: 44,
        minHeight: 44,
        justifyContent: "center",
      }}
    >
      <span style={{ position: "relative", display: "inline-flex", transform: "scale(.9)" }}>
        {item.icon(tab === item.k ? T.blue : T.faint)}
        {item.k === "inbox" && unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -9,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: T.red,
              color: "#fff",
              fontSize: 9.5,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: "2px solid #fff",
            }}
          >
            {unread}
          </span>
        )}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: tab === item.k ? 660 : 520,
          color: tab === item.k ? T.blue : T.faint,
        }}
      >
        {item.label}
      </span>
    </button>
  );
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,.92)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid " + T.line,
        minHeight: 44,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxSizing: "content-box",
      }}
    >
      <Item t={items[0]} />
      <Item t={items[1]} />
      {/* Space for the floating V trigger, which overlays this slot. */}
      <span style={{ width: 54, margin: "0 8px", flexShrink: 0 }} aria-hidden />

      <Item t={items[2]} />
      <Item t={items[3]} />
    </div>
  );
}

/* Mobile "More": keeps Team, Schedule and Account one tap away while the
   bottom bar surfaces Devices. */
function MoreSheet({ onClose, onPick, onProfile, showDevices }) {
  const rows = [
    { k: "team", label: "Team directory" },
    { k: "schedule", label: "Schedule" },
    ...(showDevices ? [] : [{ k: "devices", label: "Devices" }]),
  ];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="More"
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 84,
        background: "rgba(16,24,40,.35)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%",
          borderRadius: "22px 22px 0 0",
          padding: "14px 14px calc(18px + env(safe-area-inset-bottom, 0px))",
          display: "grid",
          gap: 8,
          animation: "rise .25s ease",
        }}
      >
        {rows.map((r) => (
          <button
            key={r.k}
            onClick={() => {
              onPick(r.k);
              onClose();
            }}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "13px 14px",
              borderRadius: 14,
              border: "1px solid " + T.line,
              fontSize: 14.5,
              fontWeight: 620,
            }}
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={() => {
            onProfile();
            onClose();
          }}
          style={{
            all: "unset",
            cursor: "pointer",
            padding: "13px 14px",
            borderRadius: 14,
            border: "1px solid " + T.line,
            fontSize: 14.5,
            fontWeight: 620,
          }}
        >
          Account
        </button>
        <button
          onClick={onClose}
          style={{
            all: "unset",
            cursor: "pointer",
            textAlign: "center",
            padding: "12px 0",
            fontSize: 13.5,
            fontWeight: 620,
            color: T.sub,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function Rail({ tab, setTab, unread, onNew, onNewMessage, onProfile, wide, me, items }) {
  return (
    <div
      style={{
        width: wide ? 216 : 78,
        flexShrink: 0,
        background: "linear-gradient(180deg,#0E1A3E,#12275E)",
        display: "flex",
        flexDirection: "column",
        alignItems: wide ? "stretch" : "center",
        padding: wide ? "18px 14px" : "18px 0",
        gap: 8,
        color: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: wide ? "0 4px 12px" : "0 0 12px",
          justifyContent: wide ? "flex-start" : "center",
        }}
      >
        <VMark size={30} mono />
        {wide && (
          <span style={{ fontSize: 18, fontWeight: 740, letterSpacing: -0.5 }}>
            virtualis<span style={{ fontSize: 9, verticalAlign: "super" }}>®</span>
          </span>
        )}
      </div>
      {items.map((item) => {
        const on = tab === item.k;
        return (
          <button
            key={item.k}
            onClick={() => setTab(item.k)}
            title={item.label}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: wide ? "11px 12px" : "11px 0",
              justifyContent: wide ? "flex-start" : "center",
              borderRadius: 14,
              background: on ? "rgba(255,255,255,.14)" : "transparent",
              position: "relative",
            }}
          >
            <span style={{ position: "relative", display: "inline-flex" }}>
              {item.icon(on ? "#fff" : "#8DA2CF")}
              {item.k === "inbox" && unread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    background: T.red,
                    color: "#fff",
                    fontSize: 9.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {unread}
                </span>
              )}
            </span>
            {wide && (
              <span
                style={{ fontSize: 14, fontWeight: on ? 660 : 540, color: on ? "#fff" : "#AFC6FF" }}
              >
                {item.label}
              </span>
            )}
          </button>
        );
      })}
      <button
        onClick={onNew}
        style={{
          all: "unset",
          cursor: "pointer",
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
          borderRadius: 16,
          padding: wide ? "12px 0" : "12px 0",
          width: wide ? "100%" : 46,
          boxShadow: "0 8px 20px rgba(41,112,255,.35)",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {wide && <span style={{ fontSize: 14, fontWeight: 650 }}>New consult</span>}
      </button>
      <button
        onClick={onNewMessage}
        title="New message"
        style={{
          all: "unset",
          cursor: "pointer",
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "rgba(255,255,255,.12)",
          border: "1px solid rgba(255,255,255,.16)",
          borderRadius: 16,
          padding: "10px 0",
          width: wide ? "100%" : 46,
          boxSizing: "border-box",
        }}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#DCE7FF"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5Z" />
        </svg>
        {wide && (
          <span style={{ fontSize: 13.5, fontWeight: 620, color: "#DCE7FF" }}>New message</span>
        )}
      </button>
      <button
        onClick={onProfile}
        style={{
          all: "unset",
          cursor: "pointer",
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: wide ? "flex-start" : "center",
        }}
      >
        <Avatar initials={me.initials} team size={36} />
        {wide && (
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 640 }}>{me.name}</span>
            <span style={{ display: "block", fontSize: 11, color: "#8DA2CF" }}>
              {me.credentials.length} facilities
            </span>
          </span>
        )}
      </button>
    </div>
  );
}

function FacilityBar({ scope, active, setActive, counts, compact }) {
  const items = [
    { id: "all", name: "All facilities", short: "ALL", hue: T.blueDeep },
    ...scope.map((id) => FACILITIES[id]),
  ];
  return (
    <div
      className="vx-hscroll"
      style={{ display: "flex", gap: 8, paddingBottom: compact ? 4 : 10 }}
    >
      {items.map((f) => {
        const on = active === f.id;
        const n = counts[f.id] || 0;
        return (
          <button
            key={f.id}
            onClick={() => setActive(f.id)}
            style={{
              all: "unset",
              cursor: "pointer",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              borderRadius: 20,
              padding: compact ? "5px 11px" : "8px 14px",
              background: on ? f.hue : "#fff",
              border: `1px solid ${on ? f.hue : T.line}`,
              color: on ? "#fff" : T.ink,
              fontSize: compact ? 12 : 13,
              fontWeight: 620,
              transition: "all .2s ease",
            }}
          >
            <span
              style={{ width: 7, height: 7, borderRadius: 4, background: on ? "#fff" : f.hue }}
            />
            {f.name}
            {n > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: on ? "#fff" : f.hue,
                  background: on ? "rgba(255,255,255,.22)" : f.hue + "16",
                  borderRadius: 10,
                  padding: "1px 7px",
                }}
              >
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function VFab({ onConsult, onAlis, onMessage, onTelehealth, onAuscultate, float }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const Icon = ({ children }) => (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke={T.card}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );

  const actions = [
    {
      label: "Consult",
      icon: (
        <Icon>
          <path d="M12 5v14M5 12h14" />
        </Icon>
      ),
      run: onConsult,
    },
    {
      label: "Message",
      icon: (
        <Icon>
          <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5Z" />
        </Icon>
      ),
      run: onMessage,
    },
    {
      label: "Video",
      icon: (
        <Icon>
          <rect x="2.5" y="6" width="13" height="12" rx="3" />
          <path d="M15.5 11 L21.5 7.5v9L15.5 13Z" />
        </Icon>
      ),
      run: onTelehealth,
    },
    {
      label: "ALIS",
      icon: (
        <Icon>
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
        </Icon>
      ),
      run: onAlis,
    },
    {
      label: "Auscult",
      icon: (
        <Icon>
          <path d="M6 3v5a4 4 0 0 0 8 0V3" />
          <path d="M10 12v3a5 5 0 0 0 10 0v-1" />
          <circle cx="20" cy="12" r="2" />
        </Icon>
      ),
      run: onAuscultate,
    },
  ];

  /* Upward fan: on web the V sits in the bottom-right corner, so actions
     bloom up and to the left; on mobile the V is centred above the tab bar. */
  const angles = float ? [176, 158, 140, 122, 104] : [156, 128, 90, 52, 24];
  const radius = float ? 150 : 146;

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "absolute", inset: 0, zIndex: 40, background: "transparent" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          zIndex: 41,
          bottom: float ? 26 : "env(safe-area-inset-bottom, 0px)",
          left: float ? "auto" : 0,
          right: float ? 26 : 0,
          transform: "none",
          display: "flex",
          justifyContent: float ? "flex-end" : "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 56,
            display: "flex",
            flexDirection: "column",
            alignItems: float ? "flex-end" : "center",
          }}
        >
          {open &&
            actions.map((a, i) => {
              const rad = (angles[i] * Math.PI) / 180;
              const fx = Math.cos(rad) * radius;
              const fy = -Math.sin(rad) * radius;
              return (
                <button
                  key={a.label}
                  onClick={() => {
                    setOpen(false);
                    a.run();
                  }}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    boxSizing: "border-box",
                    position: "absolute",
                    left: "50%",
                    bottom: 0,
                    width: 64,
                    marginLeft: -32,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 7,
                    pointerEvents: "auto",
                    "--fx": `${fx}px`,
                    "--fy": `${fy}px`,
                    animation: `fanPop .42s ${i * 0.045}s cubic-bezier(.18,.9,.28,1.06) both`,
                  }}
                >
                  <span
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      background: T.blueDeep,
                      border: `2px solid ${T.card}`,
                      boxShadow: "0 10px 28px rgba(27,63,160,.38), 0 0 0 3px rgba(46,92,255,.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {a.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      letterSpacing: 0.1,
                      color: T.blueDeep,
                      whiteSpace: "nowrap",
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: T.card,
                      border: `1px solid ${T.line}`,
                      boxShadow: "0 4px 12px rgba(27,63,160,.12)",
                    }}
                  >
                    {a.label}
                  </span>
                </button>
              );
            })}

          <button
            onClick={() => setOpen(!open)}
            aria-label="Quick actions"
            aria-expanded={open}
            style={{
              all: "unset",
              cursor: "pointer",
              width: 56,
              height: 56,
              boxSizing: "border-box",
              borderRadius: 28,
              background: "linear-gradient(135deg,#2E5CD6,#0F1E52)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: open
                ? "0 0 0 1px rgba(190,214,255,.45), 0 14px 36px rgba(27,63,160,.55)"
                : "0 12px 28px rgba(27,63,160,.42)",
              transform: open ? "rotate(45deg) scale(.94)" : "none",
              transition: "transform .38s cubic-bezier(.2,.8,.3,1), box-shadow .3s ease",
              pointerEvents: "auto",
            }}
          >
            <div style={{ transform: open ? "rotate(-45deg)" : "none", display: "flex" }}>
              <VMark size={28} mono />
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

export default function VirtualisApp() {
  return (
    <VirtualisProvider>
      <Workstation />
    </VirtualisProvider>
  );
}

function Workstation() {
  // Landscape phones (short but wide) get the full web layout too.
  const isDesktop = useMediaQuery(
    "(min-width: 1100px), (orientation: landscape) and (min-width: 700px)",
  );
  const isTablet = useMediaQuery(
    "(min-width: 760px), (orientation: landscape) and (min-width: 640px)",
  );
  const multiPane = isTablet;

  const {
    ready,
    session,
    me,
    scope,
    staff,
    shifts,
    threads,
    sendMessage,
    createThread,
    markRead,
    signOut,
  } = useVirtualis();

  const [tab, setTab] = useState("inbox");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [facility, setFacility] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [auscultId, setAuscultId] = useState(undefined);
  const [consulting, setConsulting] = useState(false);
  const [composing, setComposing] = useState(false);
  const [routing, setRouting] = useState(null);
  const [creds, setCreds] = useState(false);
  const [toast, setToast] = useState(null);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [more, setMore] = useState(false);

  const showDevices = canUseDevices(me?.role);
  const railTabs = ["inbox", "team", ...(showDevices ? ["devices"] : []), "alis", "schedule"].map(
    byKey,
  );
  const mobileTabs = [
    byKey("inbox"),
    showDevices ? byKey("devices") : byKey("team"),
    byKey("alis"),
    byKey("more"),
  ];
  const fleet = useDeviceFleet(scope);

  const authed = !!session;

  // Invite links return here with an invite/recovery grant; the clinician sets
  // their own password before the workstation opens.
  const [needsPassword, setNeedsPassword] = useState(
    () => typeof window !== "undefined" && /type=(invite|recovery)/.test(window.location.hash),
  );
  useEffect(() => {
    if (needsPassword && typeof window !== "undefined")
      window.history.replaceState(null, "", window.location.pathname);
  }, [needsPassword]);

  /* Signing out must leave nothing behind: every overlay and view
     selection resets the moment the session disappears. */
  useEffect(() => {
    if (authed) return;
    setTab("inbox");
    setFilter("all");
    setQuery("");
    setFacility("all");
    setOpenId(null);
    setDetailId(null);
    setVideoId(null);
    setAuscultId(undefined);
    setConsulting(false);
    setComposing(false);
    setRouting(null);
    setCreds(false);
    setListCollapsed(false);
  }, [authed]);

  /* Credentialing gate: nothing outside the physician's privileges is
     ever rendered — RLS enforces the same rule server-side. */
  const visible = threads.filter((t) => scope.includes(t.facility));
  const scoped = visible.filter((t) => facility === "all" || t.facility === facility);
  const acked = new Set(visible.filter((t) => t.newCount === 0).map((t) => t.id));
  const unread = visible.filter((t) => t.newCount > 0).length;
  const criticalUnread = visible.filter((t) => t.acuity === "critical" && t.newCount > 0).length;
  const perFacility = visible.reduce(
    (m, t) =>
      t.newCount === 0
        ? m
        : { ...m, [t.facility]: (m[t.facility] || 0) + 1, all: (m.all || 0) + 1 },
    {},
  );

  const activeThread = threads.find((t) => t.id === openId);
  const detailThread = threads.find((t) => t.id === detailId);
  const videoThread = threads.find((t) => t.id === videoId);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };
  const openThread = (id) => {
    markRead(id);
    setOpenId(id);
  };
  const openFromStaff = async (s) => {
    setTab("inbox");
    const existing = threads.find((t) => t.name === s.name && t.facility === s.facility);
    if (existing) return openThread(existing.id);
    const id = await createThread({
      name: s.name,
      context: s.dept,
      facility: s.facility,
      acuity: "routine",
    });
    if (id) setOpenId(id);
    else flash("Could not open that conversation");
  };
  const startMessage = async ({ recipients, group, name, text }) => {
    setComposing(false);
    const first = recipients[0];
    const id = await createThread({
      name,
      context: group ? `${recipients.length} providers` : first.dept,
      facility: first.facility,
      acuity: "routine",
      team: group,
      members: recipients.map((r) => r.name).join(" · "),
      reason: text || undefined,
    });
    if (!id) return flash("Could not start that conversation");
    setTab("inbox");
    setOpenId(id);
    flash(
      group ? `Group started · ${recipients.length} providers` : `Chat started · ${first.name}`,
    );
  };

  const sendConsult = (payload) => {
    setConsulting(false);
    setRouting(payload);
    setTimeout(async () => {
      const { patient, mrn, reason, acuity, spec, facility: fac, telehealth } = payload;
      const list = [].concat(spec);
      const group = list.length > 1;
      const id = await createThread({
        name: group ? `${patient} · Group Consult` : `Tele-${list[0]} On-Call`,
        context: group ? `${list.length} specialties` : `Tele-${list[0]} · On-Call`,
        facility: fac,
        patient,
        mrn,
        acuity,
        reason,
        confidence: 91,
        team: group,
        members: list.join(" · "),
      });
      setRouting(null);
      setTab("inbox");
      if (!id) return flash("Consult could not be routed");
      setOpenId(id);
      if (telehealth) setVideoId(id);
      flash(
        `Routed · ${ACUITY[acuity].label} · ${group ? `${list.length} specialties paged` : `${list[0]} on-call`}`,
      );
    }, 3200);
  };

  const inboxHeader = (
    <div style={{ marginBottom: multiPane ? 6 : 7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {!multiPane && <VMark size={26} />}
        <div
          style={{ minWidth: 0, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}
        >
          <div
            style={{
              fontSize: multiPane ? 16 : 16,
              fontWeight: 730,
              letterSpacing: -0.5,
              color: T.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Hello, {me.name.replace(/^Dr\.\s*/, "Dr. ")}
          </div>
          <div style={{ fontSize: 11.5, color: T.sub }}>
            {criticalUnread > 0 ? (
              <span style={{ color: T.red, fontWeight: 600 }}>
                {criticalUnread} critical unread
              </span>
            ) : unread > 0 ? (
              <span style={{ color: T.blue, fontWeight: 600 }}>{unread} unread</span>
            ) : (
              <span style={{ color: T.green, fontWeight: 600 }}>all caught up</span>
            )}
          </div>
        </div>
        {!multiPane && (
          <button
            onClick={() => setComposing(true)}
            title="New message"
            aria-label="New message"
            style={{
              all: "unset",
              cursor: "pointer",
              marginLeft: "auto",
              width: 32,
              height: 32,
              borderRadius: 16,
              background: T.blueSoft,
              border: "1px solid #D6E4FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke={T.blueDeep}
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5Z" />
              <path d="M12 8.5v6M9 11.5h6" />
            </svg>
          </button>
        )}
        {!multiPane && (
          <button onClick={() => setCreds(true)} style={{ all: "unset", cursor: "pointer" }}>
            <Avatar initials={me.initials} team size={32} />
          </button>
        )}
      </div>
      <div style={{ marginTop: multiPane ? 7 : 8 }}>
        <FacilityBar
          scope={scope}
          active={facility}
          setActive={setFacility}
          counts={perFacility}
          compact
        />
      </div>
    </div>
  );

  const inboxPane = (
    <Inbox
      threads={scoped}
      acked={acked}
      liveCounts={{}}
      openThread={openThread}
      filter={filter}
      setFilter={setFilter}
      query={query}
      setQuery={setQuery}
      selectedId={multiPane ? openId : null}
      header={inboxHeader}
    />
  );

  const listToggle = (
    <button
      onClick={() => setListCollapsed((v) => !v)}
      title={listCollapsed ? "Show inbox" : "Collapse inbox"}
      style={{
        all: "unset",
        cursor: "pointer",
        position: "absolute",
        top: "50%",
        left: 0,
        transform: "translateY(-50%)",
        zIndex: 12,
        width: 20,
        height: 56,
        borderRadius: "0 10px 10px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,.7)",
        border: "1px solid " + T.line,
        borderLeft: "none",
        backdropFilter: "blur(14px)",
        boxShadow: "0 6px 18px rgba(16,24,40,.07)",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path
          d={listCollapsed ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}
          stroke={T.sub}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  const pushed = composing ? (
    <NewMessage
      onBack={() => setComposing(false)}
      onStart={startMessage}
      facilityScope={scope}
      staff={staff}
    />
  ) : consulting ? (
    <NewConsult
      onBack={() => setConsulting(false)}
      onSend={sendConsult}
      facilityScope={scope}
      defaultFacility={facility === "all" ? me.homeFacility : facility}
    />
  ) : detailThread ? (
    <ConsultDetail t={detailThread} onBack={() => setDetailId(null)} />
  ) : null;

  const vfab = (float) => (
    <VFab
      float={float}
      onConsult={() => setConsulting(true)}
      onAlis={() => setTab("alis")}
      onMessage={() => setComposing(true)}
      onAuscultate={() => setAuscultId(activeThread ? activeThread.id : null)}
      onTelehealth={() => {
        const target = activeThread || visible[0];
        if (target) {
          setOpenId(target.id);
          setVideoId(target.id);
        } else {
          flash("Open a consult to start a video visit");
        }
      }}
    />
  );

  const related = activeThread
    ? visible.filter((t) => t.id !== activeThread.id && patientKey(t) === patientKey(activeThread))
    : [];

  let content;
  if (!authed) {
    content = ready ? <Login /> : null;
  } else if (needsPassword) {
    content = <SetPassword onDone={() => setNeedsPassword(false)} />;
  } else if (!multiPane) {
    content =
      pushed ||
      (activeThread ? (
        <Thread
          t={activeThread}
          related={related}
          onOpenThread={setOpenId}
          onBack={() => setOpenId(null)}
          onSend={(text) => sendMessage(activeThread.id, text)}
          onDetail={() => setDetailId(activeThread.id)}
          onVideo={() => setVideoId(activeThread.id)}
        />
      ) : (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {tab === "inbox" && inboxPane}
            {tab === "team" && (
              <Directory onChat={openFromStaff} facilityScope={scope} staff={staff} />
            )}
            {tab === "alis" && <Alis />}
            {tab === "schedule" && <Schedule facilityScope={scope} shifts={shifts} />}
          </div>
          {vfab(false)}
          <TabBar tab={tab} setTab={setTab} unread={unread} />
        </>
      ));
  } else {
    const inboxTab = tab === "inbox" && !pushed;
    const expandedInbox = inboxTab && !activeThread;
    const showList = inboxTab && !(activeThread && listCollapsed);

    const secondary = pushed ? (
      pushed
    ) : tab === "inbox" ? (
      activeThread ? (
        <Thread
          t={activeThread}
          related={related}
          onOpenThread={setOpenId}
          embedded
          onSend={(text) => sendMessage(activeThread.id, text)}
          onDetail={() => setDetailId(activeThread.id)}
          onVideo={() => setVideoId(activeThread.id)}
          onBack={() => setOpenId(null)}
        />
      ) : null
    ) : tab === "team" ? (
      <Directory onChat={openFromStaff} facilityScope={scope} staff={staff} />
    ) : tab === "alis" ? (
      <Alis />
    ) : (
      <Schedule facilityScope={scope} shifts={shifts} />
    );

    content = (
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Rail
          me={me}
          tab={tab}
          setTab={setTab}
          unread={unread}
          wide={isDesktop}
          onNew={() => setConsulting(true)}
          onNewMessage={() => setComposing(true)}
          onProfile={() => setCreds(true)}
        />
        {showList && (
          <div
            style={{
              width: expandedInbox
                ? "100%"
                : isDesktop
                  ? "clamp(360px, 30vw, 460px)"
                  : "clamp(344px, 44vw, 400px)",
              flex: expandedInbox ? 1 : "0 0 auto",
              flexShrink: 0,
              borderRight: expandedInbox ? "none" : "1px solid " + T.line,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              minWidth: 0,
              background: T.bg,
              transition: "width .28s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                width: "100%",
                maxWidth: expandedInbox ? 880 : "none",
                margin: expandedInbox ? "0 auto" : 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {inboxPane}
            </div>
          </div>
        )}
        {secondary && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              position: "relative",
              background: tab === "inbox" ? "#FBFCFE" : T.bg,
            }}
          >
            {inboxTab && activeThread && listToggle}
            {secondary}
            {vfab(true)}
          </div>
        )}
        {!secondary && vfab(true)}
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: font,
        background: T.bg,
        minHeight: "100dvh",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        WebkitFontSmoothing: "antialiased",
        overflow: "hidden",
        position: "relative",
        color: T.ink,
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        style={{
          position: "absolute",
          top: -140,
          left: -80,
          width: 340,
          height: 340,
          background: "radial-gradient(circle, rgba(76,141,255,.14), transparent 65%)",
          pointerEvents: "none",
          animation: "drift 14s ease-in-out infinite",
          zIndex: 0,
        }}
      />
      {toast && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 90,
            background: "#101828",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 22,
            padding: "10px 18px",
            boxShadow: "0 10px 26px rgba(16,24,40,.3)",
            animation: "rise .3s ease",
            maxWidth: "90%",
          }}
        >
          ✓ {toast}
        </div>
      )}
      {content}
      {authed && routing && <RoutingScreen payload={routing} />}
      {authed && videoThread && (
        <Telehealth
          t={videoThread}
          onEnd={() => {
            setVideoId(null);
            flash("Encounter note saved to " + (FACILITIES[videoThread.facility]?.emr || "chart"));
          }}
        />
      )}
      {authed && auscultId !== undefined && (
        <Auscultation
          t={visible.find((t) => t.id === auscultId) || null}
          threads={visible}
          onClose={() => setAuscultId(undefined)}
        />
      )}
      {authed && creds && (
        <Account
          onClose={() => setCreds(false)}
          onSchedule={() => setTab("schedule")}
          onSignOut={signOut}
        />
      )}
    </div>
  );
}
