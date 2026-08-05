# Clean up the V quick-action menu

## Problem
The four actions fan out on an arc around the V button. At small widths the circles and their labels collide with each other, the tab bar, and the screen edge, and the frosted-white treatment reads as generic rather than Virtualis.

## New design
Replace the arc with a **vertical stack of pill rows** rising straight above the V button — predictable geometry, zero overlap on any viewport.

- Each row: a compact rounded pill with the icon in a small blue-tinted circle on the left and the label beside it, right-aligned to the V.
- Treatment uses app tokens: white/near-white surface, `T.line` hairline border, `T.blue` icon, `T.ink` label, soft `rgba(16,24,40,.08)` shadow — matching the cards and chips used throughout the app.
- Rows animate in with a staggered rise (existing `rise` keyframe) closest-to-V first; reversed on close.
- Backdrop stays: dimmed blur, tap or Escape closes.
- Fixed row height (44px) and 10px gaps guarantee touch targets and spacing.
- On mobile the stack anchors above the tab-bar V and is centered; on tablet/desktop it anchors bottom-right above the floating V and right-aligns. Both are clamped to stay inside the viewport and safe-area inset.

Actions stay the same four: Consult, Page, Video, ALIS. Nothing else in the app changes.

## Technical notes
- `src/components/VirtualisApp.jsx` — in `VFab`, drop the angle/radius math and the `--fx/--fy` `fanOut` animation in favor of an absolutely positioned flex column; restyle the action buttons with theme tokens.
- `src/components/virtualis/theme.js` — remove the now-unused `fanOut` keyframe.
