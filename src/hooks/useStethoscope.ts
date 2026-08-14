import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ECHO_MODE_CODE,
  MINTTI_SAMPLE_RATE,
  DEFAULT_PCM_FORMAT,
  createMinttiTransport,
  type AudioChannel,
  type GattCharInfo,
  type MinttiDevice,
  type MinttiTransport,
  type PcmFormat,
  type TransportKind,
} from "@/lib/stethoscope/mintti";
import { hasNativeHost } from "@/lib/stethoscope/mintti";
import { hasWebBluetooth, getExtraServices, setExtraServices } from "@/lib/stethoscope/webble";
import { createPcmStreamNode, type PcmStreamNode } from "@/lib/stethoscope/pcm-stream";
import { encodeWav } from "@/lib/stethoscope/wav";
import { MODE_FILTERS, type AuscultationMode } from "@/lib/stethoscope/types";

export type LinkStatus = "idle" | "scanning" | "connecting" | "connected" | "error";

interface Graph {
  ctx: AudioContext;
  pcm: PcmStreamNode;
  hp: BiquadFilterNode;
  hp2: BiquadFilterNode;
  lp: BiquadFilterNode;
  lp2: BiquadFilterNode;
  lp3: BiquadFilterNode;
  heartPeak: BiquadFilterNode;
  hum50: BiquadFilterNode;
  hum60: BiquadFilterNode;
  shelf: BiquadFilterNode;
  comp: DynamicsCompressorNode;
  makeup: GainNode;
  gate: GainNode;
  gateAnalyser: AnalyserNode;
  lookahead: DelayNode;
  deMud: BiquadFilterNode;
  clarity: BiquadFilterNode;
  softClip: WaveShaperNode;
  detectAnalyser: AnalyserNode;
  gain: GainNode;
  monitor: GainNode;
  analyser: AnalyserNode;
  broadcast: MediaStreamAudioDestinationNode;
}

export function useStethoscope() {
  const transportRef = useRef<MinttiTransport | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const recordRef = useRef<Int16Array[] | null>(null);

  const [hostKind, setHostKind] = useState<TransportKind>("simulator");
  const [webBleSupported, setWebBleSupported] = useState(false);
  const [gattChars, setGattChars] = useState<GattCharInfo[]>([]);
  const [audioCharId, setAudioCharId] = useState<string | null>(null);
  const [pcmFormat, setPcmFormatState] = useState<PcmFormat>(DEFAULT_PCM_FORMAT);
  const [packetsSeen, setPacketsSeen] = useState(0);
  const [diag, setDiag] = useState<string | null>(null);
  const [vendorServices, setVendorServicesState] = useState<string[]>([]);
  const [bleAvailable, setBleAvailable] = useState(true);
  const [status, setStatus] = useState<LinkStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MinttiDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [battery, setBattery] = useState<number | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [pressWarning, setPressWarning] = useState(false);
  const [channel, setChannel] = useState<AudioChannel>("result");
  const [mode, setMode] = useState<AuscultationMode>("bell");
  const [gain, setGain] = useState(1);
  const [bass, setBass] = useState(1);
  const [denoise, setDenoise] = useState(true);
  const [beatBoost, setBeatBoost] = useState(1);
  const [liveBpm, setLiveBpm] = useState<number | null>(null);
  const [beatTick, setBeatTick] = useState(0);
  const [monitoring, setMonitoring] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [callStream, setCallStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [lastClip, setLastClip] = useState<{ url: string; seconds: number } | null>(null);

  const channelRef = useRef(channel);
  channelRef.current = channel;

  const kindRef = useRef<TransportKind | undefined>(undefined);

  useEffect(() => {
    setWebBleSupported(hasWebBluetooth());
    setVendorServicesState(getExtraServices());
    if (!kindRef.current) {
      const initial: TransportKind = hasNativeHost()
        ? "native"
        : hasWebBluetooth()
          ? "webble"
          : "simulator";
      kindRef.current = initial;
      setHostKind(initial);
    }
  }, []);

  const ensureGraph = useCallback(async () => {
    if (graphRef.current) return graphRef.current;
    const ctx = new AudioContext();
    await ctx.resume();
    const pcm = await createPcmStreamNode(ctx, MINTTI_SAMPLE_RATE);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = MODE_FILTERS[mode].low;
    hp.Q.value = 0.7;
    // A second highpass pole removes handling rumble and DC wander that swamp S1/S2.
    const hp2 = ctx.createBiquadFilter();
    hp2.type = "highpass";
    hp2.frequency.value = MODE_FILTERS[mode].low;
    hp2.Q.value = 0.7;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = MODE_FILTERS[mode].high;
    lp.Q.value = 0.9;
    const lp2 = ctx.createBiquadFilter();
    lp2.type = "lowpass";
    lp2.frequency.value = MODE_FILTERS[mode].high;
    lp2.Q.value = 0.9;
    // Third pole: voice and room noise above the band fall away much faster.
    const lp3 = ctx.createBiquadFilter();
    lp3.type = "lowpass";
    lp3.frequency.value = MODE_FILTERS[mode].high;
    lp3.Q.value = 0.6;
    const heartPeak = ctx.createBiquadFilter();
    heartPeak.type = "peaking";
    // A narrow, heavily boosted 55 Hz peak turned real chest audio into a boom.
    // A gentle lift around the S1/S2 body keeps the thumps distinct instead.
    heartPeak.frequency.value = 70;
    heartPeak.Q.value = 0.6;
    heartPeak.gain.value = mode === "bell" ? 8 : 0;
    // Mains hum sits right inside the heart band and is the usual "muddy buzz".
    const hum50 = ctx.createBiquadFilter();
    hum50.type = "notch";
    hum50.frequency.value = 50;
    hum50.Q.value = 12;
    const hum60 = ctx.createBiquadFilter();
    hum60.type = "notch";
    hum60.frequency.value = 60;
    hum60.Q.value = 12;
    const shelf = ctx.createBiquadFilter();
    shelf.type = "lowshelf";
    shelf.frequency.value = 150;
    shelf.gain.value = bass;
    // Cut the boomy band that smears S1 into S2 and hides the "lub-dub" gap.
    const deMud = ctx.createBiquadFilter();
    deMud.type = "peaking";
    deMud.frequency.value = 130;
    deMud.Q.value = 1.1;
    deMud.gain.value = -5;
    // Small lift on the S1/S2 attack so each thump has a defined edge.
    const clarity = ctx.createBiquadFilter();
    clarity.type = "peaking";
    clarity.frequency.value = 42;
    clarity.Q.value = 1.2;
    clarity.gain.value = 4;
    const comp = ctx.createDynamicsCompressor();
    // Use this only as a transparent output limiter. Heavy compression here
    // raises packet noise and flattens the rounded lub-dub transient.
    comp.threshold.value = -6;
    comp.knee.value = 2;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    const makeup = ctx.createGain();
    makeup.gain.value = 1;
    // Lookahead so the gate is already open when the transient arrives -
    // otherwise the gate shaves the attack and beats sound dull.
    const lookahead = ctx.createDelay(0.2);
    lookahead.delayTime.value = 0.06;
    // Keep the waveshaper linear. The previous tanh curve generated audible
    // harmonics that made clean low-frequency thumps sound fuzzy.
    const softClip = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = x;
    }
    softClip.curve = curve;
    softClip.oversample = "4x";
    // Envelope-driven gate: silence between beats so S1/S2 stand out.
    const gate = ctx.createGain();
    gate.gain.value = 1;
    const gateAnalyser = ctx.createAnalyser();
    gateAnalyser.fftSize = 1024;
    gateAnalyser.smoothingTimeConstant = 0;
    // Dedicated detection tap: narrow S1/S2 band (25-70 Hz), taken BEFORE the
    // compressor so voices, rubbing and hiss can't fake a beat and dynamics
    // stay intact for the tracker.
    const detHp = ctx.createBiquadFilter();
    detHp.type = "highpass";
    detHp.frequency.value = 25;
    detHp.Q.value = 0.7;
    const detLp = ctx.createBiquadFilter();
    detLp.type = "lowpass";
    detLp.frequency.value = 70;
    detLp.Q.value = 0.7;
    const detLp2 = ctx.createBiquadFilter();
    detLp2.type = "lowpass";
    detLp2.frequency.value = 70;
    detLp2.Q.value = 0.7;
    const detectAnalyser = ctx.createAnalyser();
    detectAnalyser.fftSize = 1024;
    detectAnalyser.smoothingTimeConstant = 0;
    const g = ctx.createGain();
    g.gain.value = gain;
    const monitor = ctx.createGain();
    monitor.gain.value = monitoring ? 1 : 0;
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.7;
    const broadcast = ctx.createMediaStreamDestination();

    pcm.node.connect(hp);
    hp.connect(hp2);
    hp2.connect(lp);
    lp.connect(lp2);
    lp2.connect(lp3);
    lp3.connect(hum50);
    hum50.connect(hum60);
    hum60.connect(heartPeak);
    heartPeak.connect(deMud);
    deMud.connect(clarity);
    clarity.connect(shelf);
    shelf.connect(makeup);
    makeup.connect(gateAnalyser);
    makeup.connect(lookahead);
    lookahead.connect(gate);
    hum60.connect(detHp);
    detHp.connect(detLp);
    detLp.connect(detLp2);
    detLp2.connect(detectAnalyser);
    gate.connect(comp);
    comp.connect(softClip);
    softClip.connect(g);
    g.connect(analyserNode);
    g.connect(broadcast);
    g.connect(monitor);
    monitor.connect(ctx.destination);

    const graph: Graph = {
      ctx,
      pcm,
      hp,
      hp2,
      lp,
      lp2,
      lp3,
      heartPeak,
      hum50,
      hum60,
      shelf,
      comp,
      makeup,
      gate,
      gateAnalyser,
      lookahead,
      deMud,
      clarity,
      softClip,
      detectAnalyser,
      gain: g,
      monitor,
      analyser: analyserNode,
      broadcast,
    };
    graphRef.current = graph;
    setAnalyser(analyserNode);
    setCallStream(broadcast.stream);
    return graph;
  }, [mode, gain, bass, monitoring]);

  const ensureTransport = useCallback(async () => {
    if (transportRef.current) return transportRef.current;
    const t = await createMinttiTransport(kindRef.current);
    setHostKind(t.kind);
    t.subscribe((e) => {
      switch (e.type) {
        case "bleState":
          setBleAvailable(e.available);
          break;
        case "scanResult":
          setDevices((prev) =>
            prev.some((d) => d.uuid === e.uuid)
              ? prev.map((d) => (d.uuid === e.uuid ? { ...d, rssi: e.rssi, name: e.name } : d))
              : [...prev, { uuid: e.uuid, name: e.name, rssi: e.rssi }],
          );
          break;
        case "connectState":
          setStatus(e.connected ? "connected" : "idle");
          if (!e.connected) {
            setCapturing(false);
            setHeartRate(null);
            setDeviceId(null);
          }
          break;
        case "audio":
          if (e.channel !== channelRef.current) return;
          graphRef.current?.pcm.push(e.pcm);
          recordRef.current?.push(new Int16Array(e.pcm));
          break;
        case "battery":
          setBattery(e.level);
          break;
        case "version":
          setVersion(e.version);
          break;
        case "heartRate":
          setHeartRate(e.bpm);
          break;
        case "echoMode":
          break;
        case "captureState":
          setCapturing(e.capturing);
          break;
        case "pressTooBig":
          setPressWarning(true);
          window.setTimeout(() => setPressWarning(false), 4000);
          break;
        case "gatt":
          setGattChars(e.chars);
          setAudioCharId(e.audioId);
          setPacketsSeen(e.chars.reduce((n, c) => n + c.packets, 0));
          break;
        case "diag":
          setDiag(e.message);
          break;
        case "transportError":
          setError(e.message);
          setStatus("error");
          break;
        default:
          break;
      }
    });
    transportRef.current = t;
    return t;
  }, []);

  const scan = useCallback(async () => {
    setError(null);
    setDevices([]);
    setStatus("scanning");
    (await ensureTransport()).send({ cmd: "startScan" });
    window.setTimeout(() => setStatus((s) => (s === "scanning" ? "idle" : s)), 8000);
  }, [ensureTransport]);

  const connect = useCallback(
    async (uuid: string) => {
      setError(null);
      setDeviceId(uuid);
      setStatus("connecting");
      const t = await ensureTransport();
      t.send({ cmd: "stopScan" });
      try {
        await ensureGraph();
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Audio engine failed to start.");
        return;
      }
      t.send({ cmd: "connect", uuid });
      t.send({ cmd: "readVersion" });
      t.send({ cmd: "readBattery" });
    },
    [ensureTransport, ensureGraph],
  );

  const disconnect = useCallback(() => {
    transportRef.current?.send({ cmd: "stopAudio" });
    transportRef.current?.send({ cmd: "disconnect" });
    graphRef.current?.pcm.flush();
    setCapturing(false);
    setStatus("idle");
  }, []);

  const startCapture = useCallback(async () => {
    await ensureGraph();
    await graphRef.current?.ctx.resume();
    graphRef.current?.pcm.flush();
    transportRef.current?.send({
      cmd: "setEchoMode",
      mode: ECHO_MODE_CODE[mode === "bell" ? "bell" : "diaphragm"],
    });
    transportRef.current?.send({ cmd: "startAudio" });
  }, [ensureGraph, mode]);

  const stopCapture = useCallback(() => {
    transportRef.current?.send({ cmd: "stopAudio" });
  }, []);

  const selectAudioChar = useCallback((id: string) => {
    transportRef.current?.send({ cmd: "selectAudioChar", id });
    setAudioCharId(id);
  }, []);

  /** Change how raw BLE bytes are interpreted as PCM (header skip, endianness, bit depth). */
  const setPcmFormat = useCallback((patch: Partial<PcmFormat>) => {
    setPcmFormatState((prev) => {
      const next = { ...prev, ...patch };
      transportRef.current?.send({ cmd: "setPcmFormat", format: next });
      graphRef.current?.pcm.flush();
      return next;
    });
  }, []);

  /** Re-send the start-streaming opcodes to the device's writable characteristics. */
  const wakeDevice = useCallback(() => {
    transportRef.current?.send({ cmd: "wake" });
  }, []);

  /** Whitelist an extra vendor GATT service so Web Bluetooth can expose it. */
  const addVendorService = useCallback((uuid: string) => {
    const clean = uuid.trim().toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(clean)) {
      setError("Enter a full 128-bit UUID, e.g. 0000fff0-0000-1000-8000-00805f9b34fb");
      return;
    }
    const next = [...new Set([...getExtraServices(), clean])];
    setExtraServices(next);
    setVendorServicesState(next);
    setError(null);
    setDiag("Vendor service saved — scan and reconnect to pick it up.");
  }, []);

  /** Swap between the iOS bridge, direct Web Bluetooth, and the demo simulator. */
  const setTransport = useCallback((kind: TransportKind) => {
    transportRef.current?.dispose();
    transportRef.current = null;
    kindRef.current = kind;
    setHostKind(kind);
    setDevices([]);
    setGattChars([]);
    setAudioCharId(null);
    setDeviceId(null);
    setCapturing(false);
    setStatus("idle");
    setError(null);
  }, []);

  const startRecording = useCallback(() => {
    recordRef.current = [];
    setLastClip(null);
    setRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    const chunks = recordRef.current ?? [];
    recordRef.current = null;
    setRecording(false);
    const total = chunks.reduce((n, c) => n + c.length, 0);
    if (!total) return;
    const merged = new Int16Array(total);
    let o = 0;
    for (const c of chunks) {
      merged.set(c, o);
      o += c.length;
    }
    const blob = encodeWav(merged, MINTTI_SAMPLE_RATE);
    setLastClip({ url: URL.createObjectURL(blob), seconds: total / MINTTI_SAMPLE_RATE });
  }, []);

  // Push UI controls into the live graph / device.
  useEffect(() => {
    const g = graphRef.current;
    if (g) {
      g.hp.frequency.value = MODE_FILTERS[mode].low;
      g.hp2.frequency.value = MODE_FILTERS[mode].low;
      g.lp.frequency.value = MODE_FILTERS[mode].high;
      g.lp2.frequency.value = MODE_FILTERS[mode].high;
      g.lp3.frequency.value = MODE_FILTERS[mode].high;
      g.heartPeak.gain.value = mode === "bell" ? 8 : 0;
    }
    transportRef.current?.send({
      cmd: "setEchoMode",
      mode: ECHO_MODE_CODE[mode === "bell" ? "bell" : "diaphragm"],
    });
  }, [mode]);

  useEffect(() => {
    if (graphRef.current) graphRef.current.gain.gain.value = gain;
  }, [gain]);

  useEffect(() => {
    if (graphRef.current) graphRef.current.shelf.gain.value = bass;
  }, [bass]);

  useEffect(() => {
    if (graphRef.current) graphRef.current.monitor.gain.value = monitoring ? 1 : 0;
  }, [monitoring]);

  // Live beat follower: track the quiet floor, duck between beats, lift each beat.
  useEffect(() => {
    if (!capturing) return;
    let raf = 0;
    // Envelope state
    let fast = 0; // fast envelope of the S1/S2 band
    let floor = 0.002; // quiet-noise baseline
    let peak = 0.01; // decaying peak of recent beats
    let armed = true;
    let lastBeat = 0;
    let lastCandidate = 0;
    const intervals: number[] = [];
    const det = new Float32Array(1024);

    const median = (xs: number[]) => {
      const s = [...xs].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)]!;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const g = graphRef.current;
      if (!g) return;

      g.detectAnalyser.getFloatTimeDomainData(det);
      let sum = 0;
      for (let i = 0; i < det.length; i++) sum += det[i]! * det[i]!;
      const rms = Math.sqrt(sum / det.length);

      // Fast envelope: quick attack, slow release so one frame of noise
      // cannot spike the detector.
      fast = rms > fast ? fast * 0.5 + rms * 0.5 : fast * 0.85 + rms * 0.15;
      // Noise floor only tracks quiet stretches.
      floor = fast < floor ? floor * 0.9 + fast * 0.1 : floor * 0.999 + fast * 0.001;
      // Peak decays slowly so the threshold rides with beat strength.
      peak = fast > peak ? fast : peak * 0.997 + fast * 0.003;

      const span = Math.max(peak - floor, 1e-6);
      const hi = floor + span * 0.45;
      const lo = floor + span * 0.2; // hysteresis: must fall back before re-arming

      const now = performance.now();
      const expected = intervals.length >= 3 ? median(intervals) : 0;
      // Refractory covers S2: at least 250 ms, or 45% of the expected cycle.
      const refractory = expected ? Math.max(250, expected * 0.45) : 300;

      if (fast < lo) armed = true;

      const strong = fast > hi && fast > floor * 2.5 && fast > 0.0012;
      if (armed && strong && now - lastBeat > refractory) {
        const delta = lastBeat ? now - lastBeat : 0;
        armed = false;
        if (delta > 300 && delta < 2000) {
          // Reject intervals that don't fit the established rhythm; a lone
          // outlier is noise, two in a row means the rhythm really changed.
          const fits = !expected || Math.abs(delta - expected) < expected * 0.35;
          if (fits || now - lastCandidate < 2500) {
            intervals.push(delta);
            if (intervals.length > 10) intervals.shift();
            if (intervals.length >= 3) setLiveBpm(Math.round(60000 / median(intervals)));
            lastBeat = now;
            setBeatTick((n) => n + 1);
          } else {
            lastCandidate = now;
          }
        } else {
          lastBeat = now;
          setBeatTick((n) => n + 1);
        }
      }

      // Gate opens around detected beats instead of on any loud noise. The
      // window covers the 60 ms lookahead plus the body of the thump.
      const beatWindow = now - lastBeat < 260;
      const open = beatWindow || fast > lo;
      // Keep dynamic lift modest; large instantaneous gain was clipping the
      // thumps. A slightly slower attack preserves their rounded acoustic body.
      const cleanBoost = Math.min(beatBoost, 2);
      const target = denoise ? (beatWindow ? cleanBoost : 0.16) : open ? cleanBoost : 1;
      g.gate.gain.setTargetAtTime(target, g.ctx.currentTime, open ? 0.018 : 0.14);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [capturing, denoise, beatBoost]);

  useEffect(() => {
    if (!capturing) setLiveBpm(null);
  }, [capturing]);

  useEffect(() => {
    if (!capturing) return;
    const started = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [capturing]);

  useEffect(
    () => () => {
      transportRef.current?.dispose();
      graphRef.current?.pcm.dispose();
      void graphRef.current?.ctx.close().catch(() => undefined);
      transportRef.current = null;
      graphRef.current = null;
    },
    [],
  );

  const connected = status === "connected";
  const band = useMemo(() => MODE_FILTERS[mode], [mode]);

  return {
    hostKind,
    setTransport,
    webBleSupported,
    gattChars,
    audioCharId,
    selectAudioChar,
    pcmFormat,
    setPcmFormat,
    packetsSeen,
    wakeDevice,
    diag,
    vendorServices,
    addVendorService,
    bleAvailable,
    status,
    connected,
    error,
    devices,
    deviceId,
    capturing,
    battery,
    version,
    heartRate,
    pressWarning,
    channel,
    setChannel,
    mode,
    setMode,
    band,
    gain,
    setGain,
    bass,
    setBass,
    denoise,
    setDenoise,
    beatBoost,
    setBeatBoost,
    liveBpm,
    beatTick,
    monitoring,
    setMonitoring,
    elapsed,
    analyser,
    callStream,
    recording,
    lastClip,
    scan,
    connect,
    disconnect,
    startCapture,
    stopCapture,
    startRecording,
    stopRecording,
  };
}
