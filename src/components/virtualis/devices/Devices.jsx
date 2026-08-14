import { useMemo, useState } from "react";
import { T, FACILITIES, inputStyle } from "../theme";
import { CART_STATES, minttiTrust } from "@/lib/telehealth/status";
import { hellocareTrust } from "@/lib/telehealth/hellocare";
import { hasNativeHost } from "@/lib/stethoscope/mintti";
import CartCard from "./CartCard";
import Preflight from "./Preflight";

const STATE_FILTERS = ["all", ...Object.keys(CART_STATES)];

export default function Devices({ carts, scope, onBeam, onNurse, onMessage, embedded }) {
  const [facility, setFacility] = useState("all");
  const [state, setState] = useState("all");
  const [q, setQ] = useState("");
  const [flight, setFlight] = useState(null);

  const video = hellocareTrust(false);
  const mintti = minttiTrust({
    streaming: false,
    nativeHost: typeof window !== "undefined" && hasNativeHost(),
    webBluetooth: typeof navigator !== "undefined" && !!navigator.bluetooth,
  });

  const list = useMemo(
    () =>
      carts.filter(
        (c) =>
          (facility === "all" || c.facility === facility) &&
          (state === "all" || c.state === state) &&
          (q.trim() === "" ||
            `${c.name} ${c.unit} ${c.room} ${c.nurse} ${c.patient || ""}`
              .toLowerCase()
              .includes(q.trim().toLowerCase())),
      ),
    [carts, facility, state, q],
  );

  const groups = scope
    .map((f) => ({ f, items: list.filter((c) => c.facility === f) }))
    .filter((g) => g.items.length > 0);

  const Chip = ({ on, onClick, children }) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        all: "unset",
        cursor: "pointer",
        flexShrink: 0,
        borderRadius: 20,
        padding: "6px 12px",
        fontSize: 12.5,
        fontWeight: 620,
        color: on ? "#fff" : T.ink,
        background: on ? T.blueDeep : "#fff",
        border: "1px solid " + (on ? T.blueDeep : T.line),
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: T.bg,
        padding: embedded ? "16px 18px 26px" : "14px 14px calc(90px + env(safe-area-inset-bottom,0px))",
        position: "relative",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 740, letterSpacing: -0.4, margin: 0 }}>Devices</h1>
          <div style={{ fontSize: 12.5, color: T.sub, marginTop: 2 }}>
            Carts and bedside stations across your credentialed facilities. Prototype fleet data.
          </div>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search cart, unit, room, nurse or patient"
          aria-label="Search devices"
          style={{ ...inputStyle, padding: "10px 14px", fontSize: 14 }}
        />

        <div className="vx-hscroll" style={{ display: "flex", gap: 7 }}>
          <Chip on={facility === "all"} onClick={() => setFacility("all")}>
            All facilities
          </Chip>
          {scope.map((f) => (
            <Chip key={f} on={facility === f} onClick={() => setFacility(f)}>
              {FACILITIES[f]?.name || f}
            </Chip>
          ))}
        </div>

        <div className="vx-hscroll" style={{ display: "flex", gap: 7 }}>
          {STATE_FILTERS.map((s) => (
            <Chip key={s} on={state === s} onClick={() => setState(s)}>
              {s === "all" ? "Any state" : CART_STATES[s].label}
            </Chip>
          ))}
        </div>

        {groups.length === 0 && (
          <div
            style={{
              background: "#fff",
              border: "1px solid " + T.line,
              borderRadius: 18,
              padding: 22,
              textAlign: "center",
              color: T.sub,
              fontSize: 13.5,
            }}
          >
            No devices match these filters.
          </div>
        )}

        {groups.map((g) => (
          <section key={g.f} style={{ display: "grid", gap: 10 }}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                margin: "6px 0 0",
                color: FACILITIES[g.f]?.hue || T.ink,
              }}
            >
              {FACILITIES[g.f]?.name || g.f}
              <span style={{ color: T.sub, fontWeight: 560 }}> · {g.items.length} devices</span>
            </h2>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              }}
            >
              {g.items.map((c) => (
                <CartCard
                  key={c.id}
                  cart={c}
                  video={video}
                  mintti={mintti}
                  onPreflight={setFlight}
                  onBeam={onBeam}
                  onNurse={onNurse}
                  onMessage={onMessage}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {flight && (
        <Preflight
          cart={flight}
          video={video}
          mintti={mintti}
          onClose={() => setFlight(null)}
          onBeam={(c) => {
            setFlight(null);
            onBeam(c);
          }}
        />
      )}
    </div>
  );
}
