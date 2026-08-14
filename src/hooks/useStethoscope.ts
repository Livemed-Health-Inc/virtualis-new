/**
 * Compatibility hook. The implementation now lives in
 * `@virtualis/stethoscope-sdk` (vendored at `src/sdk/stethoscope/`) and the
 * session is owned by `<StethoscopeProvider>`, so every consumer shares one
 * BLE link, one audio graph and one `callStream`.
 */
export { useStethoscopeContext as useStethoscope } from "@/lib/stethoscope/provider";
export type { StethoscopeContextValue } from "@/lib/stethoscope/provider";
