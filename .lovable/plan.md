# Move the web floating V to the right corner

## What changes

In the web (tablet/desktop) layout the floating V quick-action button currently centers itself over the active messaging pane. Move it to the bottom-right corner of that pane so it behaves like a classic FAB and stays out of the content flow.

## Details

- **File:** `src/components/VirtualisApp.jsx`.
- **VFab positioning:** when `float === true`, anchor the outer wrapper to `right: 26px` and remove the `left: 50% / translateX(-50%)` centering. Keep mobile (`float === false`) centered above the tab bar as-is.
- **Fan geometry:** adjust the `float` angles so the four actions bloom upward and leftward from the right-corner V, staying clear of the right viewport edge. Suggested float angles: `[170, 150, 130, 110]` with radius ~150 px.
- **Viewport safety:** keep the existing invisible tap-catcher and clamp logic so the outermost disc/label never crosses the pane boundary.
- **No other changes:** the V trigger styling, the four actions, mobile tab-bar V, and the rest of the app remain untouched.

## Verification

- Preview on desktop/tablet viewport and confirm the V sits in the bottom-right of the messaging pane.
- Open the menu and confirm the four actions fan cleanly above and to the left of the V without clipping the right edge.
- Confirm mobile still centers the V above the tab bar.