# Tighten the mobile bottom bar

## What's there now

The mobile footer is the tab bar in `VirtualisApp.jsx`. Reading the current code, its height comes from several stacked contributions:

- Each tab button: `padding: 9px 0 7px`, a 22 px icon, a 3 px gap, and a 10 px label.
- The bar itself: `align-items: flex-end` plus `padding-bottom: max(6px, env(safe-area-inset-bottom))`.
- The placeholder slot reserved for the floating V uses `margin: 0 8px 12px`, and because the row is bottom-aligned that 12 px bottom margin sits under the whole row as dead space.
- The inbox list above it adds another 20 px of bottom padding before the bar.

Together that reads as an empty band above and below the icons on a phone.

## What we'll change

1. Remove the extra gap under the V placeholder so the row no longer carries a 12 px bottom margin; center the row instead of bottom-aligning it and give the placeholder only the width it needs.
2. Trim tab button padding from `9px 0 7px` to about `5px 0 4px` and the icon/label gap from 3 px to 2 px.
3. Reduce tab icons from 22 px to 20 px and keep the 10 px label (still legible, smaller footprint).
4. Keep the safe-area inset but drop the minimum from 6 px to 2 px, so devices without a home indicator lose the padding while notched phones keep it.
5. Reduce the inbox scroll list's bottom padding from 20 px to 10 px on mobile so content ends closer to the bar.
6. Ensure the tap target stays comfortable by keeping each button at least 44 px tall via a min-height rather than padding.

Net effect: roughly 20-25 px reclaimed at the bottom on a phone, with no change to desktop/tablet, which uses the side rail rather than the tab bar.

## Verification

Check the mobile preview at 390x844 and confirm the bar hugs the screen edge, no blank strip remains between the last message/list item and the icons, and the floating V still lines up in its slot.

## Files to edit

- `src/components/VirtualisApp.jsx` — `TabBar` spacing, placeholder slot, icon size.
- `src/components/virtualis/Inbox.jsx` — list bottom padding under compact mode.

## Out of scope

- No changes to the desktop rail or tablet layout.
- No changes to the header, message bubbles, or composer.
