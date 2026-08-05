# Simplify the V action button, menu, and acuity clutter

## 1. One V button, in the right place

Today mobile has two round buttons: a blue "+" in the middle of the tab bar and a separate floating V above it.

- **Mobile:** the V becomes the center tab-bar button — the "+" is removed, the V sits in its place.
- **Tablet & desktop:** the V floats as a round button in the lower-right of the workspace (it does not sit in the rail).

## 2. Glassmorphic menu, 4 actions, minimal text

- No white card / bottom sheet. Tapping V reveals four frosted-glass circular icons that rise above the button, over a blurred dimmed backdrop.
- Each icon has a one- or two-word label underneath, no descriptions, no chevrons.
- The four actions:
  - New consult
  - Page on-call
  - Telehealth
  - ALIS AI
- Dropped from the menu: STAT page, My schedule, My credentials, Sign out (schedule and credentials already live in the tabs/profile; sign out stays on the profile screen).
- Closes on backdrop tap, Escape, or after choosing an action.

## 3. Remove the escalation workload

- Delete the inbox SLA countdown / "ESCALATED · BACKUP ON-CALL" pill.
- Remove the "acknowledge to stop escalation" and "Acknowledged — escalation cleared" banner in the thread view.
- Remove the "Escalate" quick reply chip.
- Acuity still routes the message; the doctor is no longer put on a visible clock.

## 4. Trim the acuity badges

- Inbox rows: keep only the colored bar glyph (3 red / 2 amber / 1 green). No "Critical"/"Routine" text label.
- Thread header: drop the text acuity badge, keep the bars.
- Inbox section band headers keep their single "Critical / Urgent / Routine" heading — that's the one place the word is useful.

## Technical notes

- `src/components/VirtualisApp.jsx`: merge `VFab` into `TabBar` center slot on mobile; render `VFab` floating only when `isTablet`; cut the action list to 4 and rebuild the open state as a glass icon cluster (`backdrop-blur`, translucent white, brand blue icons, existing `T` tokens).
- `src/components/virtualis/Inbox.jsx`: remove `EscalationPill` and its `useTicker` usage.
- `src/components/virtualis/Thread.jsx`: remove the escalation banner, the `AcuityBadge` in the header, and the Escalate chip.

## Out of scope

No backend, routing, or data-model changes.
