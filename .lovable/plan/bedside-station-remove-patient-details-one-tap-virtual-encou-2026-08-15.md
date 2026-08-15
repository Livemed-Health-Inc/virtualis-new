# Bedside Station: remove patient details, one-tap virtual encounter

The kiosk currently asks for room, patient/MRN, reason and acuity before a clinician can be reached. On a shared bedside tablet that is friction and an unnecessary PHI surface — the cart already knows its hospital, unit and room. The station becomes a single-purpose launcher: pick who you need, start the encounter.

## New flow

```text
[ Cart identity — hospital · unit · room ]
[ Urgency: 3-bar / 2-bar / 1-bar  (defaults to Urgent) ]
[ On call now — searchable specialty grid ]
[ Start virtual encounter ]   [ Send consult request ]
```

- The whole "Patient context" card is removed: no patient name, no MRN, no reason, no manual room entry.
- Room, unit and hospital come from the enrolled cart (demo mode uses the sample cart).
- Urgency stays, but as a compact inline bar above the specialty grid — it is what drives acuity routing and is not patient data.
- Specialty selection is unchanged: on-call cover by specialty only, never by name.
- Primary action becomes **Start virtual encounter**; the secondary action remains a non-urgent consult request.

## Confirmation screen

Simplified to what the receiving clinician actually gets: specialty, cart + room, urgency, and the existing video-trust line ("Handoff opened — connection not yet confirmed" semantics preserved). No patient identifiers echoed back.

## UX polish in the same pass

- Cart identity moves into a compact sticky header so the specialty grid gets the vertical space on a tablet.
- Larger touch targets and a clearer selected state for specialty tiles (kiosk is used standing, often gloved).
- Actions pinned to a bottom action bar so "Start virtual encounter" is always reachable without scrolling.
- Nothing changes about enrollment, demo mode, or the trust/status vocabulary.

## Technical notes

Single file: `src/components/virtualis/devices/DeviceStation.jsx`. Drop the `room`, `patient`, `reason` state and their card; keep `acuity`, `spec`, `q`, `sent`. `sent` payload narrows to `{ spec, acuity, call }` with room read from `cart.room`. No backend, Supabase, or route changes; still prototype-only state with nothing persisted or transmitted.
