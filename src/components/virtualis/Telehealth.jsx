import { useEffect, useState } from "react";
import { T, mono, VMark, Avatar, VideoIcon, FacilityChip, useTicker, fmtClock } from "./ui";

const VITALS = [
  { k: "HR", v: "104", u: "bpm", warn: true },
  { k: "BP", v: "96/58", u: "mmHg", warn: true },
  { k: "SpO₂", v: "94", u: "%" },
  { k: "Temp", v: "38.1", u: "°C", warn: true },
  { k: "RR", v: "22", u: "/min" },
];

export default function Telehealth({ t, onEnd }) {
  const [stage, setStage] = useState("waiting"); // waiting → live
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [scribe, setScribe] = useState(true);
  const elapsed = useTicker(0, stage === "live");

  useEffect(() => {
    if (stage !== "waiting") return;
    const id = setTimeout(() => setStage("live"), 2400);
    return () => clearTimeout(id);
  }, [stage]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 75,
        background: "#080C16",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
        animation: "fadeIn .25s ease",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontFamily: mono,
            fontSize: 10.5,
            fontWeight: 650,
            letterSpacing: 1.6,
            color: stage === "live" ? "#FF6A5E" : "#8DA2CF",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              background: stage === "live" ? "#FF6A5E" : "#8DA2CF",
              animation: stage === "live" ? "acuityPulse 1.4s infinite" : "none",
            }}
          />
          {stage === "live" ? `LIVE · ${fmtClock(elapsed)}` : "CONNECTING"}
        </span>
        <FacilityChip id={t.facility} />
        <span style={{ marginLeft: "auto", fontSize: 12.5, color: "#AFC6FF" }}>
          HIPAA-secure room · end-to-end encrypted
        </span>
      </div>

      {/* stage */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: "0 16px",
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr",
          alignContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            borderRadius: 24,
            overflow: "hidden",
            background: "radial-gradient(circle at 50% 35%, #1B2C57, #0B1223 70%)",
            border: "1px solid rgba(255,255,255,.08)",
            minHeight: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {stage === "waiting" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ position: "relative", width: 92, height: 92, margin: "0 auto" }}>
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    background: "rgba(76,141,255,.25)",
                    animation: "pulseRing 1.7s ease-out infinite",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 12,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#4C8DFF,#1B3FA0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <VideoIcon s={30} />
                </div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 680, marginTop: 16 }}>Waiting room</div>
              <div style={{ fontSize: 13, color: "#AFC6FF", marginTop: 4 }}>
                Admitting {t.patient} · consent on file
              </div>
            </div>
          ) : (
            <>
              <Avatar
                initials={t.patient
                  .split(" ")
                  .map((w) => w[0])
                  .join("")}
                size={96}
              />
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  bottom: 14,
                  background: "rgba(8,12,22,.6)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 14,
                  padding: "7px 12px",
                  fontSize: 13,
                  fontWeight: 620,
                }}
              >
                {t.patient} · Rm {t.room}
              </div>
              <div
                style={{
                  position: "absolute",
                  right: 14,
                  bottom: 14,
                  width: 96,
                  height: 128,
                  borderRadius: 16,
                  background: "linear-gradient(135deg,#22345F,#111B33)",
                  border: "1px solid rgba(255,255,255,.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  fontWeight: 650,
                  color: "#CBD9F7",
                }}
              >
                {cam ? "You" : "Camera off"}
              </div>
            </>
          )}
        </div>

        {/* vitals strip */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {VITALS.map((v) => (
            <div
              key={v.k}
              style={{
                flex: "1 0 auto",
                minWidth: 92,
                background: "rgba(255,255,255,.05)",
                border: `1px solid ${v.warn ? "rgba(247,144,9,.4)" : "rgba(255,255,255,.1)"}`,
                borderRadius: 16,
                padding: "10px 13px",
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.4, color: "#8DA2CF" }}>
                {v.k}
              </div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  color: v.warn ? "#FFC46B" : "#fff",
                  marginTop: 2,
                }}
              >
                {v.v}
                <span style={{ fontSize: 11, fontWeight: 500, color: "#8DA2CF", marginLeft: 3 }}>
                  {v.u}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(46,92,214,.16)",
            border: "1px solid rgba(143,182,255,.24)",
            borderRadius: 18,
            padding: "11px 14px",
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: "linear-gradient(135deg,#2E5CD6,#0F1E52)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <VMark size={15} mono />
          </span>
          <span style={{ fontSize: 13, color: "#DCE6FF", flex: 1 }}>
            {scribe ? "ALIS ambient scribe is capturing this encounter." : "Ambient scribe paused."}
          </span>
          <button
            onClick={() => setScribe((s) => !s)}
            style={{
              all: "unset",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 640,
              color: "#fff",
              background: scribe ? "rgba(255,255,255,.16)" : T.blue,
              borderRadius: 14,
              padding: "6px 12px",
            }}
          >
            {scribe ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      {/* controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          padding: "16px 16px 22px",
          flexWrap: "wrap",
        }}
      >
        {[
          {
            on: mic,
            toggle: () => setMic((v) => !v),
            label: mic ? "Mute" : "Unmute",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M6 11a6 6 0 0 0 12 0h-1.6a4.4 4.4 0 0 1-8.8 0H6Z" />
              </svg>
            ),
          },
          {
            on: cam,
            toggle: () => setCam((v) => !v),
            label: cam ? "Stop video" : "Start video",
            icon: <VideoIcon s={20} />,
          },
        ].map((c) => (
          <button
            key={c.label}
            onClick={c.toggle}
            title={c.label}
            style={{
              all: "unset",
              cursor: "pointer",
              width: 54,
              height: 54,
              borderRadius: 27,
              background: c.on ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.32)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {c.icon}
          </button>
        ))}
        <button
          onClick={onEnd}
          style={{
            all: "unset",
            cursor: "pointer",
            height: 54,
            borderRadius: 27,
            background: "linear-gradient(135deg,#F35B50,#D92D20)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 660,
            padding: "0 26px",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 10px 24px rgba(240,68,56,.35)",
          }}
        >
          End visit
        </button>
      </div>
    </div>
  );
}
