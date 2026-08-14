/* Shared, deliberately conservative status vocabulary for hospital devices.
   Only an actively streaming/launched channel may be called "Live". */

export type TrustLevel = "live" | "available" | "setup" | "test";

export const TRUST: Record<TrustLevel, { label: string; tone: string; soft: string; mark: string }> =
  {
    live: { label: "Live", tone: "#12B76A", soft: "#E7F8F0", mark: "●" },
    available: { label: "Available", tone: "#2E5CFF", soft: "#EFF4FF", mark: "◆" },
    setup: { label: "Needs setup", tone: "#F79009", soft: "#FEF3E2", mark: "▲" },
    test: { label: "Test only", tone: "#667085", soft: "#F1F2F4", mark: "◇" },
  };

export const CART_STATES = {
  available: { label: "Available", tone: "#12B76A" },
  preparing: { label: "Preparing", tone: "#F79009" },
  requested: { label: "Requested", tone: "#2E5CFF" },
  session: { label: "In session", tone: "#1B3FA0" },
  setup: { label: "Needs setup", tone: "#F79009" },
  offline: { label: "Offline", tone: "#98A2B3" },
} as const;

export type CartState = keyof typeof CART_STATES;

/** Mintti capability, never inferred as clinical readiness. */
export function minttiTrust(opts: {
  streaming: boolean;
  nativeHost: boolean;
  webBluetooth: boolean;
  simulator?: boolean;
}): { level: TrustLevel; reason: string } {
  if (opts.streaming) return { level: "live", reason: "Streaming from a connected Smartho" };
  if (opts.simulator) return { level: "test", reason: "Simulator transport — synthetic audio" };
  if (opts.nativeHost) return { level: "available", reason: "iOS bridge host detected" };
  if (opts.webBluetooth) return { level: "available", reason: "Web Bluetooth supported" };
  return { level: "setup", reason: "No native host and no Web Bluetooth in this browser" };
}
