import { useEffect, useState } from "react";
import { T, mono, FACILITIES, inputStyle } from "./theme";
import { getAccess, sendInvite, revokeInvite } from "@/lib/invites.functions";

/* Admin-only invite console. Access to Virtualis is invite-only: accounts
   exist solely because an admin provisioned them here. */

const chip = (bg, fg, bd) => ({
  fontSize: 11,
  fontWeight: 620,
  color: fg,
  background: bg,
  border: "1px solid " + bd,
  borderRadius: 14,
  padding: "3px 9px",
  whiteSpace: "nowrap",
});

const STATUS = {
  pending: chip("#FFF7E8", "#9A6400", "#F3E0B8"),
  accepted: chip("#EDFBF3", T.green, "#C9F0DB"),
  revoked: chip("#FDEEEE", T.red, "#F5CFCF"),
};

export function TeamAccess({ onBack }) {
  const [state, setState] = useState({ isAdmin: false, invites: [] });
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    title: "",
    department: "",
    facility_id: "",
    role: "member",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const refresh = () => getAccess().then(setState).catch(() => {});
  useEffect(() => {
    refresh();
  }, []);

  const invite = async () => {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const r = await sendInvite({
        data: { ...form, redirectTo: window.location.origin },
      });
      if (!r.ok) setErr(r.message);
      else {
        setMsg(`Invitation sent to ${form.email}`);
        setForm({ ...form, email: "", full_name: "", title: "", department: "" });
        refresh();
      }
    } catch (e) {
      setErr(String(e.message || e));
    }
    setBusy(false);
  };

  const revoke = async (id) => {
    await revokeInvite({ data: { id } }).catch(() => {});
    refresh();
  };

  const Label = ({ children }) => (
    <div
      style={{
        fontFamily: mono,
        fontSize: 10,
        letterSpacing: 1.8,
        color: T.faint,
        fontWeight: 650,
        margin: "18px 0 8px",
      }}
    >
      {children}
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button onClick={onBack} aria-label="Back" style={{ all: "unset", cursor: "pointer", padding: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ fontSize: 16.5, fontWeight: 700, color: T.ink }}>Team Access</div>
      </div>
      <p style={{ fontSize: 13, color: T.sub, margin: "2px 0 0" }}>
        Virtualis is invite only. New clinicians can sign in only after you provision them here.
      </p>

      {!state.isAdmin ? (
        <div
          style={{
            marginTop: 18,
            background: T.blueSoft,
            border: "1px solid #DCE6FF",
            borderRadius: 18,
            padding: "14px 15px",
            fontSize: 13.5,
            lineHeight: 1.6,
            color: T.blueDeep,
          }}
        >
          Only organization administrators can invite clinicians. Contact your Virtualis
          administrator to request access for a colleague.
        </div>
      ) : (
        <>
          <Label>INVITE A CLINICIAN</Label>
          <div style={{ border: "1px solid " + T.line, borderRadius: 18, padding: 14 }}>
            {[
              ["Work email", "email", "name@hospital.org"],
              ["Full name", "full_name", "Dr. Jane Rivera"],
              ["Role / title", "title", "Attending, Infectious Disease"],
              ["Department", "department", "Tele-Infectious Disease"],
            ].map(([label, key, ph]) => (
              <label key={key} style={{ display: "block", marginBottom: 10 }}>
                <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 5 }}>{label}</div>
                <input
                  value={form[key]}
                  placeholder={ph}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={inputStyle}
                />
              </label>
            ))}
            <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 6 }}>Home facility</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
              {Object.entries(FACILITIES).map(([id, f]) => {
                const on = form.facility_id === id;
                return (
                  <button
                    key={id}
                    onClick={() => setForm({ ...form, facility_id: on ? "" : id })}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 620,
                      padding: "6px 11px",
                      borderRadius: 14,
                      color: on ? "#fff" : T.sub,
                      background: on ? T.blue : T.card,
                      border: "1px solid " + (on ? T.blue : T.line),
                    }}
                  >
                    {f.short || f.name}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 6 }}>Access level</div>
            <div style={{ display: "flex", gap: 7 }}>
              {["member", "admin"].map((r) => {
                const on = form.role === r;
                return (
                  <button
                    key={r}
                    onClick={() => setForm({ ...form, role: r })}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 620,
                      padding: "6px 12px",
                      borderRadius: 14,
                      textTransform: "capitalize",
                      color: on ? "#fff" : T.sub,
                      background: on ? T.blueDeep : T.card,
                      border: "1px solid " + (on ? T.blueDeep : T.line),
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>

            {err && <div style={{ fontSize: 13, color: T.red, marginTop: 12 }}>{err}</div>}
            {msg && <div style={{ fontSize: 13, color: T.green, marginTop: 12 }}>{msg}</div>}

            <button
              onClick={invite}
              disabled={busy || !form.email}
              style={{
                all: "unset",
                boxSizing: "border-box",
                cursor: busy ? "wait" : "pointer",
                display: "block",
                width: "100%",
                textAlign: "center",
                marginTop: 16,
                padding: "13px 0",
                borderRadius: 16,
                fontSize: 14.5,
                fontWeight: 680,
                color: "#fff",
                background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
                opacity: !form.email || busy ? 0.55 : 1,
              }}
            >
              {busy ? "Sending…" : "Send invitation"}
            </button>
          </div>

          <Label>INVITATIONS</Label>
          {state.invites.length === 0 && (
            <div style={{ fontSize: 13, color: T.sub }}>No invitations yet.</div>
          )}
          {state.invites.map((i) => (
            <div
              key={i.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                border: "1px solid " + T.line,
                borderRadius: 16,
                padding: "12px 14px",
                marginBottom: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 640,
                    color: T.ink,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {i.full_name || i.email}
                </div>
                <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                  {[i.title, i.department, FACILITIES[i.facility_id]?.short].filter(Boolean).join(" · ") ||
                    i.email}
                </div>
              </div>
              <span style={STATUS[i.status] || STATUS.pending}>{i.status}</span>
              {i.status === "pending" && (
                <button
                  onClick={() => revoke(i.id)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 620,
                    color: T.red,
                  }}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}
