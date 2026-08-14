import { useEffect, useMemo, useState } from "react";
import { T, mono, inputStyle } from "../theme";
import {
  getAdminData,
  createFacility,
  inviteStaff,
  registerDevice,
  mintEnrollment,
  setDeviceStatus,
} from "@/lib/admin.functions";
import { revokeInvite } from "@/lib/invites.functions";

/* Administrator console: hospitals, people and bedside devices. This is the
   surface used to stand up a new hospital — provision staff who are scoped to
   their site, then enrol the carts that live on its units. */

const STAFF_TYPES = [
  "Physician",
  "APP",
  "RN",
  "Respiratory Therapy",
  "Social Work",
  "Pharmacy",
  "Case Management",
  "Unit Coordinator",
];

const chip = (on, tone = T.blue) => ({
  all: "unset",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 620,
  padding: "6px 11px",
  borderRadius: 14,
  color: on ? "#fff" : T.sub,
  background: on ? tone : T.card,
  border: "1px solid " + (on ? tone : T.line),
});

const badge = (bg, fg, bd) => ({
  fontSize: 11,
  fontWeight: 620,
  color: fg,
  background: bg,
  border: "1px solid " + bd,
  borderRadius: 14,
  padding: "3px 9px",
  whiteSpace: "nowrap",
});
const TONE = {
  pending: badge("#FFF7E8", "#9A6400", "#F3E0B8"),
  accepted: badge("#EDFBF3", T.green, "#C9F0DB"),
  revoked: badge("#FDEEEE", T.red, "#F5CFCF"),
  registered: badge("#FFF7E8", "#9A6400", "#F3E0B8"),
  enrolled: badge("#EDFBF3", T.green, "#C9F0DB"),
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

const Field = ({ label, ...rest }) => (
  <label style={{ display: "block", marginBottom: 10 }}>
    <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 5 }}>{label}</div>
    <input style={inputStyle} {...rest} />
  </label>
);

const Primary = ({ children, ...rest }) => (
  <button
    {...rest}
    style={{
      all: "unset",
      boxSizing: "border-box",
      cursor: rest.disabled ? "not-allowed" : "pointer",
      display: "block",
      width: "100%",
      textAlign: "center",
      marginTop: 8,
      padding: "13px 0",
      borderRadius: 16,
      fontSize: 14.5,
      fontWeight: 680,
      color: "#fff",
      background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
      opacity: rest.disabled ? 0.5 : 1,
    }}
  >
    {children}
  </button>
);

const Panel = ({ children }) => (
  <div style={{ border: "1px solid " + T.line, borderRadius: 18, padding: 14 }}>{children}</div>
);

const Row = ({ title, sub, right, children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 11,
      flexWrap: "wrap",
      border: "1px solid " + T.line,
      borderRadius: 16,
      padding: "12px 14px",
      marginBottom: 8,
    }}
  >
    <div style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 14, fontWeight: 640, color: T.ink }}>{title}</div>
      <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{sub}</div>
    </div>
    {right}
    {children}
  </div>
);

export function AdminConsole({ onBack }) {
  const [state, setState] = useState(null);
  const [section, setSection] = useState("people");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(null);

  const refresh = () =>
    getAdminData()
      .then(setState)
      .catch(() => setState({ isAdmin: false }));
  useEffect(() => {
    refresh();
  }, []);

  const fac = state?.facilities ?? [];
  const facName = useMemo(
    () => Object.fromEntries(fac.map((f) => [f.id, f.short || f.name])),
    [fac],
  );

  const run = async (fn) => {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const r = await fn();
      if (r && r.ok === false) setErr(r.message || "Something went wrong");
      else {
        setMsg("Saved");
        await refresh();
      }
      return r;
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  /* ---- People ---- */
  const [invite, setInvite] = useState({
    email: "",
    full_name: "",
    title: "",
    department: "",
    specialty: "",
    staff_type: "Physician",
    user_class: "onsite",
    facility_ids: [],
    role: "member",
  });
  const toggleFacility = (id) =>
    setInvite((v) => {
      if (v.user_class === "onsite") return { ...v, facility_ids: [id] };
      const has = v.facility_ids.includes(id);
      return {
        ...v,
        facility_ids: has ? v.facility_ids.filter((x) => x !== id) : [...v.facility_ids, id],
      };
    });

  /* ---- Facilities ---- */
  const [nf, setNf] = useState({ id: "", name: "", short: "", emr: "Epic", hue: "#2E5CFF" });

  /* ---- Devices ---- */
  const [nd, setNd] = useState({
    facility_id: "",
    label: "",
    unit: "",
    room: "",
    floating: false,
    has_mintti: false,
  });

  if (!state)
    return <div style={{ fontSize: 13.5, color: T.sub, padding: "20px 0" }}>Loading console…</div>;

  if (!state.isAdmin)
    return (
      <>
        <Head onBack={onBack} />
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
          Only organization administrators can provision hospitals, staff and bedside devices.
        </div>
      </>
    );

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      <Head onBack={onBack} />
      <div style={{ display: "flex", gap: 7, marginTop: 14, flexWrap: "wrap" }}>
        {[
          ["people", "People"],
          ["facilities", "Hospitals"],
          ["devices", "Devices"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setSection(k)} style={chip(section === k, T.blueDeep)}>
            {l}
          </button>
        ))}
      </div>

      {err && <div style={{ fontSize: 13, color: T.red, marginTop: 12 }}>{err}</div>}
      {msg && <div style={{ fontSize: 13, color: T.green, marginTop: 12 }}>{msg}</div>}

      {section === "people" && (
        <>
          <Label>ONBOARD SOMEONE</Label>
          <Panel>
            <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 6 }}>Type of access</div>
            <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap" }}>
              {[
                ["onsite", "Onsite hospital staff"],
                ["virtual", "Virtual physician"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() =>
                    setInvite((v) => ({
                      ...v,
                      user_class: k,
                      facility_ids: k === "onsite" ? v.facility_ids.slice(0, 1) : v.facility_ids,
                    }))
                  }
                  style={chip(invite.user_class === k)}
                >
                  {l}
                </button>
              ))}
            </div>

            <Field
              label="Work email"
              value={invite.email}
              placeholder="name@hospital.org"
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
            />
            <Field
              label="Full name"
              value={invite.full_name}
              placeholder="Dr. Jane Rivera"
              onChange={(e) => setInvite({ ...invite, full_name: e.target.value })}
            />
            <Field
              label="Title"
              value={invite.title}
              placeholder="Attending, Critical Care"
              onChange={(e) => setInvite({ ...invite, title: e.target.value })}
            />

            {invite.user_class === "onsite" ? (
              <>
                <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 6 }}>Staff type</div>
                <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap" }}>
                  {STAFF_TYPES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInvite({ ...invite, staff_type: s })}
                      style={chip(invite.staff_type === s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Field
                  label="Unit or department"
                  value={invite.department}
                  placeholder="MICU"
                  onChange={(e) => setInvite({ ...invite, department: e.target.value })}
                />
              </>
            ) : (
              <Field
                label="Specialty"
                value={invite.specialty}
                placeholder="Tele-Cardiology"
                onChange={(e) => setInvite({ ...invite, specialty: e.target.value })}
              />
            )}

            <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 6 }}>
              {invite.user_class === "onsite"
                ? "Hospital (onsite staff are restricted to one site)"
                : "Hospitals covered"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
              {fac.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFacility(f.id)}
                  style={chip(invite.facility_ids.includes(f.id))}
                >
                  {f.short || f.name}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 6 }}>Access level</div>
            <div style={{ display: "flex", gap: 7 }}>
              {["member", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setInvite({ ...invite, role: r })}
                  style={{ ...chip(invite.role === r, T.blueDeep), textTransform: "capitalize" }}
                >
                  {r}
                </button>
              ))}
            </div>

            <Primary
              disabled={busy || !invite.email || invite.facility_ids.length === 0}
              onClick={async () => {
                const r = await run(() =>
                  inviteStaff({ data: { ...invite, redirectTo: origin } }),
                );
                if (r?.ok)
                  setInvite({ ...invite, email: "", full_name: "", title: "", department: "" });
              }}
            >
              {busy ? "Sending…" : "Send invitation"}
            </Primary>
          </Panel>

          <Label>INVITATIONS</Label>
          {state.invites.length === 0 && (
            <div style={{ fontSize: 13, color: T.sub }}>No invitations yet.</div>
          )}
          {state.invites.map((i) => (
            <Row
              key={i.id}
              title={i.full_name || i.email}
              sub={
                [
                  i.user_class === "onsite" ? `Onsite · ${i.staff_type || "Staff"}` : "Virtual",
                  i.title || i.specialty,
                  (i.facility_ids?.length ? i.facility_ids : [i.facility_id])
                    .filter(Boolean)
                    .map((f) => facName[f] || f)
                    .join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ") || i.email
              }
              right={<span style={TONE[i.status] || TONE.pending}>{i.status}</span>}
            >
              {i.status === "pending" && (
                <button
                  onClick={() => run(() => revokeInvite({ data: { id: i.id } }))}
                  style={{ all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 620, color: T.red }}
                >
                  Revoke
                </button>
              )}
            </Row>
          ))}

          <Label>ACTIVE ACCOUNTS</Label>
          {state.people.map((p) => (
            <Row
              key={p.id}
              title={p.name}
              sub={
                [p.role, p.dept, p.facilities.map((f) => facName[f] || f).join(", ")]
                  .filter(Boolean)
                  .join(" · ") || "No hospital access"
              }
              right={p.admin ? <span style={TONE.accepted}>admin</span> : null}
            />
          ))}
        </>
      )}

      {section === "facilities" && (
        <>
          <Label>ADD A HOSPITAL</Label>
          <Panel>
            <Field
              label="Identifier"
              value={nf.id}
              placeholder="riverbend"
              onChange={(e) => setNf({ ...nf, id: e.target.value })}
            />
            <Field
              label="Name"
              value={nf.name}
              placeholder="Riverbend Medical Center"
              onChange={(e) => setNf({ ...nf, name: e.target.value })}
            />
            <Field
              label="Short code"
              value={nf.short}
              placeholder="RMC"
              onChange={(e) => setNf({ ...nf, short: e.target.value })}
            />
            <Field
              label="EMR"
              value={nf.emr}
              placeholder="Epic"
              onChange={(e) => setNf({ ...nf, emr: e.target.value })}
            />
            <Primary
              disabled={busy || !nf.id || !nf.name || nf.short.length < 2}
              onClick={async () => {
                const r = await run(() => createFacility({ data: nf }));
                if (r?.ok) setNf({ id: "", name: "", short: "", emr: "Epic", hue: "#2E5CFF" });
              }}
            >
              Add hospital
            </Primary>
          </Panel>

          <Label>HOSPITALS</Label>
          {fac.map((f) => (
            <Row
              key={f.id}
              title={f.name}
              sub={`${f.short} · ${f.emr} · ${state.devices.filter((d) => d.facility_id === f.id).length} devices`}
              right={
                <span
                  style={{ width: 10, height: 10, borderRadius: 5, background: f.hue, display: "block" }}
                />
              }
            />
          ))}
        </>
      )}

      {section === "devices" && (
        <>
          <Label>REGISTER A CART OR WALL STATION</Label>
          <Panel>
            <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 6 }}>Hospital</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
              {fac.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setNd({ ...nd, facility_id: f.id })}
                  style={chip(nd.facility_id === f.id)}
                >
                  {f.short || f.name}
                </button>
              ))}
            </div>
            <Field
              label="Label"
              value={nd.label}
              placeholder="Tele-Cart 1"
              onChange={(e) => setNd({ ...nd, label: e.target.value })}
            />
            <Field
              label="Unit"
              value={nd.unit}
              placeholder="MICU"
              onChange={(e) => setNd({ ...nd, unit: e.target.value })}
            />
            <Field
              label="Room (leave blank if it floats)"
              value={nd.room}
              placeholder="412"
              onChange={(e) => setNd({ ...nd, room: e.target.value })}
            />
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button
                onClick={() => setNd({ ...nd, floating: !nd.floating })}
                style={chip(nd.floating)}
              >
                Floats between rooms
              </button>
              <button
                onClick={() => setNd({ ...nd, has_mintti: !nd.has_mintti })}
                style={chip(nd.has_mintti)}
              >
                Stethoscope attached
              </button>
            </div>
            <Primary
              disabled={busy || !nd.facility_id || !nd.label}
              onClick={async () => {
                const r = await run(() => registerDevice({ data: nd }));
                if (r?.ok)
                  setNd({
                    facility_id: nd.facility_id,
                    label: "",
                    unit: "",
                    room: "",
                    floating: false,
                    has_mintti: false,
                  });
              }}
            >
              Register device
            </Primary>
          </Panel>

          {code && (
            <div
              style={{
                marginTop: 14,
                background: T.blueSoft,
                border: "1px solid #DCE6FF",
                borderRadius: 18,
                padding: "14px 15px",
              }}
            >
              <div style={{ fontSize: 12.5, color: T.blueDeep, fontWeight: 640 }}>
                Enrollment code for {code.label} — shown once
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 30,
                  letterSpacing: 4,
                  fontWeight: 700,
                  color: T.blueDeep,
                  margin: "8px 0 6px",
                }}
              >
                {code.code}
              </div>
              <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6 }}>
                On the tablet, open <strong>{origin}/device</strong>, tap “Enroll this device” and
                enter the code. It expires in 7 days and can be used once.
              </div>
            </div>
          )}

          <Label>DEVICE FLEET</Label>
          {state.devices.length === 0 && (
            <div style={{ fontSize: 13, color: T.sub }}>No devices registered yet.</div>
          )}
          {state.devices.map((d) => (
            <Row
              key={d.id}
              title={d.label}
              sub={[
                facName[d.facility_id] || d.facility_id,
                d.unit,
                d.floating ? "Floating" : d.room ? `Rm ${d.room}` : null,
                d.has_mintti ? "Stethoscope" : null,
                d.last_seen_at ? `Seen ${new Date(d.last_seen_at).toLocaleString()}` : "Never paired",
              ]
                .filter(Boolean)
                .join(" · ")}
              right={<span style={TONE[d.status] || TONE.registered}>{d.status}</span>}
            >
              <button
                onClick={async () => {
                  const r = await run(() => mintEnrollment({ data: { device_id: d.id } }));
                  if (r?.ok) setCode({ code: r.code, label: d.label });
                }}
                style={{ ...chip(false), fontSize: 12 }}
              >
                {d.status === "enrolled" ? "New code" : "Enrollment code"}
              </button>
              {d.status === "enrolled" && (
                <button
                  onClick={() =>
                    run(() => setDeviceStatus({ data: { device_id: d.id, status: "revoked" } }))
                  }
                  style={{ all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 620, color: T.red }}
                >
                  Revoke
                </button>
              )}
            </Row>
          ))}
        </>
      )}
    </>
  );
}

function Head({ onBack }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <button onClick={onBack} aria-label="Back" style={{ all: "unset", cursor: "pointer", padding: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ fontSize: 16.5, fontWeight: 700, color: T.ink }}>Administration</div>
      </div>
      <p style={{ fontSize: 13, color: T.sub, margin: "2px 0 0" }}>
        Provision hospitals, onboard staff scoped to their site, and enrol bedside devices.
      </p>
    </>
  );
}
