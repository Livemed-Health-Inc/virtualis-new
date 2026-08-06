# Sign-out cleanup + design/UX assessment

## The sign-out bug

Confirmed cause, two parts:

1. The credentials sheet (the panel listing your hospitals and privileges) is rendered outside the authenticated content block, so it stays on screen after you sign out from inside it — it floats over the login page.
2. Sign-out only clears profile, threads and messages. Credentials, care team and shifts stay in memory, so the facility scope (hospital chips) survives the session.

### Fix

- Reset all session-derived state on sign-out: credentials, care team, shifts, reads, messages, threads, profile.
- Close the credentials sheet and reset local view state (open thread, tab, facility filter, detail/video overlays) when the session goes away.
- Only render the credentials sheet, telehealth overlay and routing screen while signed in.

Result: signing out lands cleanly on the login hero with nothing left over.

## Where the app is, design and UX

Strong today
- Clear visual identity: one blue/red/amber system, consistent glass surfaces, the V mark used with restraint.
- Acuity glyphs (3/2/1 bars) read instantly and beat text badges — right call.
- Responsive shell is solid: rail on desktop, tab bar with centered V on mobile, fluid inbox width.
- Login hero is the most polished screen — animated clinical halo, minimal copy.

Weak spots worth addressing next
1. Empty and loading states: no skeletons while the inbox loads, and several panes fall to blank. Every pane should have a designed empty state.
2. Header density: the greeting block, date line, unread line and facility bar occupy a lot of vertical space above the first message on mobile. Could compress to one line plus the facility strip.
3. Hardcoded artifacts: the greeting date is a fixed string ("Tuesday, Aug 4") and telehealth vitals are static. These break the illusion of a live system in a demo.
4. Feedback consistency: some actions toast, some silently succeed. Standardize confirmation for send, create consult, escalate, end visit.
5. Accessibility: everything is inline-styled with custom colors and no semantic tokens, buttons use `all: unset` without focus rings, and there is no keyboard path through the V menu. This is the biggest gap relative to "Apple level".
6. Thread view: message bubbles and the composer are good, but the related-consults strip competes with the message stream for attention on narrow screens.

Suggested order: sign-out fix, then empty/loading states, then focus rings and keyboard support, then header compression.

## Technical notes

- `src/lib/virtualis/store.jsx` — extend `signOut` to clear `credentials`, `staff`, `shifts`, `reads`.
- `src/components/VirtualisApp.jsx` — gate the `creds`, `videoThread` and `routing` overlays behind `authed`; add an effect that resets local view state when `session` becomes null.
