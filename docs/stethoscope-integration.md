# Stethoscope integration (Virtualis Nue)

The Mintti Smartho implementation is the vendored `@virtualis/stethoscope-sdk`
v1.0.0 at `src/sdk/stethoscope/` (headless entry `src/sdk/stethoscope/index.ts`,
React entry `.../react.ts`, SDK README `docs/stethoscope-sdk.md`). App code must
not fork it; app-specific glue lives in `src/lib/stethoscope/`.

## One session for the whole app

`<StethoscopeProvider>` (`src/lib/stethoscope/provider.tsx`) is mounted in
`src/routes/__root.tsx`, above both `/` and `/device`. It constructs exactly one
`StethoscopeClient`, so opening or closing the Auscultation overlay, switching
tabs or navigating between routes does **not** destroy the BLE link, the audio
graph, the beat tracker or `callStream`. The client is only created in the
browser and is destroyed on provider unmount.

Existing consumers keep importing `@/hooks/useStethoscope`; that file is now a
thin compatibility hook backed by the provider context.

## Web Bluetooth requirements

- Chrome/Edge/Chromium (Android and desktop). Safari/iOS have no Web Bluetooth.
- A secure context: HTTPS or `localhost`.
- Pairing must be triggered by a user gesture — the **Pair stethoscope** button.

## Remembered pairing (autoPair)

Once the user has granted a device, `client.autoPair()` silently re-attaches on
subsequent visits. The Auscultation surface calls it on mount; if there is no
remembered device the call is a no-op and the explicit Pair action remains the
path for first-time permission.

## Native bridge (iOS *and* Android)

When the page is embedded in a host app, the SDK uses the `native` transport:
- iOS: `WKWebView` + `window.webkit.messageHandlers.mintti`
- Android: WebView JS interface `window.MinttiHost`

Both directions are documented in `docs/mintti-ios-bridge.md` (command/event
protocol is identical for either host).

## Simulator

The `simulator` transport is **TEST ONLY**. It synthesises heart sounds so the
UI can be exercised on any desktop browser. It is labelled as such in the UI and
is explicitly excluded from the consult-audio seam — a simulated stream can
never be represented as clinical hardware.

## callStream / consult audio

`state.callStream` is the processed (filtered, gained, denoised) `MediaStream`.
`src/lib/stethoscope/consult-audio.ts` exposes the seam:

```ts
const src = getConsultAudioSource(state); // null unless real hardware is streaming
```

It returns a track only when the transport is not the simulator, the device is
connected **and** capturing, and `callStream` has a live audio track.

Twilio is **not** implemented in this project. The future handoff is:

```ts
const localTrack = new Twilio.LocalAudioTrack(src.track, { name: "stethoscope" });
await room.localParticipant.publishTrack(localTrack);
// on stop: room.localParticipant.unpublishTrack(localTrack)
```

## Privacy

Recordings are encoded to WAV in-browser and kept as blob URLs on the device.
Nothing is uploaded; no PHI leaves the client.

## Still to validate

The DSP defaults and frame layouts came from vendor traces. End-to-end
validation against the exact Mintti Smartho hardware paired with the target
Samsung tablet (Android WebView / Chrome) is still outstanding before any
clinical use.
