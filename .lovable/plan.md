# Patent branding

Two additions, styled with the existing Virtualis tokens (blue accent, soft cards, mono labels). Nothing else changes — acuity bars, colors, animated logo and all current features stay exactly as they are.

Note: the app's current surface is the light clinical theme, not the old dark build. The Patents screen will use the same card/glass language as the Account panel so it feels native rather than imported.

## 1. Patents screen

A new sub-view inside the Account panel (the sheet that holds credentials and Sign out), opened by a new "Patents" row placed in the Privacy & Support group, just above Sign out.

Contents, top to bottom:
- Back arrow + title "Patents", subtitle "Intellectual property notice for the Virtualis platform".
- Notice card — blue-tinted, blue left accent, mono "PATENT NOTICE" label, with the § 287(a) virtual marking paragraph.
- Patent card — "U.S. Patent No. 12,694,994 B2" as the heading, italic title "Systems, Methods, and Devices for Message Control", then labeled rows: Issued (July 28, 2026), Inventors (Saamer Siddiqi; Marc Anguiano), Assignee (Livemed Health Inc.), and a Representative coverage paragraph.
- Footer card — small muted disclaimer text ending with the 2026 Livemed Health Inc. copyright.

## 2. Login screen footnote

One low-contrast footnote line pinned below everything on the login card: "Patented · U.S. Pat. No. 12,694,994", set at footnote size in the muted token so it sits under the existing "Virtualis®" line without competing with the hero. The animated logo, lockup and copy are untouched.

## Technical notes

- `src/components/virtualis/Account.jsx`: add a `patents` entry to the existing `view` map and one `Row` in the Privacy & Support group; reuse the existing `Row`, `Label`, `Legal` and `Back` primitives, no new files.
- `src/components/virtualis/screens.jsx`: append the footnote line after the existing `Virtualis®` line in the login card.
- No database, store, or routing changes.
