import { useEffect, useMemo, useRef, useState } from "react";
import { T, mono, FACILITIES } from "./theme";
import { FacilityChip } from "./ui";
// @ts-ignore - typed modules consumed from JSX
import { useStethoscope } from "@/hooks/useStethoscope";
import { Waveform } from "@/components/stethoscope/Waveform";
import { Spectrum } from "@/components/stethoscope/Spectrum";
import { MODE_FILTERS } from "@/lib/stethoscope/types";

const MODES = [
  { id: "bell", label: "Heart" },
  { id: "diaphragm", label: "Lung" },
  { id: "wide", label: "Wide" },
];

const fmt = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

const glass = {
  background: "rgba(255,255,255,.05)",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 18,
};

function Chip({ on, onClick, children, wide }) {
  return (
    <button
      onClick={onClick}
      style={{
        all: "unset",
        cursor: "pointer",
        boxSizing: "border-box",
        flex: wide ? 1 : "0 0 auto",
        textAlign: "center",
        minHeight: 40,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "9px 14px",
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 640,
        color: on ? "#fff" : "#AFC6FF",
        background: on ? T.blue : "rgba(255,255,255,.06)",
        border: `1px solid ${on ? T.blue : "rgba(255,255,255,.12)"}`,
      }}
    >
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange, suffix }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12.5,
          color: "#AFC6FF",
          marginBottom: 6,
        }}
      >
        <span style={{ fontWeight: 620 }}>{label}</span>
        <span style={{ fontFamily: mono }}>{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: T.blue }}
        aria-label={label}
      />
    </div>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minHeight: 44,
        padding: "0 14px",
        ...glass,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 620, color: "#DCE6FF" }}>{label}</span>
      <span
        style={{
          width: 40,
          height: 23,
          borderRadius: 12,
          background: on ? T.blue : "rgba(255,255,255,.18)",
          position: "relative",
          transition: "background .18s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 20 : 3,
            width: 17,
            height: 17,
            borderRadius: 9,
            background: "#fff",
            transition: "left .18s",
          }}
        />
      </span>
    </button>
  );
}

/* Full-screen auscultation station. Device I/O, audio graph and DSP all live
   in useStethoscope; this screen is the Virtualis-styled surface for it. */
export default function Auscultation({ t, threads = [], onClose }) {
  const s = useStethoscope();
  const [picked, setPicked] = useState(t?.id ?? null);
  const [advanced, setAdvanced] = useState(false);
  const [clips, setClips] = useState([]);
  const seen = useRef(null);

  const patient = useMemo(
    () => t ?? threads.find((x) => x.id === picked) ?? null,
    [t, threads, picked],
  );

  // Auto-connect to the first discovered device, then start streaming.
  useEffect(() => {
    if (!s.deviceId && s.devices.length > 0) void s.connect(s.devices[0].uuid);
  }, [s.devices, s.deviceId, s]);

  useEffect(() => {
    if (s.connected && !s.capturing) void s.startCapture();
  }, [s.connected, s.capturing, s]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Each finished clip is kept in-browser only, labelled with patient context.
  useEffect(() => {
    if (!s.lastClip || seen.current === s.lastClip.url) return;
    seen.current = s.lastClip.url;
    setClips((c) => [
      {
        url: s.lastClip.url,
        seconds: Math.round(s.lastClip.seconds),
        mode: MODE_FILTERS[s.mode].label,
        label: patient ? `${patient.patient} · Rm ${patient.room}` : "Unassigned exam",
        file: `auscultation-${(patient?.mrn || patient?.patient || "exam")
          .toString()
          .replace(/\W+/g, "-")
          .toLowerCase()}-${Date.now()}.wav`,
        at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      },
      ...c,
    ]);
  }, [s.lastClip, s.mode, patient]);

  const gainPct = Math.round(((s.gain - 1) / 119) * 100);
  const live = s.connected ? (s.capturing ? "STREAMING" : "PAUSED") : s.status.toUpperCase();
  const hue = patient ? FACILITIES[patient.facility]?.hue || T.blue : T.blue;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 75,
        background: "#080C16",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn .25s ease",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          flexWrap: "wrap",
          borderBottom: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close auscultation"
          style={{
            all: "unset",
            cursor: "pointer",
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "rgba(255,255,255,.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.15 }}>
            {patient ? patient.patient : "Auscultation"}
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: 1.4,
              color: s.capturing ? "#6FE3B0" : "#8DA2CF",
              marginTop: 2,
            }}
          >
            {live}
            {s.capturing ? ` · ${fmt(s.elapsed)}` : ""}
          </div>
        </div>
        {patient && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <FacilityChip id={patient.facility} />
            <span style={{ fontSize: 12, color: "#AFC6FF" }}>
              Rm {patient.room}
              {patient.mrn ? ` · MRN ${patient.mrn}` : ""}
            </span>
          </div>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "#8DA2CF",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          {s.battery !== null && <span>{s.battery}%</span>}
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.2 }}>
            {s.hostKind === "native"
              ? "iOS BRIDGE"
              : s.hostKind === "webble"
                ? "BLUETOOTH"
                : "SIMULATOR"}
          </span>
        </span>
      </div>

      {/* body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "14px 14px calc(22px + env(safe-area-inset-bottom, 0px))",
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          alignContent: "start",
        }}
      >
        {/* patient picker when no consult is open */}
        {!t && threads.length > 0 && (
          <div style={{ ...glass, padding: 12, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12.5, color: "#AFC6FF", marginBottom: 8 }}>
              Attach this exam to a patient
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              <Chip on={!picked} onClick={() => setPicked(null)}>
                Unassigned
              </Chip>
              {threads.slice(0, 12).map((x) => (
                <Chip key={x.id} on={picked === x.id} onClick={() => setPicked(x.id)}>
                  {x.patient} · Rm {x.room}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* stage */}
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ ...glass, padding: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 660 }}>Live waveform</span>
              <span style={{ fontSize: 12, color: "#8DA2CF" }}>{MODE_FILTERS[s.mode].hint}</span>
            </div>
            <div
              style={{
                height: 170,
                borderRadius: 14,
                background: "linear-gradient(180deg,#0C1428,#0A101F)",
                border: "1px solid rgba(255,255,255,.07)",
                overflow: "hidden",
              }}
            >
              <Waveform analyser={s.analyser} active={s.capturing} trace={hue} />
            </div>
            <div
              style={{
                height: 54,
                marginTop: 8,
                borderRadius: 12,
                background: "rgba(255,255,255,.03)",
                overflow: "hidden",
              }}
            >
              <Spectrum analyser={s.analyser} active={s.capturing} trace={hue} />
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(46,92,214,.16)",
                border: "1px solid rgba(143,182,255,.24)",
                borderRadius: 14,
                padding: "10px 13px",
              }}
            >
              <span
                key={s.beatTick}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: T.red,
                  animation: "acuityPulse 1s ease-out",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 19, fontWeight: 720, fontFamily: mono }}>
                {s.liveBpm ?? s.heartRate ?? "--"}
              </span>
              <span style={{ fontSize: 12.5, color: "#AFC6FF" }}>BPM · live beat detection</span>
              {s.pressWarning && (
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#FFC46B" }}>
                  Ease pressure
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {MODES.map((m) => (
              <Chip key={m.id} wide on={s.mode === m.id} onClick={() => s.setMode(m.id)}>
                {m.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* controls */}
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ ...glass, padding: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 660, flex: 1 }}>
                Mintti Smartho{s.version ? ` · ${s.version}` : ""}
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: s.connected ? "#12B76A" : "#8DA2CF",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {s.connected ? (
                <>
                  <Chip wide on={false} onClick={s.disconnect}>
                    Disconnect
                  </Chip>
                  <Chip
                    wide
                    on={s.capturing}
                    onClick={() => (s.capturing ? s.stopCapture() : s.startCapture())}
                  >
                    {s.capturing ? "Pause" : "Resume"}
                  </Chip>
                </>
              ) : (
                <Chip wide on onClick={s.status === "scanning" ? undefined : s.scan}>
                  {s.status === "scanning" || s.status === "connecting"
                    ? "Pairing…"
                    : "Pair stethoscope"}
                </Chip>
              )}
            </div>
            {s.devices.length > 1 && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                {s.devices.map((d) => (
                  <Chip key={d.uuid} on={s.deviceId === d.uuid} onClick={() => s.connect(d.uuid)}>
                    {d.name || d.uuid} · {d.rssi}dBm
                  </Chip>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {["native", "webble", "simulator"].map((k) => (
                <Chip key={k} wide on={s.hostKind === k} onClick={() => s.setTransport(k)}>
                  {k === "native" ? "iOS" : k === "webble" ? "Bluetooth" : "Simulator"}
                </Chip>
              ))}
            </div>
            {!s.webBleSupported && s.hostKind === "webble" && (
              <div style={{ fontSize: 12.5, color: "#FFC46B" }}>
                This browser can’t use Bluetooth. Use Chrome or Edge, the iOS app, or the simulator.
              </div>
            )}
            {s.error && <div style={{ fontSize: 12.5, color: "#FF8C82" }}>{s.error}</div>}
            {s.diag && <div style={{ fontSize: 12, color: "#8DA2CF" }}>{s.diag}</div>}
          </div>

          <div style={{ ...glass, padding: 12, display: "grid", gap: 12 }}>
            <Slider
              label="Amplification"
              value={s.gain}
              min={1}
              max={120}
              step={0.5}
              suffix={`${gainPct}% · ${s.gain.toFixed(1)}×`}
              onChange={s.setGain}
            />
            {advanced && (
              <>
                <Slider
                  label="Heartbeat boost"
                  value={s.beatBoost}
                  min={1}
                  max={8}
                  step={0.5}
                  suffix={`${s.beatBoost.toFixed(1)}×`}
                  onChange={s.setBeatBoost}
                />
                <Slider
                  label="Low-frequency boost"
                  value={s.bass}
                  min={0}
                  max={24}
                  step={1}
                  suffix={`+${s.bass.toFixed(0)} dB`}
                  onChange={s.setBass}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Chip
                    on={s.pcmFormat.lowNibbleFirst}
                    onClick={() => s.setPcmFormat({ lowNibbleFirst: !s.pcmFormat.lowNibbleFirst })}
                  >
                    Decoding {s.pcmFormat.lowNibbleFirst ? "B" : "A"}
                  </Chip>
                  {["auto", "chest", "reference"].map((sensor) => (
                    <Chip
                      key={sensor}
                      on={(s.pcmFormat.sensorChannel ?? "auto") === sensor}
                      onClick={() => s.setPcmFormat({ sensorChannel: sensor })}
                    >
                      {sensor === "auto" ? "Auto" : sensor === "chest" ? "Sensor A" : "Sensor B"}
                    </Chip>
                  ))}
                  <Chip on={false} onClick={s.wakeDevice}>
                    Wake device
                  </Chip>
                </div>
              </>
            )}
            <Toggle on={s.denoise} onChange={s.setDenoise} label="Noise reduction" />
            <Toggle on={s.monitoring} onChange={s.setMonitoring} label="Speaker monitoring" />
            <Chip on={advanced} onClick={() => setAdvanced((v) => !v)} wide>
              {advanced ? "Hide advanced" : "Advanced audio"}
            </Chip>
          </div>

          <div style={{ ...glass, padding: 12, display: "grid", gap: 10 }}>
            <Chip
              wide
              on={s.recording}
              onClick={() =>
                s.recording ? s.stopRecording() : s.capturing ? s.startRecording() : undefined
              }
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: s.recording ? 2 : 5,
                  background: s.recording ? "#fff" : T.red,
                }}
              />
              {s.recording ? `Stop recording · ${fmt(s.elapsed)}` : "Record auscultation"}
            </Chip>
            <div style={{ fontSize: 11.5, color: "#8DA2CF" }}>
              Recordings stay on this device only. Nothing is uploaded to the chart.
            </div>
            {clips.map((c) => (
              <div
                key={c.url}
                style={{
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.09)",
                  borderRadius: 14,
                  padding: 10,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 640 }}>{c.label}</div>
                <div style={{ fontSize: 11.5, color: "#8DA2CF", marginTop: 2 }}>
                  {c.mode} · {c.seconds}s · {c.at}
                </div>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls src={c.url} style={{ width: "100%", marginTop: 8 }} />
                <a
                  href={c.url}
                  download={c.file}
                  style={{ fontSize: 12.5, color: "#8FB6FF", fontWeight: 620 }}
                >
                  Download WAV
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
