# V Menu: Evaluation and Refinement

## Verdict

Functional and legible, but not yet premium. It currently reads as a standard material-style floating action button rather than a first-of-its-kind clinical interface.

What is working:
- Only 4 actions. Restraint is correct.
- No background blur, so the workstation stays visible.
- Deep blue discs do finally separate from the page.

What is holding it back:
1. Two containers per action. Each item has a solid navy circle plus a separate bordered white label pill. That is two floating objects per action, eight total shapes on screen. Premium menus use one object per action.
2. Generic FAB language. Solid navy fill, white ring, heavy drop shadow is the 2018 Android pattern. Nothing about it feels clinical or spatial.
3. Arbitrary geometry. Four items at 146 to 150 px with different angle sets per breakpoint. Labels land far from the trigger and the arc does not feel physically attached to the V.
4. No exit motion. Items animate in, then vanish instantly on close. Retraction is where perceived quality lives.
5. Icon weight. 21 px glyphs at stroke 2 inside a 52 px disc are undersized, so each disc reads as a blue blob first.

## Proposed redesign: one capsule per action

Replace the disc plus pill pair with a single glass capsule holding icon and label together.

- Capsule: translucent white surface, deep blue text and icon, hairline blue border, soft layered shadow. Reads as clinical glass, not plastic.
- Icon sits left inside the capsule at 18 px, label right. One object, one shadow, one tap target.
- Right aligned to the V on desktop, center stacked on mobile, so the arc problem disappears.

## Motion

- Open: capsules rise and unfurl from the V, 40 ms stagger, spring easing, slight scale from 0.92 with a short travel of about 12 px each. Short travel plus stagger reads faster and more expensive than a long arc.
- Close: reverse stagger, 180 ms, capsules retract toward the V and fade. Requires holding the open state through the exit animation instead of unmounting immediately.
- Trigger: V rotates to a subtle 45 degree state as today, with the halo ring tightening rather than the shadow growing.

## Geometry

- Vertical stack, 10 px gap, anchored 14 px above the V.
- Desktop: right edges aligned with the V.
- Mobile: centered above the tab bar V, full capsule width driven by the longest label so all four are identical width.
- Removes both angle arrays and the radius math entirely.

## Technical notes

- All changes stay inside `VFab` in `src/components/VirtualisApp.jsx`.
- Add a `closing` state so exit motion can play before unmount.
- Replace the `fanPop` keyframe in `src/components/virtualis/theme.js` with `capsuleIn` and `capsuleOut`.
- Continue using `T.card`, `T.blueDeep`, `T.blue`, and `T.line` tokens. No new colors.
- No changes to inbox, thread, telehealth, or auth.
