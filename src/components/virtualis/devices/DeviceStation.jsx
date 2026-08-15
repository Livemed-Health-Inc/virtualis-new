import { useEffect, useMemo, useState } from "react";
import { T, FACILITIES, ACUITY, inputStyle } from "../theme";
import { Glyph } from "../ui";
import { SPECIALTIES } from "../data";
import { CARTS } from "./fleet.data";
import { hellocareTrust } from "@/lib/telehealth/hellocare";
import { TRUST } from "@/lib/telehealth/status";

/* Shared bedside device. No login, no user accounts: the cart identifies
   itself with its enrollment token, and on-call cover is shown by specialty
   only — never by name, and never with a fabricated clinician or ETA.
   Demo mode is local only and touches no backend. */

/* Demo-mode specialty list. Enrolled devices use live facility coverage. */
const DEMO_SPECIALTIES = [
  "Cardiology",
  "Neurology",
  "Emergency Medicine",
  "Critical Care",
  "Infectious Diseases",
  "Nephrology",
  "Pulmonology",
  "Psychiatry",
];

const api = (payload) =>
  fetch("/api/public/encounter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .catch(() => ({ ok: false }));

const initials = (n) =>
  n
    .replace(/^Dr\.\s*/, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();


const btn = (primary, disabled) => ({
  all: "unset",
  boxSizing: "border-box",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.45 : 1,
  textAlign: "center",
  minHeight: 52,
  padding: "0 22px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 16,
  fontSize: 15.5,
  fontWeight: 680,
  color: primary ? "#fff" : T.ink,
  background: primary ? T.blue : "#fff",
  border: "1px solid " + (primary ? T.blue : T.line),
});

function Card({ title, hint, children }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid " + T.line,
        borderRadius: 20,
        padding: 18,
        display: "grid",
        gap: 12,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 720 }}>{title}</h2>
        {hint && <div style={{ fontSize: 12.5, color: T.sub, marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </section>
  );
}

const TOKEN_KEY = "virtualis.device.token";

export default function DeviceStation() {
  const [cartId, setCartId] = useState(null);
  const [acuity, setAcuity] = useState("urgent");
  const [spec, setSpec] = useState(null);
  const [q, setQ] = useState("");
  const [sent, setSent] = useState(null); // { spec, acuity, call, requestId?, status?, provider? }
  const [coverage, setCoverage] = useState(null); // null = not loaded yet (enrolled only)
  const [rounding, setRounding] = useState([]);
  const [sending, setSending] = useState(false);


  /* Provisioning: a tablet becomes a real bedside station only after an
     administrator's single-use code pairs it to one registered cart. Until
     then it stays in clearly-labelled demo mode. */
  const [device, setDevice] = useState(undefined); // undefined = checking
  const [code, setCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollErr, setEnrollErr] = useState("");
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return setDevice(null);
    fetch("/api/public/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync", token }),
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.ok) setDevice(r.device);
        else {
          localStorage.removeItem(TOKEN_KEY);
          setDevice(null);
        }
      })
      .catch(() => setDevice(null));
  }, []);

  const enroll = async () => {
    setEnrollErr("");
    setEnrolling(true);
    try {
      const r = await fetch("/api/public/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pair", code: code.trim().toUpperCase() }),
      }).then((x) => x.json());
      if (r.ok) {
        localStorage.setItem(TOKEN_KEY, r.token);
        setDevice(r.device);
        setCode("");
      } else setEnrollErr("That code is not valid, already used, or expired.");
    } catch {
      setEnrollErr("Could not reach Virtualis. Check the network and try again.");
    }
    setEnrolling(false);
  };

  const cart = useMemo(
    () =>
      device
        ? {
            id: device.id,
            facility: device.facility.id,
            facilityName: device.facility.name,
            name: device.label,
            unit: device.unit,
            room: device.room || "",
          }
        : CARTS.find((c) => c.id === cartId) || null,
    [device, cartId],
  );
  const video = hellocareTrust(false);

  /* Live facility coverage for an enrolled device. Demo mode stays local. */
  useEffect(() => {
    if (!device) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    let alive = true;
    const pull = async () => {
      const r = await api({ action: "coverage", token });
      if (!alive || !r.ok) return;
      setCoverage(r.coverage ?? []);
      setRounding(r.rounding ?? []);
    };
    pull();
    const id = setInterval(pull, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [device]);

  /* Poll the placed request until a clinician answers. */
  useEffect(() => {
    if (!device || !sent?.requestId || ["accepted", "declined", "ended", "cancelled"].includes(sent.status))
      return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const id = setInterval(async () => {
      const r = await api({ action: "status", token, requestId: sent.requestId });
      if (r.ok) setSent((s) => (s ? { ...s, status: r.status, provider: r.provider ?? null } : s));
    }, 4000);
    return () => clearInterval(id);
  }, [device, sent?.requestId, sent?.status]);

  const available = useMemo(
    () => new Map((coverage ?? []).map((c) => [c.specialty, c.available])),
    [coverage],
  );

  const specs = useMemo(() => {
    const onCall = device ? [...available.keys()] : DEMO_SPECIALTIES;
    const t = q.trim().toLowerCase();
    if (!t) return onCall.slice(0, 12);
    const all = [...new Set([...onCall, ...SPECIALTIES])];
    return all.filter((s) => s.toLowerCase().includes(t)).slice(0, 12);
  }, [q, device, available]);

  const canSend = !!spec && (!device || (available.get(spec) ?? 0) > 0);

  const place = async (call) => {
    if (!canSend) return;
    if (!device) return setSent({ spec, acuity, call, status: "demo" });
    const token = localStorage.getItem(TOKEN_KEY);
    setSending(true);
    const r = await api({
      action: "request",
      token,
      specialty: spec,
      urgency: acuity,
      mode: call ? "call" : "consult",
    });
    setSending(false);
    if (r.ok) setSent({ spec, acuity, call, requestId: r.requestId, status: r.status });
  };

  const closeSent = async () => {
    if (device && sent?.requestId && sent.status === "requested") {
      const token = localStorage.getItem(TOKEN_KEY);
      await api({ action: "cancel", token, requestId: sent.requestId });
    }
    setSent(null);
    setSpec(null);
  };

  const ackRounding = async (providerId) => {
    const token = localStorage.getItem(TOKEN_KEY);
    setRounding((rs) => rs.filter((r) => r.providerId !== providerId));
    if (device && token) await api({ action: "ack_rounding", token, providerId });
  };

  const shell = (children) => (
    <main
      style={{
        minHeight: "100dvh",
        background: T.bg,
        color: T.ink,
        padding: "20px 16px 40px",
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 14 }}>{children}</div>
    </main>
  );

  if (device === undefined)
    return shell(<div style={{ fontSize: 14, color: T.sub }}>Checking this device…</div>);

  if (!device && !demo) {
    return shell(
      <>
        <header>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 760, letterSpacing: -0.5 }}>
            Virtualis Bedside Station
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.sub }}>
            This device is not provisioned yet.
          </p>
        </header>
        <Card
          title="Enroll this device"
          hint="Ask your Virtualis administrator for the one-time code for this cart."
        >
          <input
            style={{ ...inputStyle, fontSize: 22, letterSpacing: 3, textAlign: "center" }}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            aria-label="Enrollment code"
            autoComplete="off"
          />
          {enrollErr && <div style={{ fontSize: 13, color: T.red }}>{enrollErr}</div>}
          <button
            style={btn(true, enrolling || code.trim().length < 6)}
            disabled={enrolling || code.trim().length < 6}
            onClick={enroll}
          >
            {enrolling ? "Enrolling…" : "Enroll device"}
          </button>
          <button style={btn(false)} onClick={() => setDemo(true)}>
            Continue in demo mode
          </button>
          <div style={{ fontSize: 12.5, color: T.sub }}>
            Demo mode uses sample carts. Nothing is transmitted and it is never for clinical use.
          </div>
        </Card>
      </>,
    );
  }

  if (!cart) {
    return shell(
      <>
        <header>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 760, letterSpacing: -0.5 }}>
            Virtualis Bedside Station
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.sub }}>
            Demo mode — select a sample cart to explore the bedside flow.
          </p>
        </header>
        <Card title="Which cart is this?" hint="Demo only. Enrol the device for real use.">
          <div style={{ display: "grid", gap: 8 }}>
            {CARTS.map((c) => (
              <button key={c.id} onClick={() => setCartId(c.id)} style={btn(false)}>
                <span style={{ width: "100%", textAlign: "left" }}>
                  {c.name}
                  <span style={{ color: T.sub, fontWeight: 560 }}>
                    {" · "}
                    {FACILITIES[c.facility]?.name} · {c.unit}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <button style={btn(false)} onClick={() => setDemo(false)}>
            Enroll this device instead
          </button>
        </Card>
      </>,
    );
  }


  if (sent) {
    const accepted = sent.status === "accepted" && sent.provider;
    const closed = ["declined", "ended", "cancelled"].includes(sent.status);
    const title = accepted
      ? sent.call
        ? "Clinician joining"
        : "Consult accepted"
      : sent.status === "declined"
        ? "Request declined"
        : closed
          ? "Request closed"
          : sent.call
            ? "Calling the on-call clinician…"
            : "Consult request sent";
    return shell(
      <>
        <Card
          title={title}
          hint={
            accepted
              ? "The clinician has accepted and is connecting to this cart."
              : closed
                ? "No clinician is attached to this request."
                : "Waiting for whoever is holding the pager to answer. No clinician is assigned yet."
          }
        >
          {accepted ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: "1px solid " + T.line,
                borderRadius: 16,
                padding: 14,
                background: T.blueSoft,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 54,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  background: "#fff",
                  border: "1px solid " + T.line,
                  fontSize: 17,
                  fontWeight: 760,
                  color: T.blueDeep || T.blue,
                }}
              >
                {initials(sent.provider.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16.5, fontWeight: 740 }}>{sent.provider.name}</div>
                <div style={{ fontSize: 12.5, color: T.sub }}>{sent.provider.role}</div>
                <div style={{ fontSize: 12.5, color: T.sub, marginTop: 2 }}>
                  Accepted for <strong style={{ color: T.ink }}>{sent.spec}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                border: "1px dashed " + T.line,
                borderRadius: 16,
                padding: 14,
                fontSize: 13.5,
                color: T.sub,
                background: "#fff",
              }}
            >
              {sent.status === "demo"
                ? "Demo mode — nothing was sent."
                : `${sent.spec} pager alerted. The clinician's name appears once someone accepts.`}
            </div>
          )}

          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            {cart.name}
            {cart.room ? ` · Rm ${cart.room}` : ""}
            <br />
            <span style={{ color: ACUITY[sent.acuity].color, fontWeight: 680 }}>
              {ACUITY[sent.acuity].label}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: T.sub }}>
            Video channel: {TRUST[video.level].label} — {video.reason}.
            {!device && " Demo mode — nothing is transmitted."}
          </div>
          <button style={btn(true)} onClick={closeSent}>
            {closed || accepted ? "Done" : sent.call ? "Cancel" : "Done"}
          </button>
        </Card>
      </>,
    );
  }


  return shell(
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: "10px 0",
          background: T.bg,
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 18.5, fontWeight: 760, letterSpacing: -0.4 }}>
            {cart.name}
            <span style={{ color: T.sub, fontWeight: 600 }}>
              {cart.room ? ` · Rm ${cart.room}` : ""}
            </span>
          </h1>
          <div style={{ fontSize: 12.5, color: T.sub }}>
            {cart.facilityName || FACILITIES[cart.facility]?.name} · {cart.unit} ·{" "}
            {device ? "provisioned device, no sign-in" : "demo mode — not for clinical use"}
          </div>
        </div>
        {!device && (
          <button style={{ ...btn(false), minHeight: 40 }} onClick={() => setCartId(null)}>
            Change cart
          </button>
        )}
      </header>

      {rounding.map((r) => (
        <div
          key={r.providerId}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "1px solid " + T.green,
            background: T.green + "12",
            borderRadius: 16,
            padding: "12px 14px",
          }}
        >
          <div style={{ flex: 1, fontSize: 14, fontWeight: 660 }}>
            {r.name} is ready to round
          </div>
          <button
            style={{ ...btn(false), minHeight: 40 }}
            onClick={() => ackRounding(r.providerId)}
          >
            Acknowledge
          </button>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Urgency">
        {Object.keys(ACUITY).map((a) => (
          <button
            key={a}
            aria-pressed={acuity === a}
            onClick={() => setAcuity(a)}
            style={{
              ...btn(false),
              flex: "1 1 140px",
              minHeight: 48,
              padding: "0 14px",
              borderColor: acuity === a ? ACUITY[a].color : T.line,
              background: acuity === a ? ACUITY[a].color + "12" : "#fff",
            }}
          >
            <Glyph level={a} size={14} />
            <span style={{ marginLeft: 8 }}>{ACUITY[a].label}</span>
          </button>
        ))}
      </div>

      <Card
        title="On call now"
        hint="Cover is shown by specialty only. Tap a specialty to reach whoever is holding that pager."
      >
        <input
          style={inputStyle}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search all specialties"
          aria-label="Search specialties"
        />
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          }}
        >
          {specs.map((s) => {
            const free = device ? (available.get(s) ?? 0) > 0 : true;
            return (
              <button
                key={s}
                aria-pressed={spec === s}
                disabled={!free}
                onClick={() => setSpec(s)}
                style={{
                  ...btn(false, !free),
                  minHeight: 60,
                  justifyContent: "flex-start",
                  borderWidth: spec === s ? 2 : 1,
                  borderColor: spec === s ? T.blue : T.line,
                  background: spec === s ? T.blueSoft : "#fff",
                  boxShadow: spec === s ? "0 6px 18px rgba(16,60,120,.12)" : "none",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 8,
                    background: free ? T.green : T.line,
                    marginRight: 10,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 15 }}>{s}</span>
                {device && (
                  <span style={{ marginLeft: "auto", fontSize: 12, color: T.sub }}>
                    {free ? `${available.get(s)} on call` : "unavailable"}
                  </span>
                )}
              </button>
            );
          })}
          {specs.length === 0 && (
            <div style={{ color: T.sub, fontSize: 13.5 }}>
              {q.trim()
                ? "No specialty matches that search."
                : coverage === null && device
                  ? "Checking who is on call…"
                  : "No clinician is on call right now."}
            </div>
          )}
        </div>
      </Card>

      <div
        style={{
          position: "sticky",
          bottom: 0,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          padding: "12px 0 calc(8px + env(safe-area-inset-bottom, 0px))",
          background: T.bg,
        }}
      >
        <button
          style={{ ...btn(true, !canSend || sending), flex: "2 1 240px" }}
          disabled={!canSend || sending}
          onClick={() => place(true)}
        >
          Start virtual encounter
        </button>
        <button
          style={{ ...btn(false, !canSend || sending), flex: "1 1 180px" }}
          disabled={!canSend || sending}
          onClick={() => place(false)}
        >
          Send consult request
        </button>
      </div>
    </>,
  );
}

