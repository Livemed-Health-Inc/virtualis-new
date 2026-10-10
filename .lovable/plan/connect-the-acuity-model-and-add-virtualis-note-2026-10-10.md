# Connect the acuity model and add Virtualis Note

## Part 1 — Acuity model (needs one step from you on AWS)

The app already sends each signed-in user's session to the model correctly. Your AWS gateway's sign-in check rejects every session, so nothing gets through yet.

1. You paste the authorizer code from AWS (the Lambda that runs before the model). I send back an exact replacement that checks sessions against the backend's current published signing keys, refreshes when keys rotate, and still verifies issuer and audience. Nothing gets weaker.
2. You deploy it. I then test end to end from the app: model info, one synthetic decision, feedback, and training intake. I fix any field-name mismatch the model reports.
3. Model Lab stops showing "Runtime unreachable". I update the roadmap.

No change to the deployed model. Mandatory human review stays on, and the "clinically validated" flag stays false.

## Part 2 — Virtualis Note (assistant + saved, signed notes)

**Real assistant (replaces the canned ALIS replies)**
- One live conversation inside the existing ALIS panel. Answers stream in, and you can stop a reply.
- It runs on Lovable AI from the app's server. No key or prompt ever reaches the browser.
- It frames answers as decision support. It never files anything or changes acuity by itself.

**Note drafting with sign-off**
- A "Draft note" action on a thread (and at the end of a telehealth visit) produces a SOAP note: Subjective, Objective, Assessment, Plan.
- The note opens as an editable **Draft**. You can save and come back to it. **Sign** locks it with your name and the time. Signed notes can't be edited. A correction creates an addendum.
- Only clinicians with access to that thread's hospital can draft, read or sign its notes. The server checks this, using the same hospital isolation as messages.
- Every draft, save, sign and addendum goes into the existing audit log.

**PHI handling (needs your confirmation)**
Drafting a note means sending thread text to the AI model. Before I enable this on real hospital threads, your workspace must have the AI provider covered for PHI (zero-retention models only, plus your BAA position). Until you confirm that, drafting will run only on synthetic or demo threads and refuse real ones.

## Technical details

- Migration: a `clinical_notes` table (thread_id, facility_id, author_id, status draft/signed, sections as jsonb, signed_at, parent_note_id for addenda), plus grants, RLS through `has_facility_access`, and a trigger that blocks edits after signing. Writes go only through security-definer RPCs, which write to `audit_log`.
- Server: `src/lib/note/ai.server.ts` (gateway helpers). `note.functions.ts` holds `draftNote` (streams through Responses using `openai/gpt-6-astra`, strict SOAP schema, low reasoning effort), `saveNote`, `signNote`, `listNotes`, all behind `requireSupabaseAuth` with per-user rate limits. A `/api/alis` streaming route serves the chat.
- UI: rewire `Alis.jsx` to streaming chat. Add a small NoteEditor used from Thread and Telehealth.
- Tests: SOAP schema, edits blocked after signing, a cross-hospital user denied, a signed-out user denied, and a real-thread refusal while PHI mode is off. Typecheck, lint and build must all pass. Nothing gets published until you approve.
