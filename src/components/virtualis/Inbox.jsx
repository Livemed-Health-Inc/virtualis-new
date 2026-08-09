import { useState } from "react";
import {
  T,
  mono,
  ACUITY,
  Avatar,
  Glyph,
  FacilityChip,
  PersonIcon,
  DoorIcon,
  Empty,
  font,
  groupByPatient,
} from "./ui";

const initialsOf = (n) =>
  n
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();


/* One patient, every specialty consult opened on them. */
function PatientCard({ g, openThread, selectedId }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid " + (g.threads.some((t) => t.id === selectedId) ? "#C9DBFF" : T.line),
        borderRadius: 20,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 11,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar initials={initialsOf(g.patient)} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 660,
              color: T.ink,
              letterSpacing: -0.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {g.patient}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginTop: 3,
              fontSize: 11.5,
              color: T.sub,
            }}
          >
            <FacilityChip id={g.facility} />
            {g.mrn && <span style={{ fontFamily: mono, fontSize: 10.5 }}>MRN {g.mrn}</span>}
            <span>· Room {g.room}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Glyph level={g.acuity} size={13} gap={2.5} w={4.5} />
          {g.unread > 0 && (
            <span
              style={{
                minWidth: 20,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                background: ACUITY[g.acuity].color,
                borderRadius: 10,
                padding: "2px 6px",
              }}
            >
              {g.unread}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {g.threads.map((t) => (
          <button
            key={t.id}
            onClick={() => openThread(t.id)}
            style={{
              all: "unset",
              boxSizing: "border-box",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              padding: "9px 11px",
              borderRadius: 14,
              background: t.id === selectedId ? "#EEF4FF" : "#F7F8FA",
              border: "1px solid " + (t.id === selectedId ? "#D6E4FF" : T.line),
            }}
          >
            <Glyph level={t.acuity} size={9} gap={1.6} w={3.4} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: T.ink,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
                minWidth: 0,
              }}
            >
              {t.team ? t.members : t.context}
            </span>
            {t.newCount > 0 && (
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
                {t.newCount}
              </span>
            )}
            <span style={{ fontSize: 11, color: T.faint }}>{t.time}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ t, ack, unreadCount, onOpen, selected, i, compact }) {
  const last = (t.msgs || [])[(t.msgs || []).length - 1] || { text: t.reason || "", kind: null };
  return (
    <button
      onClick={onOpen}
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        width: "100%",
        display: "flex",
        background: selected
          ? "linear-gradient(135deg,#F3F7FF,#E9F1FF)"
          : ack
            ? "#fff"
            : "linear-gradient(135deg,#FFFFFF 30%,#F2F7FF 78%,#EBF2FF 100%)",
        borderRadius: compact ? 12 : 20,
        padding: compact ? "8px 10px" : 15,
        border: "1px solid " + (selected ? "#B9D0FF" : ack ? T.line : "#CFE0FF"),
        boxShadow:
          ack && !selected
            ? "0 2px 6px rgba(16,24,40,.04)"
            : "0 4px 10px rgba(41,112,255,.06), 0 14px 30px rgba(41,112,255,.11)",
        transition: "all .35s ease",
        animation: `rise .3s ${Math.min(i, 8) * 0.03}s cubic-bezier(.2,.8,.3,1) backwards`,
      }}
    >
      {!ack && (
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: compact ? 4 : 7,
            marginRight: compact ? 7 : 13,
          }}
        >
          <Glyph level={t.acuity} pulse={t.acuity === "critical"} />
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              background: T.blue,
              boxShadow: "0 0 0 3px rgba(46,92,255,.14)",
            }}
          />
        </span>
      )}
      <div style={{ display: "flex", gap: compact ? 8 : 12, flex: 1, minWidth: 0 }}>
        <Avatar initials={initialsOf(t.name)} team={t.team} size={compact ? 32 : undefined} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: compact ? 13.5 : 16,
                fontWeight: ack ? 600 : 680,
                color: T.ink,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                letterSpacing: -0.25,
              }}
            >
              {t.name}
            </span>
            {t.team && (
              <span
                style={{
                  fontSize: compact ? 9 : 10.5,
                  fontWeight: 620,
                  color: T.blue,
                  background: T.blueSoft,
                  border: "1px solid #D6E4FF",
                  borderRadius: 20,
                  padding: compact ? "1px 5px" : "2px 8px",
                  flexShrink: 0,
                }}
              >
                Team
              </span>
            )}
            <span
              style={{
                marginLeft: "auto",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                style={{ fontSize: compact ? 10 : 12, color: ack ? T.faint : T.blue, fontWeight: ack ? 400 : 620 }}
              >
                {t.time}
              </span>
              {!ack && (

                <span
                  style={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 6px",
                    boxShadow: "0 3px 10px rgba(41,112,255,.4)",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </span>
          </div>
          {!compact && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
                fontSize: 12,
                color: T.sub,
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <FacilityChip id={t.facility} />
              <span style={{ color: T.blue, fontWeight: 530, flexShrink: 0 }}>
                {t.team ? t.members : t.context}
              </span>
              <span style={{ color: T.line }}>·</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {t.patient}
                {t.room !== "—" ? ` · Rm ${t.room}` : ""}
              </span>
            </div>
          )}

          <div
            style={{
              fontSize: compact ? 11.5 : 13.5,
              marginTop: compact ? 3 : 6,
              color: ack ? T.sub : T.ink,
              fontWeight: ack ? 400 : 530,
              lineHeight: compact ? 1.25 : 1.4,
              letterSpacing: -0.1,
              display: "-webkit-box",
              WebkitLineClamp: compact ? 1 : 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {last.kind === "attachment" ? "📎 " : ""}
            {last.text}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Inbox({
  threads,
  acked,
  liveCounts,
  openThread,
  filter,
  setFilter,
  query,
  setQuery,
  selectedId,
  header,
  compact = false,
}) {
  const counts = {
    all: threads.length,
    critical: threads.filter((t) => t.acuity === "critical").length,
    urgent: threads.filter((t) => t.acuity === "urgent").length,
    routine: threads.filter((t) => t.acuity === "routine").length,
  };
  const [view, setView] = useState("acuity");
  const q = query.trim().toLowerCase();
  const shown = threads
    .filter((t) => filter === "all" || t.acuity === filter)
    .filter(
      (t) =>
        !q ||
        [t.name, t.patient, t.context, t.mrn, ...t.msgs.map((m) => m.text)]
          .join(" ")
          .toLowerCase()
          .includes(q),
    );

  const pills = [
    { k: "all", label: `All (${counts.all})` },
    {
      k: "critical",
      label: `Critical (${counts.critical})`,
      c: T.red,
      bg: "#FEF0EF",
      bd: "#FBD9D6",
    },
    { k: "urgent", label: `Urgent (${counts.urgent})`, c: T.amber, bg: "#FFF6E8", bd: "#FDE3BC" },
    {
      k: "routine",
      label: `Routine (${counts.routine})`,
      c: T.green,
      bg: "#EDFBF3",
      bd: "#C9F0DB",
    },
  ];

  const bands = ["critical", "urgent", "routine"]
    .map((k) => [k, shown.filter((t) => t.acuity === k)])
    .filter(([, l]) => l.length);

  const viewToggle = (
    <div
      style={{
        display: "flex",
        gap: 3,
        flexShrink: 0,
        padding: compact ? 2 : 3,
        background: "#EEF0F4",
        borderRadius: 999,
      }}
    >
      {[
        ["acuity", "Acuity"],
        ["patient", "Patient"],
      ].map(([k, label]) => (
        <button
          key={k}
          onClick={() => setView(k)}
          style={{
            all: "unset",
            cursor: "pointer",
            textAlign: "center",
            padding: compact ? "5px 10px" : "6px 14px",
            borderRadius: 999,
            fontSize: compact ? 10.5 : 12.5,
            fontWeight: 620,
            color: view === k ? "#fff" : T.sub,
            background: view === k ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "transparent",
            transition: "all .2s ease",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );


  return (
    <>
      <div style={{ padding: compact ? "7px 10px 6px" : "14px clamp(14px,2.2vw,22px) 12px", position: "relative", zIndex: 1 }}>
        {header}
        <div style={{ display: "grid", gridTemplateColumns: compact ? "minmax(0,1fr) auto" : "1fr", gap: compact ? 6 : 0, alignItems: "center" }}>
        <div
          style={{
            background: "rgba(255,255,255,.85)",
            borderRadius: compact ? 12 : 24,
            border: "1px solid " + T.line,
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: compact ? "7px 10px" : "11px 16px",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke={T.faint}
            strokeWidth="2.3"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20 L16.5 16.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, patients, MRN"
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: compact ? 12.5 : 14.5,
              fontFamily: font,
              flex: 1,
              minWidth: 0,
              color: T.ink,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ all: "unset", cursor: "pointer", fontSize: 12, color: T.faint }}
            >
              Clear
            </button>
          )}
        </div>
        {compact ? (
          viewToggle
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <div
              className="vx-hscroll"
              style={{ display: "flex", gap: 6, flex: 1, minWidth: 0, paddingBottom: 2 }}
            >
              {pills.map((p) => {
                const active = filter === p.k,
                  dark = p.k === "all";
                return (
                  <button
                    key={p.k}
                    onClick={() => setFilter(p.k)}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      flexShrink: 0,
                      fontSize: 12.5,
                      fontWeight: 600,
                      padding: "7px 13px",
                      borderRadius: 999,
                      color: active ? (dark ? "#fff" : p.c) : dark ? T.ink : p.c,
                      background: active
                        ? dark
                          ? "linear-gradient(135deg,#1B3FA0,#12275E)"
                          : p.bg
                        : "#fff",
                      border: "1px solid " + (active ? (dark ? "#12275E" : p.bd) : T.line),
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all .2s ease",
                    }}
                  >
                    {p.c && (
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: p.c }} />
                    )}
                    {p.label}
                  </button>
                );
              })}
            </div>
            {viewToggle}
          </div>
        )}

        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: compact ? "2px 8px 10px" : "2px clamp(12px,2vw,20px) 20px",
          display: "flex",
          flexDirection: "column",
          gap: compact ? 5 : 10,
        }}
      >
        {shown.length === 0 && (
          <Empty
            title={q ? "No matching messages" : "Inbox clear"}
            sub={
              q
                ? "Try a different name, MRN, or keyword."
                : "Every consult at your credentialed facilities is acknowledged."
            }
          />
        )}
        {view === "patient" &&
          groupByPatient(shown).map((g) => (
            <PatientCard key={g.key} g={g} openThread={openThread} selectedId={selectedId} />
          ))}
        {view === "acuity" &&
          bands.map(([band, list]) => (
          <div key={band} style={{ display: "flex", flexDirection: "column", gap: compact ? 5 : 10 }}>
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: compact ? "2px 4px" : "6px 4px",
                background: "linear-gradient(180deg, rgba(244,245,247,.96), rgba(244,245,247,.7))",
                backdropFilter: "blur(6px)",
              }}
            >
              <Glyph level={band} size={8} gap={1.5} w={3.5} />
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 650,
                  letterSpacing: 2,
                  color: ACUITY[band].color,
                  textTransform: "uppercase",
                }}
              >
                {ACUITY[band].label}
              </span>
              <span style={{ fontSize: 11, color: T.faint }}>{list.length}</span>
            </div>
            {list.map((t, i) => (
              <Row
                key={t.id}
                t={t}
                i={i}
                ack={acked.has(t.id)}
                unreadCount={liveCounts[t.id] ?? t.newCount}
                selected={selectedId === t.id}
                onOpen={() => openThread(t.id)}
                compact={compact}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
