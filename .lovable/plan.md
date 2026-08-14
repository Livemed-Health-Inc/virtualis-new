# Hospital Devices / Telehealth Cart Workflow + Auscultation Restyle

Frontend-only prototype. No schema, auth, RLS, credential, or production data changes. No publish.

## 1. What gets built

**A. Devices tab (fleet + work queue)**
A first-class Devices surface, grouped by the facilities in the signed-in user's credential scope (`scope` from the store), styled in the normal Virtualis theme: `#F4F5F7` canvas, white cards, `T.line` borders, navy rail, `T.blue` primary action, facility hue accents, existing radii (14/20) and status vocabulary.

Each facility group lists cart/station cards with:
- Cart name/ID, location (unit, room), cart state: `Available · Preparing · Requested · In session · Needs setup · Offline`
- Patient/room context and assigned bedside nurse (from prototype data)
- Request acuity glyph (existing 3/2/1 bars) + wait time
- Channel chips: Virtualis request, HelloCare video handoff, Mintti stethoscope (state + battery), bedside nurse
- Actions: `Preflight`, `Beam in`, `Message nurse`, and nurse-side `Prepare cart` / `Mark ready`

Filters: facility, state, "My requests only", search. Empty and loading states included.

**B. Preflight / connection health view**
A sheet listing the four channels with an explicit trust label per channel (see §4), a re-check action, and a plain-language reason line. Beam in is enabled only from an honest state and always announces which mode it opens in.

**C. Beam-in session workspace**
Opens the existing `Telehealth` overlay (video surface) with a session header carrying cart + patient + channel context, and a control to open the existing `Auscultation` overlay for the same patient. When no real HelloCare launch URL is configured, the workspace is explicitly badged **Preview session — not a live clinical call** and no network call is made. Ending the session returns the cart to `Available` and leaves the conversation intact.

**D. Nurse-side flow**
Same Devices surface, nurse actions variant: `Prepare cart` (Available → Preparing), `Request clinician` (choose acuity + on-call specialty → creates a pending request card + a message in the patient thread via existing send path), `Message nurse/care team`, `Mark ready`.

**E. Auscultation restyle**
`Auscultation.jsx` keeps every control and diagnostic (transport switch, decoding A/B, sensor channel, wake device, gain, beat boost, bass, denoise, monitoring, recording, diagnostics, error text) but moves from the all-dark dashboard to the standard light workspace: white cards, `T.line` borders, `T.ink`/`T.sub` type, blue primary actions, facility accents. Navy retained only for the waveform/spectrum surface and the compact session header, where dark aids signal legibility. Simulator data is labelled "Test only — simulated"; nothing is called live unless the transport is native or Web Bluetooth and connected.

## 2. Files

New:
- `src/components/virtualis/devices/Devices.jsx` — tab shell: scope grouping, filters, list/grid, empty states
- `src/components/virtualis/devices/CartCard.jsx` — cart/request card + actions
- `src/components/virtualis/devices/Preflight.jsx` — channel health sheet
- `src/components/virtualis/devices/SessionWorkspace.jsx` — beam-in wrapper around Telehealth + Auscultation
- `src/components/virtualis/devices/useDeviceFleet.js` — local prototype state model + transitions
- `src/components/virtualis/devices/fleet.data.js` — realistic prototype carts/stations per facility
- `src/lib/telehealth/hellocare.ts` — adapter contract only: reads `import.meta.env.VITE_HELLOCARE_LAUNCH_URL`, builds an opaque launch context `{ requestId, deviceId, nonce }`, returns `{ configured: false }` when unset. No PHI in params, no fetch when unconfigured.
- `src/lib/telehealth/status.ts` — shared status vocabulary + trust-label helper

Modified:
- `src/components/VirtualisApp.jsx` — Devices route/tab, rail item, mobile nav (§3), wire beam-in overlays
- `src/components/virtualis/Auscultation.jsx` — restyle only (§1E)
- `src/components/virtualis/theme.js` — add device/status tokens if needed (no palette change)

Untouched: store, Supabase files, Thread/Inbox message logic.

## 3. Responsive navigation decision

Desktop/tablet rail: add **Devices** between Team and ALIS. Schedule stays a rail item. No layout change otherwise.

Mobile bottom bar keeps the centre V and 4 slots:
`Inbox · Devices · [V] · ALIS · More`
**More** opens a compact sheet containing Team, Schedule and Account. Schedule access is preserved (More sheet + Account panel + desktop rail); Team stays reachable from More, New Message search, and the rail. Devices becomes directly reachable in one tap, which is the workflow requirement.

## 4. Trust / status semantics (exact)

| Label | Meaning | When shown |
| --- | --- | --- |
| **Live** | Real connected channel with active data | Mintti: native bridge or Web Bluetooth connected and streaming. HelloCare: only when `VITE_HELLOCARE_LAUNCH_URL` is configured and a launch succeeded |
| **Available** | Capability present, not connected | Web Bluetooth supported in this browser; cart marked Available by nurse |
| **Needs setup** | Capability missing or unconfigured | HelloCare with no launch URL → "Adapter configuration pending". Mintti in a browser without Web Bluetooth and no native host |
| **Test only** | Simulated data | Mintti simulator transport; preview beam-in session |

Rules enforced in code:
- Never render an unqualified "Connected" for HelloCare; unconfigured always reads "Adapter configuration pending".
- Simulator output is never labelled live and never described in clinical terms.
- Nurse-declared cart readiness is labelled "Marked ready by nurse", distinct from device-detected states.
- Each status renders icon + text + color (never color alone).

## 5. State model

`useDeviceFleet` (component-local, no persistence):
```
carts: { id, facilityId, name, unit, room, state, nurse, patientRef,
         mintti: { state, battery }, video: { state }, updatedAt }
requests: { id, cartId, facilityId, patientRef, acuity, specialty,
            requestedBy, requestedAt, state: pending|accepted|in_session|closed }
session: { requestId, cartId, mode: 'preview'|'live', channels } | null
```
Transitions: `prepare` → Preparing; `markReady` → Available; `requestClinician` → Requested + pending request; `beamIn` → In session + `accepted→in_session`; `endSession` → Available + `closed`. Mintti channel state is read from `useStethoscope` capability detection, not stored.

## 6. Accessibility

Every action is a real `<button>` with an explicit label; card headers are keyboard-activatable; focus-visible ring already defined in `theme.js`; status uses icon + text; the preflight sheet traps focus and closes on Escape; live region announces session mode on beam in.

## 7. Verification

- `tsgo --noEmit` + build
- focused React hooks lint on touched files
- Playwright: desktop 1280 and mobile 390 — Devices filters, prepare/request/beam-in/end transitions, preflight labels, preview badge, Mintti simulator waveform + recording, restyled auscultation controls
- Confirm zero console errors and no Supabase write beyond existing message send
