import { T, FACILITIES } from "../theme";
import Telehealth from "../Telehealth";
import { TRUST } from "@/lib/telehealth/status";

/* Beam-in workspace. Stays inside Virtualis. When the HelloCare adapter is
   not configured the session is explicitly a non-live preview. */
export default function SessionWorkspace({ session, video, mintti, onEnd, onAuscultate }) {
  const { cart, mode } = session;
  const t = {
    facility: cart.facility,
    patient: cart.patient || "Unassigned patient",
    room: cart.room,
  };
  const live = mode === "live"; /* reserved for a future confirmed callback */
  const handoff = mode === "handoff";
  const preview = !live;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 78,
        display: "flex",
        flexDirection: "column",
        background: "#0A0F1E",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          zIndex: 82,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          padding: "calc(8px + env(safe-area-inset-top, 0px)) 12px 8px",
        }}
      >
        <span
          role="status"
          style={{
            background: live ? "#E7F8F0" : "#FEF3E2",
            color: live ? "#05603A" : "#B54708",
            border: "1px solid " + (live ? "#12B76A" : "#F79009") + "55",
            borderRadius: 20,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {live
            ? "Live session · HelloCare confirmed"
            : handoff
              ? "HelloCare handoff opened — connection unverified"
              : "Preview session — not a live clinical call"}
        </span>
        <span
          style={{
            background: "rgba(255,255,255,.9)",
            borderRadius: 20,
            padding: "5px 12px",
            fontSize: 11.5,
            fontWeight: 620,
            color: FACILITIES[cart.facility]?.hue || T.blue,
          }}
        >
          {cart.name} · Rm {cart.room}
        </span>
        <span
          style={{
            background: "rgba(255,255,255,.9)",
            borderRadius: 20,
            padding: "5px 12px",
            fontSize: 11.5,
            fontWeight: 620,
            color: T.sub,
          }}
        >
          Video {TRUST[video.level].label} · Mintti {TRUST[mintti.level].label}
        </span>
        <button
          onClick={onAuscultate}
          style={{
            all: "unset",
            cursor: "pointer",
            background: T.blue,
            color: "#fff",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 680,
          }}
        >
          Open auscultation
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <Telehealth t={t} onEnd={onEnd} />
      </div>
    </div>
  );
}
