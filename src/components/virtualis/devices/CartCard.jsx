import { T, FACILITIES } from "../theme";
import { Glyph } from "../ui";
import { CART_STATES, TRUST } from "@/lib/telehealth/status";
import { MINTTI_FIELD } from "./fleet.data";

export function Pill({ tone, soft, mark, children, title }) {
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        borderRadius: 20,
        padding: "3px 9px",
        fontSize: 11.5,
        fontWeight: 640,
        color: tone,
        background: soft || tone + "14",
        border: "1px solid " + tone + "33",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden style={{ fontSize: 9 }}>
        {mark}
      </span>
      {children}
    </span>
  );
}

function Action({ label, primary, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        all: "unset",
        cursor: disabled ? "not-allowed" : "pointer",
        boxSizing: "border-box",
        textAlign: "center",
        minHeight: 34,
        padding: "0 13px",
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 12,
        fontSize: 12.5,
        fontWeight: 640,
        opacity: disabled ? 0.45 : 1,
        color: primary ? "#fff" : T.ink,
        background: primary ? T.blue : "#fff",
        border: "1px solid " + (primary ? T.blue : T.line),
      }}
    >
      {label}
    </button>
  );
}

export default function CartCard({
  cart,
  video,
  mintti,
  nurse,
  onPreflight,
  onBeam,
  onNurse,
  onMessage,
}) {
  const st = CART_STATES[cart.state];
  const hue = FACILITIES[cart.facility]?.hue || T.blue;
  const m = MINTTI_FIELD[cart.mintti];
  const busy = cart.state === "offline" || cart.state === "session";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid " + T.line,
        borderLeft: `3px solid ${hue}`,
        borderRadius: 18,
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{cart.name}</span>
        <Pill tone={st.tone}>{st.label}</Pill>
        {cart.acuity && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Glyph level={cart.acuity} size={13} />
            <span style={{ fontSize: 11.5, color: T.sub }}>waiting {cart.waitedMin}m</span>
          </span>
        )}
      </div>

      <div style={{ fontSize: 12.5, color: T.sub }}>
        {cart.unit} · Rm {cart.room} · {cart.nurse}
        {cart.patient ? ` · ${cart.patient}` : " · no patient assigned"}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Pill tone={TRUST[video.level].tone} soft={TRUST[video.level].soft} mark={TRUST[video.level].mark} title={video.reason}>
          HelloCare video · {TRUST[video.level].label}
        </Pill>
        <Pill tone={TRUST[mintti.level].tone} soft={TRUST[mintti.level].soft} mark={TRUST[mintti.level].mark} title={mintti.reason}>
          Mintti host · {TRUST[mintti.level].label}
        </Pill>
        <Pill tone={m.tone}>
          Stethoscope · {m.label}
          {cart.minttiBattery != null ? ` · ${cart.minttiBattery}%` : ""}
        </Pill>
        <Pill tone={cart.nurse === "Unassigned" ? T.faint : T.blueDeep}>
          Bedside nurse · {cart.nurse === "Unassigned" ? "Unassigned" : "Assigned"}
        </Pill>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Action label="Preflight" onClick={() => onPreflight(cart)} />
        {nurse ? (
          <>
            {cart.state === "preparing" ? (
              <Action primary label="Mark ready" onClick={() => onNurse("ready", cart)} />
            ) : cart.state === "available" ? (
              <Action primary label="Request clinician" onClick={() => onNurse("request", cart)} />
            ) : (
              <Action
                primary
                label="Prepare cart"
                disabled={cart.state === "offline"}
                onClick={() => onNurse("prepare", cart)}
              />
            )}
            <Action label="Message care team" onClick={() => onMessage(cart)} />
          </>
        ) : (
          <>
            <Action
              primary
              label={
                video.level === "live"
                  ? "Join live session"
                  : video.level === "available"
                    ? "Open HelloCare handoff"
                    : "Beam in (preview)"
              }
              disabled={busy}
              onClick={() => onBeam(cart)}
            />
            <Action label="Message nurse" onClick={() => onMessage(cart)} />
            {cart.state === "available" ? (
              <Action label="Request clinician" onClick={() => onNurse("request", cart)} />
            ) : cart.state === "preparing" ? (
              <Action label="Mark ready" onClick={() => onNurse("ready", cart)} />
            ) : (
              <Action label="Prepare cart" onClick={() => onNurse("prepare", cart)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
