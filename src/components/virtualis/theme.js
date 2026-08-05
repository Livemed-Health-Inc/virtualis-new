import { useEffect, useState } from "react";

export const T = {
  bg: "#F4F5F7",
  card: "#FFFFFF",
  ink: "#0B0F1A",
  sub: "#667085",
  faint: "#98A2B3",
  line: "#EAECF0",
  blue: "#2E5CFF",
  blueDeep: "#1B3FA0",
  blueSoft: "#EFF4FF",
  red: "#F04438",
  amber: "#F79009",
  green: "#12B76A",
  ghost: "#EDF0F4",
};

export const mono = '"SF Mono", ui-monospace, Menlo, Consolas, monospace';
export const font =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, sans-serif';

export const ACUITY = {
  critical: { bars: 3, color: T.red, glow: "rgba(240,68,56,.35)", label: "Critical", sla: 300 },
  urgent: { bars: 2, color: T.amber, glow: "rgba(247,144,9,.35)", label: "Urgent", sla: 1800 },
  routine: { bars: 1, color: T.green, glow: "rgba(18,183,106,.3)", label: "Routine", sla: 14400 },
};

/* Each facility gets its own accent so a physician covering several
   hospitals can scan the inbox by colour. */
export const FACILITIES = {
  saint: { id: "saint", name: "Saint Anthony", short: "SAH", hue: "#2E5CFF", emr: "Epic" },
  edgerton: {
    id: "edgerton",
    name: "Edgerton Regional",
    short: "EDG",
    hue: "#7B5BF2",
    emr: "Cerner",
  },
  mercy: { id: "mercy", name: "Mercy West", short: "MCW", hue: "#0EA5A5", emr: "Meditech" },
  northline: {
    id: "northline",
    name: "Northline Children's",
    short: "NLC",
    hue: "#E8590C",
    emr: "Epic",
  },
};

export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid " + T.line,
  background: "#fff",
  borderRadius: 14,
  padding: "13px 15px",
  fontSize: 15,
  fontFamily: font,
  outline: "none",
  color: T.ink,
};

export const card = (accent) => ({
  background: "#fff",
  border: "1px solid " + (accent || T.line),
  borderRadius: 20,
  boxShadow: "0 2px 6px rgba(16,24,40,.04)",
});

export function useMediaQuery(query) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

export const KEYFRAMES = `
  @keyframes slideIn { from { transform: translateX(28px); opacity:.4 } to { transform: translateX(0); opacity:1 } }
  @keyframes rise { from { transform: translateY(12px); opacity:0 } to { transform: translateY(0); opacity:1 } }
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  @keyframes drift { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-14px,10px) } }
  @keyframes eq { from { transform: scaleY(.4) } to { transform: scaleY(1) } }
  @keyframes blink { 0%,100% { opacity:.25 } 50% { opacity:1 } }
  @keyframes pulseRing { 0% { transform: scale(.85); opacity:.7 } 100% { transform: scale(1.25); opacity:0 } }
  @keyframes spinSlow { to { transform: rotate(360deg) } }
  @keyframes flow { 0%,100% { opacity:.25; transform: translateX(0) } 50% { opacity:1; transform: translateX(3px) } }
  @keyframes barIn { from { transform: scaleY(.2); opacity:0 } to { transform: scaleY(1); opacity:1 } }
  @keyframes acuityPulse { 0%,100% { opacity:1 } 50% { opacity:.45 } }
  @keyframes logoPulse { 0%,100% { transform: scale(1); opacity:1 } 50% { transform: scale(1.03); opacity:.95 } }
  @keyframes ringExpand { 0% { transform: scale(.92); opacity:.55 } 100% { transform: scale(1.35); opacity:0 } }
  @keyframes pixelFloat1 { 0%,100% { transform: translate(0,0) } 25% { transform: translate(4px,-6px) } 50% { transform: translate(-2px,-10px) } 75% { transform: translate(-6px,-4px) } }
  @keyframes pixelFloat2 { 0%,100% { transform: translate(0,0) } 25% { transform: translate(-5px,4px) } 50% { transform: translate(3px,8px) } 75% { transform: translate(6px,2px) } }
  @keyframes pixelFloat3 { 0%,100% { transform: translate(0,0) } 33% { transform: translate(6px,2px) } 66% { transform: translate(-4px,6px) } }
  @keyframes orbit { to { transform: rotate(360deg) } }
  @keyframes orbitBack { to { transform: rotate(-360deg) } }
  @keyframes ecgTrace { to { stroke-dashoffset: -300 } }
  @keyframes fanOut { from { transform: translate(0,0) scale(.35); opacity:0 } to { transform: translate(var(--fx), var(--fy)) scale(1); opacity:1 } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important } }
  button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; border-radius: 12px }
  ::placeholder { color: ${T.faint} }
  ::-webkit-scrollbar { width: 8px; height: 8px }
  ::-webkit-scrollbar-thumb { background: #D8DDE6; border-radius: 8px }
  ::-webkit-scrollbar-track { background: transparent }
  .vx-hscroll { overflow-x: auto; overflow-y: hidden; scrollbar-width: none; -ms-overflow-style: none; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 10px, #000 calc(100% - 22px), transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 10px, #000 calc(100% - 22px), transparent 100%); }
  .vx-hscroll::-webkit-scrollbar { display: none }
  .vx-hscroll > * { scroll-snap-align: start }
`;

