# V menu: clear fan, no blur

## What changes

The V quick-action menu opens without touching the screen behind it, and the four actions fan out from the button.

- **No scrim.** The dimmed, blurred navy overlay behind the menu is removed. The workstation stays fully sharp and readable while the menu is open. An invisible tap-catcher still closes the menu on outside tap (plus Escape, unchanged).
- **Fan geometry.** The four actions leave the vertical stack and arc out from the V along a quarter fan — each on its own trajectory, evenly indexed, with generous separation so nothing overlaps. On mobile the fan opens upward and inward from the tab-bar V; on tablet/desktop it opens up-and-left from the floating V. Offsets are clamped so the outermost action never crosses the viewport edge or the tab bar.
- **Light, legible action discs.** The dark translucent orbs and the vertical light beam are dropped. Each action becomes a bright circular disc on the app's own palette: white surface, hairline `T.line` border, Virtualis blue icon, soft `rgba(16,24,40,.10)` shadow — the same material as the cards and chips elsewhere in the app. Because there's no scrim behind them, light discs read cleanly against the workstation.
- **Labels.** Small, quiet sentence-case labels sit directly beneath each disc instead of the wide-tracked mono uppercase, so the cluster reads calm rather than technical.
- **Pop motion.** Each action springs from the V's center out to its fan position — scale from small to slightly over 1 and settle, with a ~45ms stagger outward. Closing reverses back into the V. Reduced-motion users get a plain fade.
- **V trigger.** Stays in place and keeps its rotate-open behavior, with the rotation eased slightly so it reads as a settle rather than a flip.

The four actions stay Consult, Page, Video, ALIS. Nothing else in the app changes.

## Technical notes

- `src/components/VirtualisApp.jsx` — in `VFab`: delete the scrim `div`'s gradient/`backdropFilter` (keep a transparent full-area click target), replace the column layout with absolutely positioned items driven by per-item angle/radius CSS variables, and restyle the discs with `T.card` / `T.line` / `T.blue`.
- `src/components/virtualis/theme.js` — add a `fanPop` keyframe (translate from origin + scale overshoot) used by the action items; the existing reduced-motion rule already neutralizes it.
