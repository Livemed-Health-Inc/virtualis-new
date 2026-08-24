# App audit + App Store screenshot brief (5 frames)

## Part 1 — Audit pass

A read-only review of the shipped surfaces, reported back in chat (no code changes unless you approve fixes after):

- **Navigation & shells**: phone / tablet / desktop layouts of Inbox, Thread, Team, ALIS AI, Schedule, Devices, Account, plus the `/device` kiosk.
- **Functionality**: acuity routing and reset-on-login, patient-threaded group consults, new message / direct / group creation, on-call presence + incoming handoff requests, telehealth launch, auscultation station, admin console (hospitals, invites, device enrollment).
- **Security posture**: invite-only auth intact, hospital isolation on threads and encounter requests, kiosk token scoping, no PHI in public endpoints.
- **Quality**: build/typecheck/lint/tests status, console and runtime errors in the live preview, empty states, keyboard/contrast issues, SEO/head metadata per route.

Deliverable: a prioritized list (blocker / should-fix / polish), no edits in this pass.

## Part 2 — Screenshot brief

Five App Store frames, captured at iPhone 6.9" (1320x2868) and iPad 13" (2064x2752). Each frame: real app screenshot in a device bezel on a Virtualis deep-blue gradient, caption above the device in the brand sans, one short headline + one supporting line. No stock photos, no fake logos, no real patient data — demo names only.

| # | Screen captured | Headline | Support line |
|---|---|---|---|
| 1 | Inbox, acuity view, unread 3-bar critical at top, hospital chips visible | Messaging that triages itself | Every consult ranked by acuity before you open it |
| 2 | Patient-threaded group consult (multi-specialty thread) | One patient. One thread. | Cardiology, neuro and nursing in the same conversation |
| 3 | Telehealth live call with vitals strip and ALIS scribe bar | Telehealth built in | Launch a video encounter from any thread |
| 4 | ALIS AI assistant answering a clinical question | ALIS AI at the bedside | Summaries, triage and draft notes in seconds |
| 5 | `/device` bedside kiosk showing specialty grid + on-call provider card | Bedside to specialist in one tap | Shared carts reach the right on-call clinician instantly |

Notes per frame: acuity bars must read 3-red / 2-amber / 1-green; the V mark appears in-app only, not pasted onto the artwork; captions stay under 45 characters so they hold at thumbnail size; frame 1 is the thumbnail hero, so it must be legible when scaled to ~150px wide.

## Technical notes

Capture via Playwright against the running preview at the exact store viewports, seeded with the demo account so the inbox shows fresh unread acuity. Composited frames written to `/mnt/documents/appstore/`. No app code changes are part of this deliverable.
