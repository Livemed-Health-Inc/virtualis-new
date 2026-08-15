import { useState } from "react";
import { T, ACUITY } from "./theme";
import { Glyph } from "./ui";
import { useHandoff } from "@/lib/virtualis/useHandoff";

/* Compact on-call surface: availability, ready-to-round and live bedside
   requests. Floats above the workstation so an alert is never missed. */

const pill = (accent, solid) => ({
  all: "unset",
  cursor: "pointer",
  boxSizing: "border-box",
  padding: "7px 12px",
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: 660,
  textAlign: "center",
  color: solid ? "#fff" : T.ink,
  background: solid ? accent : "#fff",
  border: "1px solid " + (solid ? accent : T.line),
});

export default function OnCall() {
  const { incoming, activeEncounter, available, readyToRound, setAvailable, setReadyToRound, respond } =
    useHandoff();
  const [open, setOpen] = useState(false);
  const expanded = open || incoming.length > 0;

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(8px + env(safe-area-inset-top, 0px))",
        right: 12,
        zIndex: 60,
        width: expanded ? "min(320px, calc(100vw - 24px))" : "auto",
        display: "grid",
        gap: 8,
        background: "rgba(255,255,255,.92)",
        backdropFilter: "blur(14px)",
        border: "1px solid " + T.line,
        borderRadius: 16,
        padding: 10,
        boxShadow: "0 10px 30px rgba(16,60,120,.12)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            borderRadius: 9,
            background: available ? T.green : T.faint,
            flexShrink: 0,
          }}
        />
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ ...pill(T.blue, false), border: "none", padding: 0, flex: 1, textAlign: "left" }}
          aria-expanded={expanded}
        >
          {available ? "On call" : "Unavailable"}
          {incoming.length > 0 ? ` · ${incoming.length} waiting` : ""}
        </button>
      </div>

      {expanded && (
        <>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              style={{ ...pill(T.blue, available), flex: 1 }}
              onClick={() => setAvailable(!available)}
            >
              {available ? "Go unavailable" : "Go on call"}
            </button>
            <button
              style={{ ...pill(T.green, readyToRound), flex: 1 }}
              onClick={() => setReadyToRound(!readyToRound)}
            >
              {readyToRound ? "Rounding alert on" : "Ready to round"}
            </button>
          </div>

          {incoming.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid " + T.line,
                borderRadius: 12,
                padding: 10,
                background: T.blueSoft,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Glyph level={r.urgency} size={13} />
                <div style={{ fontSize: 13.5, fontWeight: 700, flex: 1, minWidth: 0 }}>
                  {r.specialty}
                  <span style={{ color: T.sub, fontWeight: 560 }}>
                    {" · "}
                    {r.mode === "call" ? "Virtual encounter" : "Consult"}
                  </span>
                </div>
                <span style={{ fontSize: 11.5, color: ACUITY[r.urgency]?.color }}>
                  {ACUITY[r.urgency]?.label}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  style={{ ...pill(T.blue, true), flex: 1 }}
                  onClick={() => respond(r.id, "accepted")}
                >
                  Accept
                </button>
                <button style={{ ...pill(T.line, false) }} onClick={() => respond(r.id, "declined")}>
                  Decline
                </button>
              </div>
            </div>
          ))}

          {activeEncounter && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 12.5, color: T.sub, flex: 1 }}>
                In {activeEncounter.specialty} encounter
              </div>
              <button
                style={pill(T.red, false)}
                onClick={() => respond(activeEncounter.id, "ended")}
              >
                End
              </button>
            </div>
          )}

          {!incoming.length && !activeEncounter && (
            <div style={{ fontSize: 12, color: T.sub }}>
              {available ? "No bedside requests waiting." : "You will not receive bedside requests."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
