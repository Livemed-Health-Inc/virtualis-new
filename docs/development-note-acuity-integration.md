# Nue development integration — evidence and boundaries

## Exact Virtualis Note

Read-only original source: project `eb9d503b-3831-420a-8d8b-d7ea0092bbc2`, snapshot commit `45c17ca5`. Not the RCM remix. Source is accessible; a portable authenticated Note module is **not** exported.

`src/components/VirtualisNote.tsx` (2,103 lines) imports `useVirtualisNoteState`, `useNoteGeneration`, `AppLayout`, router navigation, sync, billing and completeness-review UI. `src/App.tsx` uses a different router and supplies AuthProvider, FacilityProvider and SyncProvider. State loads patients and clinical notes; generation performs AI and clinical/billing/analytics writes. Copying just the screen would not reproduce the exact application safely. Nue's existing `NoteSheet.jsx` remains unchanged: it is standalone SOAP, **not** full embedded Virtualis Note.

`public/_headers` explicitly denies framing (`frame-ancestors 'none'`, `X-Frame-Options: DENY`). No production iframe, header changes, source-project modifications, asset downloads, database duplication or AI calls were made.

### Required source/export contract

Provide a version-pinned export from the original project containing the unchanged Note presentation and its transitive local components, styles/assets and license/dependency manifest; expose a mount/unmount boundary with host adapters rather than App/BrowserRouter. Adapters must cover navigation, verified identity, current facility, chart/encounter selection, synchronization, dictation, note generation, billing and Stage-and-Sign. No direct source-project database client, service credentials, hidden background writes or automatic inference may run on mount. Preserve exact Note UI and human review; reconcile original note IDs, version/provenance, signature immutability and existing storage ownership before enabling writes. Do not create a second notes database.

### Authenticated development embed contract (alternative, not implemented)

Use a separately isolated development build of the exact Note, not production. Owner must supply an authenticated development entry with synthetic-only/read-only service adapters and an exact Nue development origin allowlist. Production DENY headers remain untouched. Any framing permission would apply only to that isolated build and require owner approval; no framing change is authorized now. Use normal secure session establishment via a server-verified, short-lived, audience- and facility-scoped handshake with replay protection; never pass bearer tokens, patient content or identifiers in URLs, browser storage or postMessage. A bounded origin/source/nonce-checked postMessage protocol may carry only ready/close/resize and opaque correlation IDs. Same-origin packaged source is preferable; isolated cross-origin auth cannot assume shared sessions.

## AWS Acuity development preparation

The existing consult composer now displays an unavailable/review-required result **before** clinician acuity/specialty selection in development. Its existing keyword-generated ALIS suggestion is suppressed only in development; no fabricated model recommendation is substituted. Development labels are Red/Yellow/Green; existing manual selection and consult workflow remain intact.

`getConsultRecommendation` is a dedicated development-gated authenticated RPC, not admin-only Model Lab `runDecision`. It accepts only a facility slug: no patient, MRN, message, model label, user identity or token in the body. It derives caller identity from existing verified auth, checks setup, reads only that caller's explicit credential facilities under RLS, and rechecks `has_facility_access`. No admin bypass. This request returns unavailable and never imports/calls inference, enqueues cases, invokes write-based rate limiting, or writes orders/consults. Production requests fail before auth middleware.

Virtual/onsite classification is currently invitation metadata, not an authoritative profile authorization field. Existing admin invitation code enforces one onsite facility and explicit multiple virtual facilities; runtime authorization therefore uses actual credential assignments, not editable profile role, email or inferred classification. A historical onsite account incorrectly assigned multiple credentials cannot be independently identified by this schema: review authoritative classification/assignments before enabling real clinical inference. No migration was performed to address that gap.

The pure preparation helper accepts an injected synthetic mock transport in unit tests and reuses `toDecisionRequest`/`projectDecision` from the fixed model contract. The contract's channel is `synthetic_model_lab`; it is **not** relabeled as clinical traffic. Tests preserve decision/model/policy provenance and safety clamps. A clinician may choose differently after a result, including unavailable; no automatic routing occurs. No provenance persistence for real clinical decisions is claimed.

### Exact runtime blockers

- Current `acuity.server.ts` remains unchanged: it forwards the verified session JWT to AWS. Prior evidence reports valid sessions returning gateway 403 with an HS256/no-kid token against ES256 JWKS; no fresh trust/inference checks were authorized or performed. Confirm active signing algorithm, issuer/audience and authorizer trust with the owners; do not accept unverified tokens or change auth as a workaround.
- Real consult inference needs an upstream-approved clinical channel/field contract, provider authorization/assignment validation, PHI processing coverage and approved provenance storage in the existing workflow. Current Model Lab administration and review enqueue behavior must remain separate.
- Exact Note needs the source/export or isolated authenticated development entry contract above. Source availability alone does not prove embedding or live integration.

## Verification scope

Only targeted synthetic unit mocks are allowed here. No database tests (including rollback), migrations, DDL, writes, users, live inference, paid provider calls, production changes or deployment. UI/source preparation is implemented; authenticated live model/Note integration is **not proven or enabled**. No existing clinical login/browser flow was exercised because mounting it performs read-reset/audit database writes.