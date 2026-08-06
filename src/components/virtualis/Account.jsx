import { useMemo, useState } from "react";
import { T, mono, useMediaQuery } from "./theme";
import { FACILITIES, inputStyle, Avatar } from "./ui";
import { useVirtualis } from "@/lib/virtualis/store";

/* ── Account panel — identity, preferences, policies, sign out ──── */

const Row = ({ label, hint, onClick, chevron = true }) => (
  <button
    onClick={onClick}
    style={{
      all: "unset",
      boxSizing: "border-box",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 12,
      width: "100%",
      padding: "13px 14px",
      border: "1px solid " + T.line,
      borderRadius: 16,
      marginBottom: 8,
      background: T.card,
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14.5, fontWeight: 640, color: T.ink }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{hint}</div>}
    </div>
    {chevron && (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2">
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </button>
);

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

const Toggle = ({ on, onChange, label, hint }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      border: "1px solid " + T.line,
      borderRadius: 16,
      marginBottom: 8,
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14.5, fontWeight: 620, color: T.ink }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{hint}</div>}
    </div>
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        all: "unset",
        cursor: "pointer",
        width: 44,
        height: 26,
        borderRadius: 13,
        background: on ? T.blue : "#D5D9E2",
        position: "relative",
        transition: "background .18s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(16,24,40,.3)",
          transition: "left .18s cubic-bezier(.2,.8,.3,1)",
        }}
      />
    </button>
  </div>
);

const Field = ({ label, value, onChange }) => (
  <label style={{ display: "block", marginBottom: 10 }}>
    <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 5 }}>{label}</div>
    <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
  </label>
);

const Legal = ({ paras }) =>
  paras.map((p, i) => (
    <p key={i} style={{ fontSize: 13.5, lineHeight: 1.6, color: T.sub, margin: "0 0 12px" }}>
      {p}
    </p>
  ));

export function Account({ onClose, onSchedule, onSignOut }) {
  const { me, threads, updateProfile } = useVirtualis();
  const wide = useMediaQuery("(min-width: 900px)");
  const [view, setView] = useState("home");
  const [form, setForm] = useState({
    name: me.name,
    role: me.role,
    dept: me.dept,
    home_facility: me.homeFacility,
  });
  const [saved, setSaved] = useState(false);

  const stats = useMemo(
    () => ({
      consults: threads.length,
      messages: threads.reduce((n, t) => n + t.msgs.length, 0),
    }),
    [threads],
  );

  const setPref = (k, v) => updateProfile({ notification_prefs: { ...me.prefs, [k]: v } });

  const exportData = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { profile: me, threads: threads.map(({ msgs, ...t }) => ({ ...t, messages: msgs })) },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "virtualis-my-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Back = ({ title }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
      <button
        onClick={() => setView("home")}
        aria-label="Back"
        style={{ all: "unset", cursor: "pointer", padding: 4 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2">
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div style={{ fontSize: 16.5, fontWeight: 700, color: T.ink }}>{title}</div>
    </div>
  );

  const body = {
    home: (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar initials={me.initials} team size={46} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{me.name}</div>
            <div style={{ fontSize: 12.5, color: T.sub }}>
              {me.role} · {me.dept}
            </div>
            <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{me.email}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {[
            ["Consults", stats.consults],
            ["Messages", stats.messages],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                flex: 1,
                background: T.blueSoft,
                border: "1px solid #DCE6FF",
                borderRadius: 18,
                padding: "14px 0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: T.blueDeep }}>{v}</div>
              <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>

        <Label>ACTIVE CREDENTIALS</Label>
        {me.credentials.map((c) => (
          <div
            key={c.facility}
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
            <span
              style={{
                width: 8,
                height: 34,
                borderRadius: 4,
                background: FACILITIES[c.facility]?.hue || T.blue,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 640, color: T.ink }}>
                {FACILITIES[c.facility]?.name || c.facility}
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                {c.privileges} · {FACILITIES[c.facility]?.emr}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 620,
                color: T.green,
                background: "#EDFBF3",
                border: "1px solid #C9F0DB",
                borderRadius: 14,
                padding: "4px 9px",
                whiteSpace: "nowrap",
              }}
            >
              to {c.expires}
            </span>
          </div>
        ))}

        <Label>ACCOUNT</Label>
        <Row label="Profile" hint="Name, role, department, home facility" onClick={() => setView("profile")} />
        <Row label="Notifications" hint="Acuity alerts and quiet hours" onClick={() => setView("notifications")} />
        <Row
          label="My Schedule"
          hint="Shifts and coverage"
          onClick={() => {
            onSchedule?.();
            onClose();
          }}
        />

        <Label>PRIVACY & SUPPORT</Label>
        <Row label="Privacy Policy" onClick={() => setView("privacy")} />
        <Row label="Terms of Service" onClick={() => setView("terms")} />
        <Row label="Data Management" hint="Export or delete your data" onClick={() => setView("data")} />
        <Row label="Help & Support" onClick={() => setView("support")} />
      </>
    ),
    profile: (
      <>
        <Back title="Profile" />
        <Label>DETAILS</Label>
        <Field label="Display name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
        <Field label="Department" value={form.dept} onChange={(v) => setForm({ ...form, dept: v })} />
        <div style={{ fontSize: 12.5, color: T.sub, margin: "4px 0 6px" }}>Home facility</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {me.credentials.map((c) => (
            <button
              key={c.facility}
              onClick={() => setForm({ ...form, home_facility: c.facility })}
              style={{
                all: "unset",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 620,
                padding: "8px 13px",
                borderRadius: 14,
                color: form.home_facility === c.facility ? T.blueDeep : T.sub,
                background: form.home_facility === c.facility ? T.blueSoft : T.card,
                border: "1px solid " + (form.home_facility === c.facility ? "#DCE6FF" : T.line),
              }}
            >
              {FACILITIES[c.facility]?.short || c.facility}
            </button>
          ))}
        </div>
        <button
          onClick={async () => {
            const initials = form.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();
            await updateProfile({ ...form, initials: initials || me.initials });
            setSaved(true);
            setTimeout(() => setSaved(false), 1600);
          }}
          style={{
            all: "unset",
            boxSizing: "border-box",
            cursor: "pointer",
            width: "100%",
            textAlign: "center",
            marginTop: 18,
            background: T.blue,
            color: "#fff",
            fontSize: 15,
            fontWeight: 640,
            borderRadius: 16,
            padding: "13px 0",
          }}
        >
          {saved ? "Saved" : "Save changes"}
        </button>
      </>
    ),
    notifications: (
      <>
        <Back title="Notifications" />
        <Label>ALERT ME FOR</Label>
        <Toggle
          label="Critical"
          hint="Three bars · immediate response"
          on={!!me.prefs.critical}
          onChange={(v) => setPref("critical", v)}
        />
        <Toggle
          label="Urgent"
          hint="Two bars"
          on={!!me.prefs.urgent}
          onChange={(v) => setPref("urgent", v)}
        />
        <Toggle
          label="Routine"
          hint="One bar"
          on={!!me.prefs.routine}
          onChange={(v) => setPref("routine", v)}
        />
        <Label>QUIET HOURS</Label>
        <Toggle
          label="Mute off-shift"
          hint="Only critical messages break through when you are not on the schedule"
          on={!!me.prefs.quietOffShift}
          onChange={(v) => setPref("quietOffShift", v)}
        />
      </>
    ),
    privacy: (
      <>
        <Back title="Privacy Policy" />
        <Label>HOW WE HANDLE CLINICAL DATA</Label>
        <Legal
          paras={[
            "Virtualis® processes protected health information solely to route clinical messages to the appropriate clinician. Access is scoped to the facilities where you hold active credentials and enforced at the database layer.",
            "Message content, patient identifiers, and routing metadata are encrypted in transit and at rest. We do not sell or share clinical data with advertisers or third-party data brokers.",
            "Audit records of message access are retained per facility policy and are available to your compliance officer on request.",
            "This is placeholder policy text. Replace with your organization's reviewed privacy notice before production use.",
          ]}
        />
      </>
    ),
    terms: (
      <>
        <Back title="Terms of Service" />
        <Label>USER OBLIGATIONS</Label>
        <Legal
          paras={[
            "Virtualis® is a clinical communication tool and is not a substitute for clinical judgment, an emergency response system, or a medical device. Acuity routing is decision support only.",
            "You are responsible for maintaining the confidentiality of your credentials and for all activity under your account, and for using the platform in accordance with HIPAA and your facility's policies.",
            "Do not use the platform for time-critical emergencies where a page, code call, or direct phone contact is the established pathway.",
            "This is placeholder terms text. Replace with your organization's reviewed agreement before production use.",
          ]}
        />
      </>
    ),
    data: (
      <>
        <Back title="Data Management" />
        <Label>YOUR DATA</Label>
        <Row
          label="Export my data"
          hint="Download your profile and consults as JSON"
          chevron={false}
          onClick={exportData}
        />
        <Row
          label="Request account deletion"
          hint="Sends a deletion request to your facility administrator"
          chevron={false}
          onClick={() =>
            window.open(
              "mailto:support@virtualischat.com?subject=Account%20deletion%20request",
              "_blank",
            )
          }
        />
        <p style={{ fontSize: 12.5, color: T.faint, lineHeight: 1.6 }}>
          Clinical messages are part of the medical record and are retained per facility policy even
          after an account is closed.
        </p>
      </>
    ),
    support: (
      <>
        <Back title="Help & Support" />
        <Label>CONTACT</Label>
        <Row
          label="Email support"
          hint="support@virtualischat.com"
          chevron={false}
          onClick={() => window.open("mailto:support@virtualischat.com", "_blank")}
        />
        <p style={{ fontSize: 12.5, color: T.faint, marginTop: 14 }}>Virtualis® · version 1.0</p>
      </>
    ),
  }[view];

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 80,
        background: "rgba(16,24,40,.4)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: wide ? "stretch" : "flex-end",
        justifyContent: wide ? "flex-end" : "center",
        animation: "fadeIn .2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.card,
          width: "100%",
          maxWidth: wide ? 420 : 520,
          borderRadius: wide ? 0 : "24px 24px 0 0",
          padding: wide ? "22px 22px 26px" : "20px 20px 26px",
          animation: wide ? "slideIn .28s cubic-bezier(.2,.8,.3,1)" : "rise .28s cubic-bezier(.2,.8,.3,1)",
          maxHeight: wide ? "100%" : "82%",
          overflowY: "auto",
          boxSizing: "border-box",
          borderLeft: wide ? "1px solid " + T.line : "none",
        }}
      >
        {!wide && (
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "#DEE2E9",
              margin: "0 auto 16px",
            }}
          />
        )}
        {body}
        <button
          onClick={onClose}
          style={{
            all: "unset",
            boxSizing: "border-box",
            cursor: "pointer",
            width: "100%",
            textAlign: "center",
            marginTop: 16,
            background: "#F2F4F7",
            color: T.ink,
            fontSize: 15,
            fontWeight: 640,
            borderRadius: 16,
            padding: "13px 0",
          }}
        >
          Close
        </button>
        {onSignOut && view === "home" && (
          <button
            onClick={onSignOut}
            style={{
              all: "unset",
              boxSizing: "border-box",
              cursor: "pointer",
              width: "100%",
              textAlign: "center",
              marginTop: 8,
              color: T.red,
              fontSize: 14.5,
              fontWeight: 620,
              borderRadius: 16,
              padding: "12px 0",
              border: "1px solid #FDE0DD",
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
