# Multi-specialty group consults, threaded by patient

## What we're building

A consult can now be sent to several specialties at once, and every conversation is organized around the patient — Epic Haiku style. One patient, one place, all the specialists in it.

## 1. Multi-specialty consult creation

In New Consult, the specialty picker becomes multi-select:

- Tap to add specialties; selected ones show as removable chips ("Cardiology, Nephrology, Pharmacy").
- One shared group thread is created for the patient with all selected specialties as members — not one thread per specialty.
- Thread title reads as the patient's group consult; the header shows the member specialties and an avatar stack.
- Acuity routing, telehealth toggle, and the routing animation stay exactly as they are; the routing screen just lists each specialty being paged.
- Add an optional MRN field so consults for the same patient reliably group together.

## 2. Patient-threaded conversations

**Inbox grouping toggle** — a segmented control at the top of the inbox: `Acuity` (today's behavior) / `Patient`.

- In Patient mode, rows collapse into one card per patient: name, room, facility, highest acuity glyph, count of active consults, unread badge, last activity.
- Tapping a patient card opens a patient timeline listing that patient's consults (group and 1:1), each with its specialty, acuity glyph and last message preview. Tapping one opens the thread as usual.

**In-thread patient link** — inside a thread, a compact "Also for this patient" strip under the header shows the patient's other consults; tapping jumps straight there.

Patients are matched by MRN when present, otherwise by patient name + facility.

## Technical notes

- No schema change needed: `threads.patient`, `mrn`, `is_team`, and `members` already exist. Group consults set `is_team = true` and `members` to the selected specialties; MRN is written on create.
- `src/lib/virtualis/store.jsx`: `createThread` accepts `mrn` and `members`; add a derived `patients` grouping (key = `mrn` || `patient|facility`) exposing consults, max acuity, unread total, last activity.
- `src/components/virtualis/screens.jsx`: `NewConsult` specialty state becomes an array with chip UI + MRN input; `RoutingScreen` lists each specialty.
- `src/components/virtualis/Inbox.jsx`: add the Acuity/Patient segmented toggle and the patient card + patient timeline rendering, reusing existing row primitives and `T` tokens.
- `src/components/virtualis/Thread.jsx`: member specialty stack in the header for group threads, plus the "Also for this patient" strip.
- `src/components/VirtualisApp.jsx`: `sendConsult` passes the specialty array and MRN; routes to the new group thread.

## Out of scope

No changes to auth, telehealth, ALIS, credentials, or the V menu.
