/**
 * App-scoped stethoscope integration layer.
 *
 * Owns exactly ONE `StethoscopeClient` for the whole app and is mounted above
 * both `/` and `/device` in `src/routes/__root.tsx`. Because the client lives
 * in the provider (not in the Auscultation overlay), opening or closing the
 * overlay never tears down the BLE session, the audio graph or `callStream`.
 */
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  StethoscopeClient,
  DEFAULT_SETTINGS,
  DEFAULT_PCM_FORMAT,
  MODE_FILTERS,
  hasNativeHost,
  hasWebBluetooth,
  type AudioChannel,
  type AuscultationMode,
  type PcmFormat,
  type StethoscopeSettings,
  type StethoscopeState,
  type TransportKind,
} from "@/sdk/stethoscope";

/** Stable snapshot used during SSR, before any client exists. */
const SSR_STATE: StethoscopeState = {
  ...DEFAULT_SETTINGS,
  hostKind: "simulator",
  webBleSupported: false,
  bleAvailable: false,
  status: "idle",
  connected: false,
  error: null,
  diag: null,
  devices: [],
  deviceId: null,
  capturing: false,
  battery: null,
  version: null,
  heartRate: null,
  liveBpm: null,
  beatTick: 0,
  pressWarning: false,
  elapsed: 0,
  band: MODE_FILTERS[DEFAULT_SETTINGS.mode],
  analyser: null,
  callStream: null,
  recording: false,
  lastClip: null,
  gattChars: [],
  audioCharId: null,
  pcmFormat: DEFAULT_PCM_FORMAT,
  packetsSeen: 0,
  vendorServices: [],
};

const noop = () => {};
const noopSubscribe = () => noop;

export interface StethoscopeContextValue extends StethoscopeState {
  client: StethoscopeClient | null;
  scan: () => void;
  autoPair: () => void;
  connect: (uuid: string) => void;
  disconnect: () => void;
  startCapture: () => void;
  stopCapture: () => void;
  startRecording: () => void;
  stopRecording: () => { url: string; seconds: number } | null;
  selectAudioChar: (id: string) => void;
  setPcmFormat: (patch: Partial<PcmFormat>) => void;
  wakeDevice: () => void;
  addVendorService: (uuid: string) => void;
  setTransport: (kind: TransportKind) => void;
  update: (patch: Partial<StethoscopeSettings>) => void;
  setMode: (m: AuscultationMode) => void;
  setChannel: (c: AudioChannel) => void;
  setGain: (v: number) => void;
  setBass: (v: number) => void;
  setDenoise: (v: boolean) => void;
  setBeatBoost: (v: number) => void;
  setMonitoring: (v: boolean) => void;
}

const Ctx = createContext<StethoscopeContextValue | null>(null);

export function StethoscopeProvider({ children }: { children: ReactNode }) {
  // Browser-only: the SDK touches navigator / AudioContext.
  const [client] = useState<StethoscopeClient | null>(() =>
    typeof window === "undefined"
      ? null
      : new StethoscopeClient({
          transport: hasNativeHost() ? "native" : hasWebBluetooth() ? "webble" : "simulator",
        }),
  );

  useEffect(() => () => client?.destroy(), [client]);

  const state = useSyncExternalStore(
    client ? client.subscribe : noopSubscribe,
    client ? client.getState : () => SSR_STATE,
    () => SSR_STATE,
  );

  const set = useCallback(
    <K extends keyof StethoscopeSettings>(key: K) =>
      (value: StethoscopeSettings[K]) =>
        client?.update({ [key]: value } as Partial<StethoscopeSettings>),
    [client],
  );

  const actions = useMemo(
    () => ({
      client,
      scan: () => void client?.scan(),
      autoPair: () => void client?.autoPair(),
      connect: (uuid: string) => void client?.connect(uuid),
      disconnect: () => client?.disconnect(),
      startCapture: () => void client?.startCapture(),
      stopCapture: () => client?.stopCapture(),
      startRecording: () => client?.startRecording(),
      stopRecording: () => client?.stopRecording() ?? null,
      selectAudioChar: (id: string) => client?.selectAudioChar(id),
      setPcmFormat: (patch: Partial<PcmFormat>) => client?.setPcmFormat(patch),
      wakeDevice: () => client?.wakeDevice(),
      addVendorService: (uuid: string) => client?.addVendorService(uuid),
      setTransport: (kind: TransportKind) => client?.setTransport(kind),
      update: (patch: Partial<StethoscopeSettings>) => client?.update(patch),
      setMode: set("mode") as (m: AuscultationMode) => void,
      setChannel: set("channel") as (c: AudioChannel) => void,
      setGain: set("gain") as (v: number) => void,
      setBass: set("bass") as (v: number) => void,
      setDenoise: set("denoise") as (v: boolean) => void,
      setBeatBoost: set("beatBoost") as (v: number) => void,
      setMonitoring: set("monitoring") as (v: boolean) => void,
    }),
    [client, set],
  );

  const value = useMemo<StethoscopeContextValue>(
    () => ({ ...state, ...actions }),
    [state, actions],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Access the single app-wide stethoscope session. */
export function useStethoscopeContext(): StethoscopeContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStethoscope must be used inside <StethoscopeProvider>");
  return ctx;
}
