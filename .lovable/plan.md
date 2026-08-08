# Proportion and polish pass

A refinement pass across the inbox, thread and composer so every surface reads as one calm, minimal system. No new features, no backend changes.

## What I found

Captured the signed-in app at 390px, 834px and 1440px.

- **Desktop inbox pane**: four stacked control rows (facility chips, search, acuity chips, Acuity/Patient toggle) eat ~280px before the first conversation. The facility and acuity chip rows are clipped at the pane edge.
- **Conversation cards**: four stacked lines each (name row, facility+service row, patient+room row, preview) at ~100px tall, so only ~3 fit on desktop. Too airy relative to everything else.
- **"Read" labels**: every read row carries a double-check plus the word "Read" — visual noise on a list whose job is to surface the unread ones.
- **Thread messages are top-anchored**: with a few messages the transcript clings to the top and leaves a large empty field above the composer. Chat should sit on the bottom.
- **Composer**: plain full-width field with a grey ghost send arrow and a grey "+" — the lowest-contrast element on the highest-intent control.
- **Floating V**: on desktop it lands in the horizontal center of the message pane, overlapping the composer and, when scrolled, sitting on top of a conversation card.
- **Rhythm**: card radii, chip radii and gaps drift between 10/12/14/20px across surfaces.

## Changes

### 1. Condense the inbox controls
- Merge the acuity filter into the same row as the Acuity/Patient view toggle: chips left, a small segmented toggle right, one row instead of two.
- Shrink the Acuity/Patient toggle from full-width to an intrinsic-width segmented control.
- Keep facility chips and search, tightening vertical gaps to a consistent 8px.
- Let the chip rows run edge-to-edge with the existing fade mask instead of clipping mid-chip.

### 2. Tighten conversation cards
- Fold facility tag, service line and patient/room into a single metadata line with dot separators; keep the preview line.
- Target ~76px card height on desktop (mobile compact rows stay as they are).
- Replace "Read" text with nothing; unread stays a filled blue count badge. Reduce timestamp weight.

### 3. Bottom-anchor the transcript
- Push messages to the bottom of the scroll area so short threads sit above the composer instead of floating at the top.

### 4. Composer
- Solid primary-blue circular send button, enabled state only when there is text; the "+" becomes a quiet outlined icon button.
- Match composer height and radius to the search field so both read as the same component family.

### 5. Reposition the floating V on desktop
- Anchor it to the bottom-right of the message pane with clearance above the composer, so it never overlaps the input or a conversation card. Mobile keeps the centered tab-bar V.

### 6. Unify the scale
- One radius scale (pills 999, cards 16, inputs 14), one spacing step (4/8/12/16), one type ramp for name / meta / preview across inbox, thread and account.

## Technical notes
- Files: `src/components/virtualis/Inbox.jsx`, `Thread.jsx`, `src/components/VirtualisApp.jsx`, and shared tokens in `src/components/virtualis/theme.js`.
- Presentation only — no changes to `store.jsx`, data shape, auth or database.
- Verify at 390px, 834px, 1440px plus phone landscape after the edits.

## Out of scope
- Login/hero page (already settled), telehealth flow, ALIS, account panel content.
