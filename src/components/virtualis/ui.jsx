import { useEffect, useState } from "react";
import { T, mono, font, ACUITY, FACILITIES, inputStyle } from "./theme";
import logo from "@/assets/virtualis-logo.png.asset.json";

/* V mark — SVG redraw of the logo's swoosh + pixel motif so it stays
   crisp at 14px and tintable on dark surfaces. */
export function VMark({ size = 30, mono: white }) {
  const id = "vg" + size + (white ? "m" : "");
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="28" y2="28">
          <stop offset="0" stopColor="#4C8DFF" /><stop offset="1" stopColor="#1B3FA0" />
        </linearGradient>
      </defs>
      <path d="M11 6 C22 8 27 13 25.5 19 C24.2 24.2 19 27.5 14 28" stroke={white ? "rgba(255,255,255,.55)" : "#38A0FF"} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".85" />
      <path d="M6 8 L14.5 26 C15.1 27.3 16.9 27.3 17.5 26 L26 8" stroke={white ? "#fff" : `url(#${id})`} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="3" y="3.6" width="3.4" height="3.4" rx="0.9" fill={white ? "#fff" : "#2E5CFF"} />
      <rect x="7.6" y="1.4" width="2.2" height="2.2" rx="0.7" fill={white ? "#fff" : "#8FB6FF"} opacity="0.9" />
    </svg>
  );
}

/* Full lockup from the trademark artwork. */
export function Lockup({ height = 34 }) {
  return (
    <img
      src={logo.url}
      alt="Virtualis — intelligent medicine"
      style={{ height, width: "auto", display: "block" }}
    />
  );
}

export function Wordmark({ size = 22, light }) {
  return (
    <span style={{ fontSize: size, fontWeight: 760, letterSpacing: -0.6, color: light ? "#fff" : T.ink, lineHeight: 1 }}>
      virtualis<span style={{ fontSize: size * 0.45, verticalAlign: "super", fontWeight: 600 }}>®</span>
    </span>
  );
}

export function Glyph({ level, size = 16, gap = 3, w = 6, pulse }) {
  const a = ACUITY[level];
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap }} aria-label={a.label}>
      {Array.from({ length: a.bars }).map((_, i) => (
        <span key={i} style={{
          width: w, height: size, borderRadius: 3.5,
          background: `linear-gradient(180deg, ${a.color}, ${a.color}D9)`,
          boxShadow: `0 0 10px ${a.glow}`,
          animation: pulse
            ? `acuityPulse 1.6s ${i * 0.12}s ease-in-out infinite`
            : `barIn .34s ${i * 0.06}s cubic-bezier(.2,.8,.3,1) backwards`,
        }} />
      ))}
    </span>
  );
}

export function AcuityBadge({ level }) {
  const a = ACUITY[level];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: a.color + "14", border: `1px solid ${a.color}40`, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 650, color: a.color, whiteSpace: "nowrap" }}>
      <Glyph level={level} size={7} gap={1.5} w={3.5} /> {a.label}
    </span>
  );
}

export function FacilityChip({ id, showEmr }) {
  const f = FACILITIES[id];
  if (!f) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 620, color: f.hue, background: f.hue + "12", border: `1px solid ${f.hue}30`, borderRadius: 14, padding: "2.5px 9px", whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: f.hue }} />
      {f.short}{showEmr && <span style={{ color: T.faint, fontWeight: 500 }}>· {f.emr}</span>}
    </span>
  );
}

export function Avatar({ initials, team, size = 46, online }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: team ? "linear-gradient(135deg,#4C8DFF,#1B3FA0)" : "linear-gradient(135deg,#F2F6FE,#DCE7FA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 600, color: team ? "#fff" : T.blueDeep, boxShadow: "inset 0 0 0 1px rgba(27,63,160,.08)" }}>{initials}</div>
      {online != null && <span style={{ position: "absolute", right: 0, bottom: 1, width: 11, height: 11, borderRadius: 6, background: online ? T.green : T.faint, border: "2.5px solid #fff" }} />}
    </div>
  );
}

export const Back = ({ onClick, label = "Back" }) => (
  <button onClick={onClick} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", color: T.blue, fontSize: 15, fontWeight: 570, gap: 2, padding: "4px 6px 4px 0" }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.blue} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5 L8 12 L15 19" /></svg>{label}
  </button>
);

export const PersonIcon = ({ c = "#F27059" }) => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.3" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>);
export const DoorIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B9BF5" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="3" width="12" height="18" rx="1.5" /><circle cx="15" cy="12" r="0.9" fill="#3B9BF5" /></svg>);
export const VideoIcon = ({ c = "#fff", s = 15 }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="3" /><path d="M15.5 11 L21.5 7.5v9L15.5 13Z" /></svg>);

export function Empty({ title, sub, icon }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px", animation: "fadeIn .3s ease" }}>
      <div style={{ width: 54, height: 54, borderRadius: 27, background: "#fff", border: "1px solid " + T.line, display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(16,24,40,.05)" }}>{icon || <VMark size={26} />}</div>
      <div style={{ fontSize: 15.5, fontWeight: 650, color: T.ink, marginTop: 12 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: T.sub, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

export function ScreenHeader({ title, onBack, right }) {
  return (
    <div style={{ background: "rgba(255,255,255,.86)", backdropFilter: "blur(18px)", borderBottom: "1px solid " + T.line, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0, zIndex: 10 }}>
      {onBack && <Back onClick={onBack} label="" />}
      <div style={{ flex: 1, textAlign: onBack ? "center" : "left", fontSize: 17, fontWeight: 680, color: T.ink, letterSpacing: -0.3 }}>{title}</div>
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
