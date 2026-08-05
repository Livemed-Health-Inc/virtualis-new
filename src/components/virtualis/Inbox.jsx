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
  useTicker,
  fmtClock,
  font,
} from "./ui";

const initialsOf = (n) =>
  n
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();


function Row({ t, ack, unreadCount, onOpen, selected, i }) {
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
        borderRadius: 20,
        padding: 15,
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
            justifyContent: "center",
            marginRight: 13,
          }}
        >
          <Glyph level={t.acuity} pulse={t.acuity === "critical"} />
        </span>
      )}
      <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
        <Avatar initials={initialsOf(t.name)} team={t.team} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 16,
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
                  fontSize: 10.5,
                  fontWeight: 620,
                  color: T.blue,
                  background: T.blueSoft,
                  border: "1px solid #D6E4FF",
                  borderRadius: 20,
                  padding: "2px 8px",
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
                style={{ fontSize: 12, color: ack ? T.faint : T.blue, fontWeight: ack ? 400 : 620 }}
              >
                {t.time}
              </span>
              {ack ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 10.5,
                    fontWeight: 560,
                    color: T.faint,
                  }}
                >
                  <svg
                    width="14"
                    height="10"
                    viewBox="0 0 20 14"
                    fill="none"
                    stroke={T.faint}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1.5 7.5 L5.5 11.5 L12 4" />
                    <path d="M9 10 L10.5 11.5 L18 3.5" />
                  </svg>
                  Read
                </span>
              ) : (
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginTop: 5,
              flexWrap: "wrap",
            }}
          >
            <FacilityChip id={t.facility} showEmr />
            <span
              style={{
                fontSize: 12.5,
                color: T.blue,
                fontWeight: 530,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {t.team ? t.members : t.context}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: T.sub,
              marginTop: 5,
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <PersonIcon /> {t.patient}
            </span>
            {t.room !== "—" && (
              <>
                <span style={{ color: T.line }}>|</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <DoorIcon /> Room {t.room}
                </span>
              </>
            )}
            
          </div>
          <div
            style={{
              fontSize: 13.5,
              marginTop: 6,
              color: ack ? T.sub : T.ink,
              fontWeight: ack ? 400 : 530,
              lineHeight: 1.4,
              letterSpacing: -0.1,
              display: "-webkit-box",
              WebkitLineClamp: 2,
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
}) {
  const counts = {
    all: threads.length,
    critical: threads.filter((t) => t.acuity === "critical").length,
    urgent: threads.filter((t) => t.acuity === "urgent").length,
    routine: threads.filter((t) => t.acuity === "routine").length,
  };
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

  return (
    <>
      <div style={{ padding: "14px 18px 12px", position: "relative", zIndex: 1 }}>
        {header}
        <div
          style={{
            background: "rgba(255,255,255,.85)",
            borderRadius: 24,
            border: "1px solid " + T.line,
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "11px 16px",
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
              fontSize: 14.5,
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
        <div
          style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 13, paddingBottom: 2 }}
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
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 15px",
                  borderRadius: 22,
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
                {p.c && <span style={{ width: 7, height: 7, borderRadius: 4, background: p.c }} />}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "2px 15px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
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
        {bands.map(([band, list]) => (
          <div key={band} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 4px",
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
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
