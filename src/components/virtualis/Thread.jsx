import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "./theme";
import {
  T,
  mono,
  ACUITY,
  inputStyle,
  Avatar,
  Glyph,
  Back,
  PersonIcon,
  DoorIcon,
  VideoIcon,
  FacilityChip,
} from "./ui";

const initialsOf = (n) =>
  n
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function Thread({ t, onBack, onDetail, onVideo, embedded, onSend, related = [], onOpenThread }) {
  const [draft, setDraft] = useState("");
  const [extra, setExtra] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [ackd, setAckd] = useState(false);
  const endRef = useRef(null);
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [relOpen, setRelOpen] = useState(false);
  /* Persisted messages arrive on `t.msgs`; `extra` only holds the optimistic
     echo for the split second before the insert round-trips. */
  const msgs = onSend ? t.msgs : [...t.msgs, ...extra];
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length, t.id]);
  useEffect(() => {
    setExtra([]);
    setAckd(false);
    setSheet(null);
  }, [t.id]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    if (onSend) onSend(text);
    else setExtra((e) => [...e, { me: true, who: "You", text, t: "Now" }]);
    setDraft("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        animation: embedded ? "fadeIn .2s ease" : "slideIn .32s cubic-bezier(.2,.8,.3,1)",
        position: "relative",
        background: T.bg,
      }}
    >
      {isMobile ? (
        <div
          style={{
            background: "rgba(255,255,255,.92)",
            backdropFilter: "blur(18px)",
            borderBottom: "1px solid " + T.line,
            padding: "4px 8px",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!embedded && (
              <button
                onClick={onBack}
                title="Back"
                style={{
                  all: "unset",
                  cursor: "pointer",
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: T.sub,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <button
              onClick={onDetail}
              style={{
                all: "unset",
                cursor: "pointer",
                flex: 1,
                minWidth: 0,
                display: "block",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 13,
                  fontWeight: 660,
                  color: T.ink,
                  letterSpacing: -0.25,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.25,
                }}
              >
                <Glyph level={t.acuity} size={6} gap={1.2} w={2.6} />
                {t.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: T.sub,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.25,
                  marginTop: 1,
                }}
              >
                {t.patient !== "—" ? `${t.patient} · ${t.room}` : t.team ? t.members : t.context}
              </div>
            </button>
            {related.length > 0 && (
              <button
                onClick={() => setRelOpen((v) => !v)}
                title="Other consults"
                style={{
                  all: "unset",
                  cursor: "pointer",
                  flexShrink: 0,
                  height: 26,
                  minWidth: 26,
                  padding: "0 6px",
                  borderRadius: 13,
                  background: relOpen ? T.blueSoft : "#fff",
                  border: "1px solid " + T.line,
                  color: T.blueDeep,
                  fontSize: 10.5,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +{related.length}
              </button>
            )}
            <button
              onClick={onVideo}
              title="Video"
              style={{
                all: "unset",
                cursor: "pointer",
                background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
                borderRadius: 14,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 3px 10px rgba(41,112,255,.28)",
              }}
            >
              <VideoIcon />
            </button>
          </div>
          {relOpen && related.length > 0 && (
            <div className="vx-hscroll" style={{ display: "flex", gap: 5, marginTop: 5, paddingBottom: 2 }}>
              {related.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRelOpen(false);
                    onOpenThread?.(r.id);
                  }}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: T.ink,
                    background: "#fff",
                    border: "1px solid " + T.line,
                    borderRadius: 14,
                    padding: "4px 8px",
                  }}
                >
                  <Glyph level={r.acuity} size={6} gap={1.2} w={2.8} />
                  {r.team ? r.members : r.context}
                  {r.newCount > 0 && (
                    <span
                      style={{
                        minWidth: 14,
                        height: 14,
                        borderRadius: 7,
                        padding: "0 4px",
                        background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {r.newCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,255,255,.86)",
            backdropFilter: "blur(18px)",
            borderBottom: "1px solid " + T.line,
            padding: "12px 14px 10px",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!embedded && <Back onClick={onBack} label="" />}
            <Avatar initials={initialsOf(t.name)} team={t.team} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 660,
                  color: T.ink,
                  letterSpacing: -0.25,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <FacilityChip id={t.facility} />
                <span
                  style={{
                    fontSize: 11.5,
                    color: T.sub,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.team ? t.members : t.context}
                </span>
              </div>
            </div>
            <button
              onClick={onVideo}
              title="Start telehealth visit"
              style={{
                all: "unset",
                cursor: "pointer",
                background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 640,
                borderRadius: 20,
                padding: "9px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
                boxShadow: "0 6px 16px rgba(41,112,255,.28)",
              }}
            >
              <VideoIcon />
              Video
            </button>
            <button
              title="Voice call"
              style={{
                all: "unset",
                cursor: "pointer",
                background: "#101828",
                color: "#fff",
                borderRadius: 20,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
              </svg>
            </button>
          </div>
          {t.patient !== "—" && (
            <button
              onClick={onDetail}
              style={{
                all: "unset",
                boxSizing: "border-box",
                cursor: "pointer",
                marginTop: 10,
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: T.blueSoft,
                border: "1px solid #D6E4FF",
                borderRadius: 13,
                padding: "9px 13px",
                flexWrap: "wrap",
              }}
            >
              <PersonIcon c={T.blueDeep} />
              <span style={{ fontSize: 13, color: T.blueDeep, fontWeight: 620 }}>{t.patient}</span>
              <span style={{ color: "#C3D5F7" }}>|</span>
              <DoorIcon />
              <span style={{ fontSize: 12.5, color: T.blueDeep, fontWeight: 560 }}>
                Room {t.room}
              </span>
              <span
                style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Glyph level={t.acuity} size={9} gap={2} w={3.5} />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={T.blueDeep}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 5 L16 12 L9 19" />
                </svg>
              </span>
            </button>
          )}
          {related.length > 0 && (
            <div style={{ marginTop: 9 }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 9.5,
                  letterSpacing: 1.6,
                  color: T.faint,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Also for this patient
              </div>
              <div className="vx-hscroll" style={{ display: "flex", gap: 7 }}>
                {related.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onOpenThread?.(r.id)}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: T.ink,
                      background: "#fff",
                      border: "1px solid " + T.line,
                      borderRadius: 18,
                      padding: "7px 13px",
                    }}
                  >
                    <Glyph level={r.acuity} size={8} gap={1.5} w={3.2} />
                    {r.team ? r.members : r.context}
                    {r.newCount > 0 && (
                      <span
                        style={{
                          minWidth: 18,
                          height: 18,
                          borderRadius: 9,
                          padding: "0 5px",
                          background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
                          color: "#fff",
                          fontSize: 10.5,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {r.newCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: isMobile ? "8px 10px" : "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 8 : 11,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 820,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? 8 : 11,
          }}
        >
          {msgs.map((m, i) => (
            <div
              key={i}
              style={{ alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "min(82%, 560px)" }}
            >
              {!m.me && (
                <div
                  style={{ fontSize: 11, color: T.sub, margin: "0 0 3px 13px", fontWeight: 560 }}
                >
                  {m.who}
                </div>
              )}
              <button
                onClick={() => setSheet(sheet === i ? null : i)}
                style={{ all: "unset", cursor: "pointer", display: "block", textAlign: "left" }}
              >
                {m.kind === "attachment" ? (
                  <div
                    style={{
                      background: m.me ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#fff",
                      border: m.me ? "none" : "1px solid " + T.line,
                      borderRadius: 18,
                      padding: 10,
                      boxShadow: "0 2px 8px rgba(16,24,40,.06)",
                    }}
                  >
                    <div
                      style={{
                        background: "#F7F8FA",
                        border: "1px solid " + T.line,
                        borderRadius: 12,
                        padding: "22px 16px",
                        textAlign: "center",
                      }}
                    >
                      <svg
                        width="30"
                        height="30"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={T.blue}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
                        <path d="M14 3v5h5" />
                        <path d="M9 14h6M9 17h4" />
                      </svg>
                      <div style={{ fontSize: 12.5, fontWeight: 620, color: T.ink, marginTop: 6 }}>
                        Echocardiogram Report.pdf
                      </div>
                      <div style={{ fontSize: 11, color: T.sub }}>
                        2-D &amp; M-Mode · Color flow Doppler · 1.2 MB
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: m.me ? "rgba(255,255,255,.85)" : T.sub,
                        marginTop: 7,
                        padding: "0 3px",
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                ) : m.kind === "consult" ? (
                  <div
                    style={{
                      background: "#0A0F1E",
                      border: "1px solid #1C2740",
                      borderRadius: 18,
                      padding: "13px 16px",
                      boxShadow: `0 10px 26px rgba(10,15,30,.35), 0 0 0 1.5px ${ACUITY[t.acuity].color}33`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          background: ACUITY[t.acuity].color,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#8DA2CF",
                          letterSpacing: 2,
                        }}
                      >
                        LIVE · CONSULT ·{" "}
                        <span style={{ color: ACUITY[t.acuity].color }}>
                          {ACUITY[t.acuity].label.toUpperCase()}
                        </span>
                      </span>
                      <span style={{ marginLeft: "auto" }}>
                        <Glyph level={t.acuity} size={7} gap={1.5} w={3.5} />
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 2.5,
                        marginTop: 11,
                        height: 22,
                      }}
                    >
                      {[6, 12, 8, 16, 10, 20, 14, 8, 12, 18, 9, 15, 7, 11, 17, 10, 6, 13, 8].map(
                        (h, j) => (
                          <span
                            key={j}
                            style={{
                              width: 3,
                              height: h,
                              borderRadius: 2,
                              background: "#2E5CFF",
                              opacity: 0.9,
                              animation: `eq 1.2s ${j * 0.05}s ease-in-out infinite alternate`,
                            }}
                          />
                        ),
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 12.5,
                        color: "#D7DEF0",
                        lineHeight: 1.6,
                        marginTop: 11,
                      }}
                    >
                      "{m.text}"
                    </div>
                  </div>
                ) : (
                <div
                  style={{
                    background: m.me ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#fff",
                    color: m.me ? "#fff" : T.ink,
                    border: m.me ? "none" : "1px solid " + T.line,
                    borderRadius: m.me ? "18px 18px 5px 18px" : "18px 18px 18px 5px",
                    padding: isMobile ? "9px 12px" : "11px 15px",
                    fontSize: isMobile ? 13.5 : 14.5,
                    lineHeight: 1.4,
                    boxShadow: m.me
                      ? "0 6px 16px rgba(41,112,255,.22)"
                      : "0 2px 6px rgba(16,24,40,.04)",
                  }}
                >
                  {m.text}
                </div>
                )}
              </button>
              <div
                style={{
                  fontSize: 10.5,
                  color: T.faint,
                  marginTop: 3.5,
                  textAlign: m.me ? "right" : "left",
                  padding: "0 7px",
                }}
              >
                {m.t}
                {m.me && "  ✓✓"}
              </div>
              {sheet === i && (
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid " + T.line,
                    borderRadius: 16,
                    marginTop: 6,
                    boxShadow: "0 14px 34px rgba(16,24,40,.14)",
                    overflow: "hidden",
                    animation: "rise .2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      padding: "10px 12px",
                      borderBottom: "1px solid " + T.line,
                      flexWrap: "wrap",
                    }}
                  >
                    {[
                      ["✓", "Acknowledge"],
                      ["👍", "Agree"],
                      
                    ].map(([e, l]) => (
                      <button
                        key={l}
                        onClick={() => {
                          setSheet(null);
                          if (l === "Acknowledge") setAckd(true);
                        }}
                        style={{
                          all: "unset",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 620,
                          color: T.ink,
                          background: "#F7F8FA",
                          border: "1px solid " + T.line,
                          borderRadius: 16,
                          padding: "6px 12px",
                        }}
                      >
                        {e} {l}
                      </button>
                    ))}
                  </div>
                  {["Reply", "Copy", "Info"].map((a) => (
                    <button
                      key={a}
                      onClick={() => setSheet(null)}
                      style={{
                        all: "unset",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        display: "block",
                        width: "100%",
                        padding: "11px 16px",
                        fontSize: 14,
                        fontWeight: 550,
                        color: T.ink,
                        borderBottom: a !== "Info" ? "1px solid " + T.line : "none",
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <div style={{ padding: isMobile ? "6px 10px 8px" : "8px 14px 12px" }}>
        <div
          style={{ maxWidth: 820, margin: "0 auto", display: "flex", gap: isMobile ? 6 : 8, alignItems: "center" }}
        >
          <button
            title="Attach"
            style={{
              all: "unset",
              cursor: "pointer",
              width: isMobile ? 36 : 42,
              height: isMobile ? 36 : 42,
              borderRadius: isMobile ? 12 : 14,
              background: "#EDF0F4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width={isMobile ? 15 : 17}
              height={isMobile ? 15 : 17}
              viewBox="0 0 24 24"
              fill="none"
              stroke={T.sub}
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message"
            style={{ ...inputStyle, borderRadius: 24, flex: 1, minWidth: 0, height: isMobile ? 36 : 42 }}
          />
          <button
            onClick={send}
            style={{
              all: "unset",
              cursor: "pointer",
              width: isMobile ? 36 : 42,
              height: isMobile ? 36 : 42,
              borderRadius: isMobile ? 18 : 21,
              background: draft.trim() ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : T.ghost,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background .2s ease",
              flexShrink: 0,
            }}
          >
            <svg
              width={isMobile ? 14 : 16}
              height={isMobile ? 14 : 16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19 V5 M6 11 L12 5 L18 11" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
