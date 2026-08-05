# Expand & simplify the Virtualis® quick-action V menu

## Goal
The floating "V" button at the bottom of the mobile view currently opens a small multi-colored bubble menu with four actions. We will expand the available options while making the whole menu feel simpler, cleaner, and strictly on-brand using the existing Virtualis color palette.

## What will change

### 1. More quick actions
Add useful, clinically relevant shortcuts to the V menu so it becomes a true command center:
- **New consult** — start a structured consult request
- **STAT page on-call** — urgent page to the active on-call specialist
- **Page on-call** — routine callback request
- **Ask ALIS AI™** — open the clinical assistant
- **Start telehealth** — jump into a video visit flow
- **My schedule** — open the on-call / shift view
- **My credentials** — open facility credentialing sheet
- **Sign out** — end the session

### 2. Simplistic, unified visual design
- Replace the multi-colored gradient action circles with a single treatment: soft white cards with the Virtualis blue icon and blue accent hover state.
- Remove heavy shadows and colored glows; use only the app’s existing `T.line`, `T.blue`, `T.blueDeep`, and `T.ink` tokens.
- Present actions as a clean vertical list inside a rounded bottom sheet / popover instead of staggered floating bubbles.
- Keep the V trigger button exactly as-is (it already matches the brand blue gradient).

### 3. Responsive & accessible polish
- Add a subtle backdrop blur overlay when the menu is open.
- Close the menu on backdrop tap or Escape key.
- Ensure touch targets are at least 44 px.
- Add `aria-expanded` and clear labels for screen readers.
- Prevent the menu from being clipped by the safe-area inset on mobile.

### 4. Files to update
- `src/components/VirtualisApp.jsx` — refactor the `VFab` component and expand its action list.
- `src/components/virtualis/ui.jsx` — add a small reusable `QuickActionItem` primitive if useful.

## Out of scope
- No backend or data model changes.
- No changes to tab navigation, rail, or inbox logic.
- No new routes or screens; telehealth/credentials/schedule still open their existing components.

## Verification
- Preview on mobile viewport to confirm the expanded menu opens/closes smoothly and all taps route correctly.
- Preview on desktop to confirm the V button only appears in the mobile shell (the rail handles desktop navigation).
