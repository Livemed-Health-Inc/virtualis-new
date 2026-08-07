# Compact the chat header on mobile

## Problem
In mobile view the `Thread` header consumes too much vertical real estate. It currently stacks a top action row, a patient detail bar, and a "Also for this patient" horizontal strip, leaving the actual message scroll area cramped.

## Goal
Reclaim vertical space on mobile without changing the premium desktop/tablet layout. Keep every function (back, avatar, name/facility/context, Video, Voice, patient detail, related-thread shortcuts) — just make the header denser and more efficient on small screens.

## What we’ll change

### 1. Mobile-only compact header (`Thread.jsx`)
- Use a media query / `useMediaQuery` hook to apply a `compact` mode below ~640 px.
- Reduce top-row padding from `12px 14px 10px` to `8px 12px 6px`.
- Shrink the avatar from `38 px` to `32 px`.
- Drop the Video button label to icon-only on mobile (keep text on tablet/desktop).
- Drop the Voice button to a compact 34 px circle.
- Reduce the patient detail bar padding to `7px 11px` and font sizes by ~1 px; keep it single-line with truncation.
- Reduce the "Also for this patient" section: smaller chips (`padding: 5px 10px`, `fontSize: 11.5`), smaller acuity glyph, and tighten the label to `marginBottom: 4`.

### 2. Preserve desktop/tablet
- All existing sizing, labels, and spacing remain unchanged for viewports ≥ 640 px.
- The `isMobile` flag gates only the compact style overrides.

### 3. Optional: sticky header smartness
- Keep the header sticky so context stays visible, but ensure `minHeight: 0` on the parent flex container so the message list still fills remaining space correctly.

### 4. Verify responsive behaviour
- Check iPhone portrait (390 px), iPhone landscape (now treated as web per existing orientation logic), iPad, and desktop.
- Confirm the message scroll area is visibly taller in mobile portrait after compaction.

## Files to edit
- `src/components/virtualis/Thread.jsx` — add `useMediaQuery` import, compact style overrides, icon-only Video/Voice on mobile.
- `src/components/virtualis/theme.js` — no change unless a shared compact token is needed; prefer local overrides.

## Out of scope
- No changes to desktop or iPad layout.
- No changes to message bubbles, composer, or V-fab.
- No backend or auth changes.
