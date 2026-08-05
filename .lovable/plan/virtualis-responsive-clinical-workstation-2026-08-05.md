# Virtualis® — Responsive Clinical Workstation

Turn the current 430px-wide prototype into a device-adaptive product: same app, three layouts. Keep the visual language you like (soft light surfaces, blue gradients, acuity glyphs) and push it toward Apple-grade elegance — more air, quieter chrome, real motion, one accent.

## 1. Responsive shell

One app, three renderings driven by width:

- **Phone (<768px)** — current stacked flow: inbox → thread → detail, bottom tab bar, floating V action button. Fixes: `100dvh` instead of `100vh` (no clipped bottom bar on iOS), safe-area padding, fluid width instead of the hard 430px cap.
- **Tablet (768–1179px)** — two panes: inbox list (fixed 360px) + thread. Tabs move to a left icon rail.
- **Desktop (≥1180px)** — three panes: rail + inbox + thread, with the consult/patient detail as a right inspector that slides in. Nothing is a modal that should be a pane.

```text
Desktop            Tablet             Phone
┌──┬──────┬──────┐ ┌──┬────────────┐ ┌────────────┐
│ V│Inbox │Thread│ │ V│ Inbox      │ │  Inbox     │
│ra│list  │ +    │ │ra│  /Thread   │ │  (push     │
│il│      │inspec│ │il│            │ │   nav)     │
└──┴──────┴──────┘ └──┴────────────┘ └─[tab bar]──┘
```

## 2. Multi-hospital / credentialing model

This is the core differentiator, so it becomes visible product structure:

- A **facility switcher** in the top rail: "All facilities" or a single hospital, with per-facility unread + acuity counts.
- Every thread carries a facility (Saint Anthony, Edgerton, Mercy West, Northline) shown as a small tinted chip; each facility gets its own accent hue so a doc covering four hospitals can scan by color.
- **Visibility rules enforced in the data layer:** onsite providers see only their home facility (switcher locked, no "All"); virtual providers see the union of facilities they're credentialed at. Provider type + credentials live on the signed-in user profile; the inbox filters through a single `visibleThreads` selector so no view can leak another hospital's messages.
- A **credentials sheet** on the profile listing facility, role, privileges, expiry — with an "expires in N days" warning.
- Threads show the EMR they arrived from (Epic / Cerner / Meditech) as a source tag, since routing is EMR-integrated.

## 3. Acuity system (refined, not replaced)

Keep 3 red / 2 amber / 1 green bars. Improvements:

- Bars animate in on arrival and pulse only while a critical item is unacknowledged.
- **Escalation timers** — a critical message unacknowledged past its SLA (e.g. 5 min) shows a countdown ring on the glyph and auto-escalates to the backup on-call, with an inline "Escalated to Dr. X" system event in the thread.
- Inbox groups by acuity band with sticky headers instead of one flat list; filter chips get counts.
- A colorblind-safe cue: the bar count itself plus a short text label, never color alone.

## 4. Telehealth (full mock visit)

Launchable from any thread or the schedule:

- Pre-visit **waiting room** — patient name/MRN/facility, consent line, device check (camera/mic meters).
- **In-call**: remote video stage, draggable self-view, mute / camera / share / invite-interpreter / end controls, live vitals strip (HR, SpO₂, BP) streaming from the mock feed, and the patient's acuity glyph pinned in the corner.
- Invite a second clinician into the call from the directory (multi-party tiles).
- **Post-visit**: auto-drafted encounter note from the call (ALIS-generated), editable, "Sign & send to EMR" → posts a system message back into the thread.

## 5. Functionality review + fixes

Issues in the current build to correct:

- New-thread IDs use `Math.max(...)` on a possibly empty list → guard.
- `setTimeout` chains for routing/toasts aren't cleaned up on unmount → leaks and stray state.
- Acked/unread state is derived in two places → single source of truth.
- No empty states (empty inbox, no shifts, no search results) and no keyboard support.

Added behavior: message search across threads, read receipts + typing indicator, quick-reply chips, attachment/photo stub, ALIS thread summarization ("catch me up"), on-call schedule wired to routing so a consult goes to whoever is actually on shift for that facility.

## 6. Branding

- Upload the Virtualis logo to CDN assets; use the full lockup on login, splash and desktop rail header.
- Redraw the **V glyph** as an SVG matching the logo's swoosh + pixel-dot motif for tabs, favicon, avatars, in-call watermark, and dark surfaces where the PNG would look soft.
- `Virtualis®` typeset with the registered mark wherever the wordmark appears; footer line: "Patented clinical communication · intelligent medicine".
- Motion register: springy, restrained — 200–260ms eases, pane slides, glyph pulses. No bouncy or decorative animation.

## Technical notes

- Split the 881-line `VirtualisApp.jsx` into `src/components/virtualis/` modules (shell, inbox, thread, consult, telehealth, schedule, directory, primitives) — smaller files, no duplicated style objects.
- Replace the inline `T` palette with CSS custom properties in `src/styles.css` (`@theme` tokens: acuity, facility hues, surfaces) so light/dark and facility accents theme cleanly; components use Tailwind classes instead of inline style objects.
- Breakpoints via CSS/Tailwind, not JS width state, except a single `useMediaQuery` for pane-vs-push navigation.
- All data stays local mock state — no backend in this pass. If you later want real EMR feeds, auth, and per-user credentialing persisted, that's a Cloud step we can plan separately.
- Route metadata updated for the new sections.
