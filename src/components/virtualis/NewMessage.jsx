import { useState } from "react";
import { T, inputStyle, Avatar, FacilityChip, ScreenHeader, Empty } from "./ui";
import { STAFF } from "./data";

/* Direct or group message composer: search providers, pick one (DM) or
   several (group), send the first message. */
export default function NewMessage({ onBack, onStart, facilityScope, staff = STAFF }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [text, setText] = useState("");

  const pool = staff.filter((s) => facilityScope.includes(s.facility));
  const shown = pool.filter(
    (s) => !q || (s.name + " " + s.dept + " " + s.role).toLowerCase().includes(q.toLowerCase()),
  );
  const isGroup = picked.length > 1;
  const toggle = (s) =>
    setPicked((p) => (p.some((x) => x.id === s.id) ? p.filter((x) => x.id !== s.id) : [...p, s]));

  const send = () => {
    if (!picked.length) return;
    onStart({
      recipients: picked,
      group: isGroup,
      name: isGroup ? groupName.trim() || picked.map((p) => p.name).join(" · ") : picked[0].name,
      text: text.trim(),
    });
  };

  return (
    <>
      <ScreenHeader title="New message" onBack={onBack} />
      <div style={{ padding: "10px 16px 0" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search providers by name, department or role"
          style={{ ...inputStyle, borderRadius: 24 }}
          autoFocus
        />
        {picked.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
            {picked.map((p) => (
              <button
                key={p.id}
                onClick={() => toggle(p)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  fontWeight: 620,
                  color: T.blueDeep,
                  background: T.blueSoft,
                  border: "1px solid #D6E4FF",
                  borderRadius: 20,
                  padding: "5px 11px",
                }}
              >
                {p.name}
                <span style={{ fontSize: 14, lineHeight: 1, color: T.sub }}>×</span>
              </button>
            ))}
          </div>
        )}
        {isGroup && (
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (optional)"
            style={{ ...inputStyle, borderRadius: 16, marginTop: 10 }}
          />
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 16px 8px",
          display: "grid",
          gap: 8,
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          alignContent: "start",
        }}
      >
        {shown.length === 0 && (
          <div style={{ gridColumn: "1/-1" }}>
            <Empty title="No providers found" sub="Try another name or department." />
          </div>
        )}
        {shown.map((s) => {
          const on = picked.some((x) => x.id === s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s)}
              style={{
                all: "unset",
                boxSizing: "border-box",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: 12,
                borderRadius: 16,
                background: on ? "#EEF4FF" : "#fff",
                border: "1px solid " + (on ? "#C9DBFF" : T.line),
              }}
            >
              <Avatar initials={s.initials} online={s.online} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 650, color: T.ink }}>{s.name}</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 3,
                    flexWrap: "wrap",
                    fontSize: 11.5,
                    color: T.sub,
                  }}
                >
                  <FacilityChip id={s.facility} full />
                  <span>{s.dept}</span>
                </div>
              </div>
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  flexShrink: 0,
                  border: "1.5px solid " + (on ? T.blue : T.line),
                  background: on ? T.blue : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {on && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5 L9.5 18 L20 6.5" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          borderTop: "1px solid " + T.line,
          background: "#fff",
          padding: "10px 16px calc(10px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={isGroup ? "Message the group" : "Write a message"}
          style={{ ...inputStyle, borderRadius: 22, flex: 1 }}
        />
        <button
          onClick={send}
          disabled={!picked.length}
          style={{
            all: "unset",
            cursor: picked.length ? "pointer" : "not-allowed",
            opacity: picked.length ? 1 : 0.45,
            background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 650,
            borderRadius: 16,
            padding: "11px 18px",
            flexShrink: 0,
          }}
        >
          {isGroup ? `Start group (${picked.length})` : "Start chat"}
        </button>
      </div>
    </>
  );
}
