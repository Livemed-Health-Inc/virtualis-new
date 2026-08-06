# Fresh unread demo, clearer new-message emphasis, darker V icons

## 1. Demo sign-in always starts with unread messages

Right now read state persists in the backend, so the second time the demo account signs in the inbox looks fully caught up. After a successful **Quick demo login**, clear that account's stored read markers so every thread comes back as new. Only the demo shortcut does this — normal sign-in keeps real read state.

## 2. Make new messages read as new

Unread threads get a stronger, quieter-when-read treatment:

- A solid Virtualis-blue dot at the row's leading edge for unread threads (currently the cue is a soft gradient wash that's easy to miss).
- Unread thread title/name in heavier weight and full ink; read rows drop to normal weight with muted preview text.
- The unread count becomes a filled blue pill (white numeral) instead of loose blue text — same in the patient-group rows and the thread's related-consult list.
- Read rows go flat white with the hairline border and no blue glow, so the contrast between new and handled is unmistakable.
- New arriving messages briefly pulse the row's blue dot once so a live arrival is noticeable without motion clutter.

## 3. V menu icons in dark blue

The fan action icons currently use the light Virtualis blue and blend into the white discs. Switch icon strokes to the deep blue (`T.blueDeep`, #1B3FA0) and give each disc a faint blue-tinted surface so the icons stand out crisply against the workstation.

## Technical notes

- `src/components/virtualis/screens.jsx` — in the demo-login handler, after sign-in succeeds delete `thread_reads` rows for the signed-in user before the store loads.
- `src/components/virtualis/Inbox.jsx` — `Row` and the patient-group row: unread dot, weight/colour split, filled count pill.
- `src/components/virtualis/Thread.jsx` — related-consult unread count pill to match.
- `src/components/VirtualisApp.jsx` — `Icon` stroke → `T.blueDeep`; disc background tinted `T.blueSoft`.
