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
  const isShortViewport = useMediaQuery("(max-height: 700px)");
  const compactHeader = isMobile || isShortViewport;
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
      {compactHeader ? (
        <div
          style={{
            background: "rgba(255,255,255,.92)",
            backdropFilter: "blur(18px)",
            borderBottom: "1px solid " + T.line,
            padding: "2px 8px",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {!embedded && (
              <button
                onClick={onBack}
                title="Back"
                style={{
                  all: "unset",
                  cursor: "pointer",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: T.sub,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                padding: "0 2px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: isMobile ? 13 : 14,
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
            </button>
            {related.length > 0 && (
              <button
                onClick={() => setRelOpen((v) => !v)}
                title={`${related.length} other consult${related.length === 1 ? "" : "s"}`}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  flexShrink: 0,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    height: 22,
                    minWidth: 22,
                    padding: "0 6px",
                    borderRadius: 11,
                    background: relOpen ? T.blueSoft : "#fff",
                    border: "1px solid " + T.line,
                    color: T.blueDeep,
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +{related.length}
                </span>
              </button>
            )}
            <button
              onClick={onVideo}
              title="Video"
              style={{
                all: "unset",
                cursor: "pointer",
                width: 44,
                height: 44,
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 3px 10px rgba(41,112,255,.28)",
                }}
              >
                <VideoIcon />
              </span>
            </button>
          </div>
          {relOpen && related.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 8,
                right: 8,
                zIndex: 20,
                background: "rgba(255,255,255,.96)",
                backdropFilter: "blur(16px)",
                border: "1px solid " + T.line,
                borderRadius: 16,
                padding: "8px",
                boxShadow: "0 14px 34px rgba(16,24,40,.14)",
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 9,
                  letterSpacing: 1.4,
                  color: T.faint,
                  textTransform: "uppercase",
                  marginBottom: 6,
                  padding: "0 4px",
                }}
              >
                Also for this patient
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 12,
                      background: "#fff",
                      border: "1px solid " + T.line,
                    }}
                  >
                    <Glyph level={r.acuity} size={6} gap={1.2} w={2.8} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.ink,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textAlign: "left",
                      }}
                    >
                      {r.team ? r.members : r.context}
                    </span>
                    {r.newCount > 0 && (
                      <span
                        style={{
                          minWidth: 16,
                          height: 16,
                          borderRadius: 8,
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
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
        }}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: isMobile ? "8px 10px" : "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 8 : 11,
          position: "relative",
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
          <div style={{ alignSelf: "center", marginBottom: 2 }}>
            <span
              style={{
                fontFamily: mono,
                fontSize: 9.5,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                color: T.faint,
                background: "rgba(255,255,255,.8)",
                border: "1px solid " + T.line,
                borderRadius: 12,
                padding: "3px 10px",
              }}
            >
              Today
            </span>
          </div>

          {msgs.map((m, i) => {
            if (deleted.includes(i)) return null;
            const prev = msgs[i - 1];
            const grouped = prev && prev.me === m.me && prev.who === m.who;
            const reacts = reactions[i] || [];
            const quoted = replies[i] != null ? msgs[replies[i]] : null;
            return (
            <div
              key={i}
              style={{
                alignSelf: m.me ? "flex-end" : "flex-start",
                maxWidth: "min(82%, 560px)",
                marginTop: grouped ? -(isMobile ? 4 : 6) : 0,
              }}
            >
              {!m.me && !grouped && (
                <div
                  style={{ fontSize: 11, color: T.sub, margin: "0 0 3px 13px", fontWeight: 560 }}
                >
                  {m.who}
                </div>
              )}
              {quoted && (
                <div
                  style={{
                    borderLeft: "3px solid " + T.blue,
                    background: m.me ? "rgba(46,92,255,.10)" : "#F3F5F9",
                    borderRadius: 10,
                    padding: "5px 9px",
                    marginBottom: 3,
                    fontSize: 11.5,
                    color: T.sub,
                    maxHeight: 42,
                    overflow: "hidden",
                  }}
                >
                  <b style={{ color: T.blueDeep }}>{quoted.me ? "You" : quoted.who}</b> ·{" "}
                  {quoted.text}
                </div>
              )}
              <button
                onClick={() => setSheet(sheet === i ? null : i)}
                onDoubleClick={() => react(i, "👍")}
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
                      whiteSpace: "pre-wrap",
                      boxShadow: m.me
                        ? "0 6px 16px rgba(41,112,255,.22)"
                        : "0 2px 6px rgba(16,24,40,.04)",
                    }}
                  >
                    {m.text}
                  </div>
                )}
              </button>

              {reacts.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    marginTop: -6,
                    justifyContent: m.me ? "flex-end" : "flex-start",
                    padding: "0 6px",
                  }}
                >
                  {reacts.map((e) => (
                    <span
                      key={e}
                      style={{
                        background: "#fff",
                        border: "1px solid " + T.line,
                        borderRadius: 12,
                        padding: "1px 6px",
                        fontSize: 12,
                        boxShadow: "0 2px 6px rgba(16,24,40,.08)",
                      }}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              )}

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
                {m.me && <span style={{ color: T.blue, marginLeft: 4 }}>✓✓</span>}
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
                      padding: "9px 12px",
                      borderBottom: "1px solid " + T.line,
                      flexWrap: "wrap",
                    }}
                  >
                    {["👍", "❤️", "✅", "❗", "😮", "🙏"].map((e) => (
                      <button
                        key={e}
                        onClick={() => {
                          react(i, e);
                          setSheet(null);
                        }}
                        style={{
                          all: "unset",
                          cursor: "pointer",
                          fontSize: 17,
                          lineHeight: 1,
                          padding: "5px 7px",
                          borderRadius: 14,
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  {[
                    ["Reply", () => setReplyTo(i)],
                    ["Copy", () => navigator.clipboard?.writeText(m.text || "")],
                    ["Acknowledge", () => setAckd(true)],
                    ["Delete for me", () => setDeleted((d) => [...d, i])],
                  ].map(([label, fn], k, arr) => (
                    <button
                      key={label}
                      onClick={() => {
                        fn();
                        setSheet(null);
                      }}
                      style={{
                        all: "unset",
                        boxSizing: "border-box",
                        cursor: "pointer",
                        display: "block",
                        width: "100%",
                        padding: "11px 16px",
                        fontSize: 14,
                        fontWeight: 550,
                        color: label === "Delete for me" ? T.red : T.ink,
                        borderBottom: k < arr.length - 1 ? "1px solid " + T.line : "none",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            );
          })}

          {typing && (
            <div
              style={{
                alignSelf: "flex-start",
                display: "flex",
                gap: 4,
                background: "#fff",
                border: "1px solid " + T.line,
                borderRadius: "18px 18px 18px 5px",
                padding: "10px 14px",
              }}
            >
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: "#B7C2D6",
                    animation: `eq .9s ${d * 0.15}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {!atBottom && (
        <button
          onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
          title="Jump to latest"
          style={{
            all: "unset",
            cursor: "pointer",
            position: "absolute",
            right: 16,
            bottom: 76,
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "rgba(255,255,255,.94)",
            border: "1px solid " + T.line,
            boxShadow: "0 8px 20px rgba(16,24,40,.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.blueDeep} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
        </button>
      )}

      <div style={{ padding: isMobile ? "6px 10px 8px" : "8px 14px 12px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          {replyTo != null && msgs[replyTo] && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#fff",
                border: "1px solid " + T.line,
                borderLeft: "3px solid " + T.blue,
                borderRadius: 12,
                padding: "6px 10px",
                marginBottom: 6,
              }}
            >
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.sub, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                <b style={{ color: T.blueDeep }}>
                  Replying to {msgs[replyTo].me ? "yourself" : msgs[replyTo].who}
                </b>{" "}
                · {msgs[replyTo].text}
              </div>
              <button onClick={() => setReplyTo(null)} style={{ all: "unset", cursor: "pointer", color: T.sub, fontSize: 16, padding: "0 4px" }}>
                ×
              </button>
            </div>
          )}

          {attachOpen && (
            <div style={{ display: "flex", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
              {["Photo", "Document", "Camera", "Patient chart"].map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setAttachOpen(false);
                    push(`📎 ${a} shared`);
                  }}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: 620,
                    color: T.blueDeep,
                    background: T.blueSoft,
                    border: "1px solid #D6E4FF",
                    borderRadius: 16,
                    padding: "7px 13px",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          )}

          {emojiOpen && (
            <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
              {["👍", "🙏", "✅", "❗", "😀", "😮", "❤️", "🩺", "💊", "🚑", "🧪", "📈"].map((e) => (
                <button
                  key={e}
                  onClick={() => setDraft((d) => d + e)}
                  style={{ all: "unset", cursor: "pointer", fontSize: 19, padding: "3px 5px" }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: isMobile ? 6 : 8, alignItems: "flex-end" }}>
            <button
              title="Attach"
              onClick={() => {
                setEmojiOpen(false);
                setAttachOpen((v) => !v);
              }}
              style={{
                all: "unset",
                cursor: "pointer",
                width: isMobile ? 36 : 42,
                height: isMobile ? 36 : 42,
                borderRadius: isMobile ? 12 : 14,
                background: attachOpen ? T.blueSoft : "#EDF0F4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transform: attachOpen ? "rotate(45deg)" : "none",
                transition: "transform .2s ease",
              }}
            >
              <svg width={isMobile ? 15 : 17} height={isMobile ? 15 : 17} viewBox="0 0 24 24" fill="none" stroke={attachOpen ? T.blueDeep : T.sub} strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>

            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                background: "#fff",
                border: "1px solid " + T.line,
                borderRadius: 22,
                padding: "0 6px 0 4px",
              }}
            >
              <textarea
                value={draft}
                rows={1}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Message"
                style={{
                  ...inputStyle,
                  border: "none",
                  background: "transparent",
                  boxShadow: "none",
                  outline: "none",
                  resize: "none",
                  flex: 1,
                  minWidth: 0,
                  maxHeight: 120,
                  height: "auto",
                  padding: isMobile ? "9px 8px" : "11px 10px",
                  lineHeight: 1.35,
                  fontFamily: "inherit",
                }}
                onInput={(e) => {
                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + "px";
                }}
              />
              <button
                title="Emoji"
                onClick={() => {
                  setAttachOpen(false);
                  setEmojiOpen((v) => !v);
                }}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  fontSize: 17,
                  lineHeight: 1,
                  padding: isMobile ? "9px 4px" : "11px 4px",
                  opacity: emojiOpen ? 1 : 0.7,
                }}
              >
                😊
              </button>
            </div>

            {draft.trim() ? (
              <button
                onClick={send}
                title="Send"
                style={{
                  all: "unset",
                  cursor: "pointer",
                  width: isMobile ? 36 : 42,
                  height: isMobile ? 36 : 42,
                  borderRadius: isMobile ? 18 : 21,
                  background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width={isMobile ? 14 : 16} height={isMobile ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19 V5 M6 11 L12 5 L18 11" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (recording) {
                    setRecording(false);
                    push("🎤 Voice message · 0:06");
                  } else setRecording(true);
                }}
                title={recording ? "Send voice message" : "Record voice message"}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  width: isMobile ? 36 : 42,
                  height: isMobile ? 36 : 42,
                  borderRadius: isMobile ? 18 : 21,
                  background: recording ? "linear-gradient(135deg,#FF4D4F,#C81E24)" : T.ghost,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background .2s ease",
                }}
              >
                <svg width={isMobile ? 15 : 17} height={isMobile ? 15 : 17} viewBox="0 0 24 24" fill="none" stroke={recording ? "#fff" : T.sub} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
