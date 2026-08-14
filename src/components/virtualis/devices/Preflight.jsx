import { useEffect } from "react";
import { T } from "../theme";
import { TRUST } from "@/lib/telehealth/status";
import { MINTTI_FIELD } from "./fleet.data";

export default function Preflight({ cart, video, mintti, onClose, onBeam }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const rows = [
    {
      k: "Virtualis request",
      t: cart.state === "requested" ? "available" : "test",
      why:
        cart.state === "requested"
          ? "Pending request from the bedside team"
          : "No active request — prototype state",
    },
    { k: "HelloCare video handoff", t: video.level, why: video.reason },
    { k: "Mintti stethoscope host", t: mintti.level, why: mintti.reason },
    {
      k: "Stethoscope assignment",
      t: cart.mintti === "ready" ? "available" : cart.mintti === "assigned" ? "available" : "setup",
      why: `${MINTTI_FIELD[cart.mintti].label} by the bedside team (not device-detected)`,
    },
    {
      k: "Bedside nurse",
      t: cart.nurse === "Unassigned" ? "setup" : "available",
      why: cart.nurse === "Unassigned" ? "No nurse assigned to this cart" : cart.nurse,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preflight for ${cart.name}`}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "rgba(16,24,40,.35)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "min(560px, 100%)",
          borderRadius: "22px 22px 0 0",
          padding: "16px 16px calc(18px + env(safe-area-inset-bottom, 0px))",
          display: "grid",
          gap: 12,
          maxHeight: "86%",
          overflowY: "auto",
          animation: "rise .25s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 730 }}>Preflight · {cart.name}</div>
          <button
            onClick={onClose}
            aria-label="Close preflight"
            style={{
              all: "unset",
              cursor: "pointer",
              marginLeft: "auto",
              fontSize: 13,
              fontWeight: 640,
              color: T.sub,
            }}
          >
            Close
          </button>
        </div>

        {rows.map((r) => {
          const tr = TRUST[r.t];
          return (
            <div
              key={r.k}
              style={{
                border: "1px solid " + T.line,
                borderRadius: 14,
                padding: "10px 12px",
                display: "grid",
                gap: 3,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 640 }}>{r.k}</span>
                <span
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11.5,
                    fontWeight: 680,
                    color: tr.tone,
                    background: tr.soft,
                    border: "1px solid " + tr.tone + "33",
                    borderRadius: 20,
                    padding: "2px 9px",
                  }}
                >
                  <span aria-hidden style={{ fontSize: 9 }}>
                    {tr.mark}
                  </span>
                  {tr.label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: T.sub }}>{r.why}</div>
            </div>
          );
        })}

        <button
          onClick={() => onBeam(cart)}
          style={{
            all: "unset",
            cursor: "pointer",
            textAlign: "center",
            background: T.blue,
            color: "#fff",
            borderRadius: 14,
            padding: "12px 0",
            fontSize: 14,
            fontWeight: 680,
          }}
        >
          {video.level === "live"
            ? "Join live session"
            : video.level === "available"
              ? "Open HelloCare handoff"
              : "Beam in · preview session"}
        </button>
      </div>
    </div>
  );
}
