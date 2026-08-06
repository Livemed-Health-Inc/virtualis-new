# Bring the old Account menu into the current app

Yes — keep the same selections. They are the expected account surface for a clinical app (and reviewers look for Privacy/Terms/Support). The current app only has a slim profile sheet, so the gap is real but small.

## What the old version had vs. what we have now

| Old menu item | Today in Virtualis |
|---|---|
| Profile (view/edit) | Read-only sheet: name, role, credentials |
| My Schedule | Exists as a full Schedule tab (better than the old version) |
| Notifications | Missing |
| Settings (account) | Missing |
| Privacy Policy / Terms | Missing |
| Data Management (export/delete) | Missing |
| Help & Support / Contact | Missing |
| Sign Out | Exists (in the profile sheet) |
| Stat tiles (consults, messages) | Missing |

Also different: the old build was dark with an orange Sign Out button and a left slide-out drawer. We keep the current light clinical theme and blue accent — no orange, no dark drawer.

## What we build

Turn the profile sheet into a proper **Account** panel, opened from the same avatar (mobile: bottom sheet; desktop/tablet: right-side panel).

Structure:
1. Identity header — avatar, name, role, department, home facility, email.
2. Two stat tiles — consults and messages, counted from live data (not hardcoded).
3. Active credentials — the existing facility list, kept as-is.
4. Menu rows, each opening a sub-view inside the same panel:
   - Profile — edit display name, role, department, home facility (saved to the profile record)
   - Notifications — acuity-level toggles (critical / urgent / routine), quiet hours off-shift
   - Schedule — jumps to the existing Schedule tab
   - Privacy Policy and Terms — static clinical/HIPAA-oriented copy
   - Data Management — export my data as JSON; request account deletion
   - Help & Support — contact link and app version
5. Sign out — bottom, in the app's red token (not orange).

## Notes for the devs

- New `Account.jsx` under `src/components/virtualis/`; `Credentials` is folded into it as one section, so no duplicate sheet.
- Profile edits update the existing `profiles` table (name, role, dept, home_facility) through the store, so the rail avatar and directory reflect changes immediately.
- Notification preferences need a small addition: a `notification_prefs` JSON column on `profiles` (or a `preferences` table) with RLS scoped to `auth.uid()` and grants for `authenticated`. Toggles are UI-level for now; no push delivery is wired.
- Stat tiles derive from threads/messages already loaded in the store — no extra queries.
- Legal and support copy is placeholder text you can swap for the real policy.
