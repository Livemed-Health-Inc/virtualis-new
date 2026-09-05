# Model Lab false-negative evidence record

## What I can confirm now (read-only)

The Model Lab does not store anything in this app: no decision, input, or result is written
to the project database. The only durable copies of the last authenticated run live in your
AWS backend (DynamoDB feedback table, S3 training intake, gateway/app logs). The temporary
run artifacts from that session (Playwright scripts, console output, screenshots under the
sandbox temp folder) no longer exist — the sandbox was reset since that run.

Confirmed synthetic: the run used only the three built-in synthetic presets shipped in the
Model Lab screen, and the server refuses any text containing a possible identifier before a
call is made. The severe preset — the one that came back as `low` — is verbatim:

```text
Synthetic: 68yo with crushing substernal chest pain radiating to left arm, diaphoretic, BP 84/52.
```

The other two presets used:

```text
Synthetic: patient asks whether to take their evening statin with food. No symptoms reported.
Synthetic: post-op day 3 knee replacement, incision warm with mild drainage, temp 100.2F, ambulating.
```

What I reported from the run at the time (model `virtualis-qwen3-1.7b-rc4m-20260829`, policy
`routing-example-2026-08-18`, destination `standard_clinical_queue`, fallback
`standard_clinical_queue`, escalation 3600s, review required, clinically validated false,
severe case returned acuity `low` at ~0.76 confidence) is a summary, not a field-complete
record. I will not present it as the adjudication artifact.

## Proposed: capture a proper evidence record

1. Re-run the authenticated synthetic flow against the live gateway with the same three
   preset inputs, capturing the full projected decision payload for each (all acuity and
   routing fields, reason codes, decision_id, request_id, created_at, model/policy version).
2. Write the results to a single evidence file in your documents area: input text, exact
   response fields, timestamps, model version, and the synthetic-only attestation. No tokens,
   no credentials, no identifiers.
3. Record the false-negative case as a regression fixture in the repo tests (expected-vs-
   observed, marked as a known model gap, not a code assertion) so it is tracked.

Note: step 1 issues new decision calls, so new synthetic records will be created in your AWS
backend. Nothing is published and no app code changes beyond step 3 (which is optional).

## Technical notes

- Decision responses are projected in `src/lib/modellab/contract.ts`; the evidence file will
  contain exactly those whitelisted fields, which is also what the UI shows.
- `review_required=true` and `clinically_validated=false` are clamped server-side regardless
  of the runtime reply, so those two values in any record are ours, not the model's.
