# Model Lab live verification — result and one contract gap

## Live run (read-only, nothing edited, committed or published)

Signed in as the administrator test account, one synthetic decision submitted, no feedback and
no training intake. Input, verbatim and synthetic:

```text
Synthetic: 68yo with crushing substernal chest pain radiating to left arm, diaphoretic, BP 84/52.
```

Runtime check (`/v1/info`): connected — model `sagemaker:virtualis-acuity-qwen3-1-7b-rc4m-validation`,
policy `routing-example-2026-08-18`, `clinically_validated = false`.

Decision returned (complete projected payload):

```text
decision_id                ec9b0bab-1891-4e51-8f80-7a49a248d330
request_id                 2c4b5115-ad6d-4b06-9d10-ce18edb0a5cc
use_case                   triage        (see gap below — specialist_consult was not selectable)
created_at                 2026-09-06T05:29:13.008491Z
acuity.level               high
acuity.display_label       high
acuity.legacy_score_band   [4, 5]
acuity.probabilities       low 0.00031091 · medium 0.06109219 · high 0.93859684
acuity.confidence          0.93859684
acuity.reason_codes        MODEL_CLASSIFICATION, RELEASE_GATE_HUMAN_REVIEW_REQUIRED
acuity.model_version       virtualis-qwen3-1.7b-rc4m-20260829
route.destination          clinical_review_queue
route.service_line         cardiology
route.priority             10
route.escalation_after_seconds  0
route.notify               assigned_team, clinical_reviewer
route.reason_codes         ROUTE_CARDIOLOGY, ROUTE_REQUIRES_CLINICAL_REVIEW
route.fallback_destination urgent_clinical_queue
route.policy_version       routing-example-2026-08-18
review_required            true  (clamped server-side)
clinically_validated       false (clamped server-side)
```

Echo/leak check: no part of the submitted text appears in any server response, and the server
log contains zero occurrences of the submitted wording. No console errors.

Immutable model version confirmed: `virtualis-qwen3-1.7b-rc4m-20260829`.

Note on the earlier false negative: the same severe input now classifies as `high` at 94%, so
the earlier `low`/76% observation does not reproduce on this build. The original run's raw
artifacts no longer exist in the sandbox, so the only durable copy of that record is in your
AWS backend logs.

## The one gap found

The screen's use-case list is `triage | routing | escalation | quality_review`. The deployed
contract's example uses `specialist_consult`, which cannot be selected or sent, so the
requested run went out as `triage`.

## Proposed change (needs build mode)

1. Add `specialist_consult` to the use-case list in `src/lib/modellab/training.ts` (it feeds the
   server Zod enum, the screen's picker, and CSV/JSONL import), and confirm the full accepted
   set with the deployed schema so no other value is missing.
2. Re-run the same single synthetic case with `use_case: specialist_consult` and record the
   projected result the same way.
3. Run typecheck, lint, tests and a production build. No publish.
