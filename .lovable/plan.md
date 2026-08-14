# Auscultation: port the Stethoscope UI app into Virtualis

Bring the working Mintti Smartho digital stethoscope experience from the "Stethoscope UI" project into Virtualis as a first-class, authenticated clinical screen — without touching auth, invite-only access, messaging, telehealth, ALIS, schedules, database schema, or branding.

## Product behavior

- A new **Auscultation** action joins the V quick-action menu (Consult, Message, Video, ALIS, Auscultation). The fan geometry expands from 4 to 5 discs on both the mobile centered layout and the desktop bottom-right layout.
- Tapping it opens a **full-screen overlay** rendered at the same layer as Telehealth, with a clear Back/Close control and Escape-to-close.
- **Patient context:** it defaults to the currently open thread; if none is open it falls back to the first visible credentialed thread; if the clinician has several, a compact picker (patient, facility, room) appears before the session starts. No patient context is never a hard block — the exam can run unlabeled.
- When context exists, the header shows **patient name, facility chip, room, MRN**, reusing the existing `FacilityChip` and header patterns from Thread/Telehealth.
- **Recordings stay in the browser** for this pass: in-memory/blob list with playback, download as WAV, and a patient-context label on each item. Nothing is uploaded, no schema change, no new tables or policies.

## Functionality preserved from the source

Every device and audio capability is ported unchanged in behavior: native iOS WKWebView bridge, Web Bluetooth, simulator fallback for ordinary browsers, 8 kHz PCM decode (IMA-ADPCM), heart / lung / wide auscultation modes, live waveform, spectrum, BPM detection, amplification and filter controls, monitoring, recording, WAV encode + playback + download, battery and device state, reconnect and error states.

## Files

Added (ported, mostly as-is):
- `src/lib/stethoscope/types.ts`, `mintti.ts`, `webble.ts`, `pcm-stream.ts`, `ima-adpcm.ts`, `wav.ts`
- `src/hooks/useStethoscope.ts`
- `src/components/stethoscope/Waveform.tsx`, `Spectrum.tsx`
- `docs/mintti-ios-bridge.md`

Added (new Virtualis surface):
- `src/components/virtualis/Auscultation.jsx` — the overlay screen: header with patient context, connection/device state, mode switch, waveform + spectrum, BPM, gain/filter controls, monitor/record transport, local recording list. This is the Virtualis-styled rewrite of the source `src/routes/index.tsx` UI; the hook and lib layer do the work.

Changed:
- `src/components/VirtualisApp.jsx` — add the fifth `VFab` action and its icon, widen the fan angle arrays, add `scopeId` state plus overlay render next to `<Telehealth>`, and clear it in the sign-out teardown alongside the other overlays.

Nothing else changes. No routes, no `src/routes/api`, no server functions, no migrations, no secrets, no publish.

## Technical notes

- **Source retrieval:** the source project is checked out read-only into a scratch path so the ported files are the real implementation, not a reconstruction. Only the listed files come across; its routing, theme, and shadcn shell do not.
- **Boundary safety:** everything is browser-only. Web Bluetooth, `AudioContext`, `webkit.messageHandlers`, and canvas access happen inside `useEffect`/event handlers, never at module scope or during render, so SSR and the Cloudflare worker build stay clean. Capability detection picks the transport at runtime: iOS bridge → Web Bluetooth → simulator.
- **Styling:** inline styles with `T` tokens from `src/components/virtualis/theme.js`, matching Telehealth's dark clinical stage. Canvases size to their container via `ResizeObserver`; controls wrap and become scroll-snap chips on narrow widths; the overlay respects `env(safe-area-inset-bottom)`.
- **Responsive:** single-column stacked stage on mobile, waveform + controls side-by-side from tablet up, same `isDesktop`/landscape media logic already used in the shell.
- **Cleanup:** the hook tears down the audio graph, stops streams, and disconnects the device on unmount and on Close, so leaving the overlay never leaves a live microphone/BLE session — same discipline as Telehealth's `onEnd`.

## Verification

Preview at mobile, tablet, and desktop widths (plus landscape phone): open the V menu, launch Auscultation with and without an open consult, confirm the simulator produces a live waveform and BPM in an ordinary browser, record → play → download a WAV, close and reconfirm no stray audio. Web Bluetooth and the iOS bridge are checked by capability-detection paths and a documented manual test in `docs/mintti-ios-bridge.md`; they cannot be exercised in the sandbox.
