# Reduce mobile chat header height further

## Current state
- `Thread.jsx` already has a `compactHeader` branch for mobile / short viewports.
- The compact row uses `padding: 4px 8px`, a 28 px back button, 28 px video button, and two lines of text (name + patient/room subtitle), so the collapsed header is roughly 38-42 px tall plus the 1 px border.
- When related consults are present, the expanded chip strip adds another 30-34 px.

## Goal
Make the mobile chat header take closer to 20% of the viewport instead of the current ~30-35%, so at least 8 message cards are visible on a typical 640×800 phone viewport without shrinking the message bubbles themselves.

## What we’ll change

### 1. Collapse to one line of text on mobile
- Remove the subtitle line in `compactHeader` mode; show only the thread name with the acuity glyph.
- Move patient / room / context into a tooltip or the detail sheet (already opened by tapping the header).
- This drops the header content from two text lines to one.

### 2. Shrink the row chrome
- Reduce compact header padding to `3px 8px`.
- Shrink back and video buttons from 28 px to 24 px on mobile.
- Shrink the related-consults chip from 26 px to 22 px.
- Keep touch targets at least 44 px by using transparent hit slop if the visible button is smaller.

### 3. Make related consults a single inline chip
- Instead of expanding into a full horizontal strip, show one compact chip: `+N consults`.
- Tapping it opens the detail sheet / a small bottom popover, not an inline strip that grows the header.

### 4. Preserve desktop/tablet
- Leave the full two-line desktop header unchanged.
- The `compactHeader` flag gates only the extra-aggressive mobile overrides.

### 5. Verify
- Use the browser preview at iPhone portrait (390×844) and a short viewport (375×667) to confirm the header is roughly 20% or less of the visible area.
- Count visible message cards in the scroll area and confirm 8+ are shown for a thread with at least that many messages.

## Files to edit
- `src/components/virtualis/Thread.jsx` — tighten the compact header row, remove the subtitle line, convert related-thread expansion to a single chip.

## Out of scope
- No changes to message bubble sizing or composer height.
- No backend or auth changes.
- No changes to desktop/iPad layout.
