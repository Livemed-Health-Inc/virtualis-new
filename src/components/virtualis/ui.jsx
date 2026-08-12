import { useEffect, useState } from "react";
import { T, mono, font, ACUITY, FACILITIES, inputStyle } from "./theme";
import logo from "@/assets/virtualis-lockup.png.asset.json";
import vmark from "@/assets/v-mark.png.asset.json";

/* Trademarked V mark. `mono` renders it white for dark surfaces. */
export function VMark({ size = 30, mono: white }) {
  return (
    <img
      src={vmark.url}
      alt="Virtualis"
      style={{
        height: size,
        width: "auto",
        maxWidth: "100%",
        display: "block",
        flexShrink: 0,
        objectFit: "contain",
        filter: white ? "brightness(0) invert(1)" : "none",
      }}
    />
  );
}

/* Full lockup from the trademark artwork — fluid, never wider than its box. */
export function Lockup({ height = 34, light }) {
  return (
    <img
      src={logo.url}
      alt="Virtualis — intelligent medicine"
      style={{
        height: `clamp(${Math.round(height * 0.85)}px, ${height / 5}vw, ${Math.round(height * 1.3)}px)`,
        width: "auto",
        maxWidth: "100%",
        objectFit: "contain",
        display: "block",
        filter: light ? "brightness(0) invert(1)" : "none",
      }}
    />
  );
}

/* Centered hero logo: the trademarked V inside a clinical comms halo —
   an ECG trace ring, soft pulse rings, and orbiting care icons. */
const HALO_ICONS = [
  // message bubble
  <path key="m" d="M4 6h16v10H9l-5 4V6Z" />,
  // heart / vitals
  <path key="h" d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20Z" />,
  // video visit
  <g key="v">
    <rect x="3" y="7" width="12" height="10" rx="2.6" />
    <path d="M15 11l6-3.2v8.4L15 13Z" />
  </g>,
  // care plus
  <path key="p" d="M12 5v14M5 12h14" />,
];

export function AnimatedLogo({ size = 140 }) {
  const orbitR = size * 0.62;
  const chip = size * 0.24;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {[0, 1.6].map((d) => (
        <span
          key={d}
          style={{
            position: "absolute",
            inset: -size * 0.1,
            borderRadius: "50%",
            border: `1.5px solid ${T.blue}26`,
            animation: "ringExpand 3.4s ease-out infinite",
            animationDelay: `${d}s`,
          }}
        />
      ))}

      {/* ECG trace circling the mark */}
      <svg
        viewBox="0 0 200 200"
        style={{
          position: "absolute",
          inset: -size * 0.24,
          width: size * 1.48,
          height: size * 1.48,
          overflow: "visible",
        }}
      >
        <circle cx="100" cy="100" r="86" fill="none" stroke={`${T.blue}1A`} strokeWidth="1.2" />
        <circle
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke={T.blue}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="26 514"
          style={{ animation: "ecgTrace 5.5s linear infinite" }}
        />
      </svg>

      {/* Orbiting clinical icons */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          animation: "orbit 22s linear infinite",
        }}
      >
        {HALO_ICONS.map((icon, i) => {
          const a = (i / HALO_ICONS.length) * Math.PI * 2;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `calc(50% + ${Math.cos(a) * orbitR}px - ${chip / 2}px)`,
                top: `calc(50% + ${Math.sin(a) * orbitR}px - ${chip / 2}px)`,
                width: chip,
                height: chip,
                borderRadius: chip / 2,
                background: "rgba(255,255,255,.86)",
                border: `1px solid ${T.blue}26`,
                boxShadow: `0 6px 16px ${T.blue}1F`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "orbitBack 22s linear infinite",
              }}
            >
              <svg
                width={chip * 0.54}
                height={chip * 0.54}
                viewBox="0 0 24 24"
                fill="none"
                stroke={T.blue}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {icon}
              </svg>
            </span>
          );
        })}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          animation: "logoPulse 4s ease-in-out infinite",
          filter: `drop-shadow(0 ${size * 0.08}px ${size * 0.12}px ${T.blue}25)`,
        }}
      >
        <VMark size={size * 0.66} />
      </div>
    </div>
  );
}


export function Wordmark({ size = 22, light }) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 760,
        letterSpacing: -0.6,
        color: light ? "#fff" : T.ink,
        lineHeight: 1,
      }}
    >
      virtualis
      <span style={{ fontSize: size * 0.45, verticalAlign: "super", fontWeight: 600 }}>®</span>
    </span>
  );
}

export function Glyph({ level, size = 16, gap = 3, w = 6, pulse }) {
  const a = ACUITY[level];
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap }} aria-label={a.label}>
      {Array.from({ length: a.bars }).map((_, i) => (
        <span
          key={i}
          style={{
            width: w,
            height: size,
            borderRadius: 3.5,
            background: `linear-gradient(180deg, ${a.color}, ${a.color}D9)`,
            boxShadow: `0 0 10px ${a.glow}`,
            animation: pulse
              ? `acuityPulse 1.6s ${i * 0.12}s ease-in-out infinite`
              : `barIn .34s ${i * 0.06}s cubic-bezier(.2,.8,.3,1) backwards`,
          }}
        />
      ))}
    </span>
  );
}

export function AcuityBadge({ level }) {
  const a = ACUITY[level];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: a.color + "14",
        border: `1px solid ${a.color}40`,
        borderRadius: 20,
        padding: "5px 12px",
        fontSize: 12,
        fontWeight: 650,
        color: a.color,
        whiteSpace: "nowrap",
      }}
    >
      <Glyph level={level} size={7} gap={1.5} w={3.5} /> {a.label}
    </span>
  );
}

export function FacilityChip({ id, showEmr, full }) {
  const f = FACILITIES[id];
  if (!f) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 620,
        color: f.hue,
        background: f.hue + "12",
        border: `1px solid ${f.hue}30`,
        borderRadius: 14,
        padding: "2.5px 9px",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: f.hue }} />
      {full ? f.name : f.short}
      {showEmr && <span style={{ color: T.faint, fontWeight: 500 }}>· {f.emr}</span>}
    </span>
  );
}

export function Avatar({ initials, team, size = 46, online }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: team
            ? "linear-gradient(135deg,#4C8DFF,#1B3FA0)"
            : "linear-gradient(135deg,#F2F6FE,#DCE7FA)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.32,
          fontWeight: 600,
          color: team ? "#fff" : T.blueDeep,
          boxShadow: "inset 0 0 0 1px rgba(27,63,160,.08)",
        }}
      >
        {initials}
      </div>
      {online != null && (
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 1,
            width: 11,
            height: 11,
            borderRadius: 6,
            background: online ? T.green : T.faint,
            border: "2.5px solid #fff",
          }}
        />
      )}
    </div>
  );
}

export const Back = ({ onClick, label = "Back" }) => (
  <button
    onClick={onClick}
    style={{
      all: "unset",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      color: T.blue,
      fontSize: 15,
      fontWeight: 570,
      gap: 2,
      padding: "4px 6px 4px 0",
    }}
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={T.blue}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5 L8 12 L15 19" />
    </svg>
    {label}
  </button>
);

export const PersonIcon = ({ c = "#F27059" }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth="2.3"
    strokeLinecap="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
);
export const DoorIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#3B9BF5"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="3" width="12" height="18" rx="1.5" />
    <circle cx="15" cy="12" r="0.9" fill="#3B9BF5" />
  </svg>
);
export const VideoIcon = ({ c = "#fff", s = 15 }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2.5" y="6" width="13" height="12" rx="3" />
    <path d="M15.5 11 L21.5 7.5v9L15.5 13Z" />
  </svg>
);

export function Empty({ title, sub, icon }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px", animation: "fadeIn .3s ease" }}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          background: "#fff",
          border: "1px solid " + T.line,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 14px rgba(16,24,40,.05)",
        }}
      >
        {icon || <VMark size={26} />}
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 650, color: T.ink, marginTop: 12 }}>{title}</div>
      {sub && (
        <div style={{ fontSize: 13, color: T.sub, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>
      )}
    </div>
  );
}

export function ScreenHeader({ title, onBack, right }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.86)",
        backdropFilter: "blur(18px)",
        borderBottom: "1px solid " + T.line,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {onBack && <Back onClick={onBack} label="" />}
      <div
        style={{
          flex: 1,
          textAlign: onBack ? "center" : "left",
          fontSize: 17,
          fontWeight: 680,
          color: T.ink,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </div>
      <div style={{ minWidth: 30, display: "flex", justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
}

/* Seconds since arrival, ticking — powers escalation countdowns. */
export function useTicker(startSec = 0, on = true) {
  const [sec, setSec] = useState(startSec);
  useEffect(() => {
    if (!on) return;
    const i = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [on]);
  return sec;
}

export const fmtClock = (s) =>
  `${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

export { T, mono, font, ACUITY, FACILITIES, inputStyle };

/* Patient identity: MRN when we have it, otherwise name + facility. Used to
   thread every consult for the same patient into one conversation group. */
export const patientKey = (t) =>
  t.mrn ? `mrn:${String(t.mrn).toLowerCase()}` : `${(t.patient || "").toLowerCase()}|${t.facility}`;

const RANK = { critical: 0, urgent: 1, routine: 2 };

export function groupByPatient(threads) {
  const map = new Map();
  threads.forEach((t) => {
    const k = patientKey(t);
    const g = map.get(k) || {
      key: k,
      patient: t.patient,
      room: t.room,
      mrn: t.mrn,
      facility: t.facility,
      acuity: t.acuity,
      unread: 0,
      time: t.time,
      threads: [],
    };
    if (RANK[t.acuity] < RANK[g.acuity]) g.acuity = t.acuity;
    g.unread += t.newCount || 0;
    g.threads.push(t);
    map.set(k, g);
  });
  return [...map.values()]
    .map((g) => ({
      ...g,
      threads: g.threads.sort((a, b) => RANK[a.acuity] - RANK[b.acuity]),
      time: g.threads[0]?.time,
    }))
    .sort((a, b) => RANK[a.acuity] - RANK[b.acuity] || b.unread - a.unread);
}
