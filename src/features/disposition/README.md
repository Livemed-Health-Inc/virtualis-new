# Virtualis Disposition Module

**Point-of-care patient-status decision support + LOS expectation/variance tagging.**
© 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential — do not publish or demo externally before the provisional patent application is filed.

## What it does

1. **Status indicator at consult creation** — when (and only when) a consult involves an undetermined disposition (ED-origin or direct admission), the engine evaluates the available evidence and renders a chip next to acuity: **Meets Inpatient / Meets Obs / Insufficient data**, with a tap-to-open evidence panel. The physician confirms or overrides (override reason mandatory, everything audited).
2. **Expected LOS at the point of care** — the same inputs set an expected-midnights value ("Expected LOS: 3 midnights"), which is also what grounds the two-midnight status logic.
3. **LOS variance tagging during the stay** — on each midnight rollover (or census refresh), `evaluateLOSVariance` compares elapsed vs expected midnights and produces an `on_track / approaching / exceeding` tag that names the physicians to notify — the avoidable-day signal for case management.
4. **Segregated feedback stream** — confirm/override, payer outcomes, and LOS outcomes flow to a separate feedback store (never into clinical documentation). Override rate and downstream denial rate are the module's two headline value metrics.

## Design invariants (do not break when porting)

These invariants embody the governed-transaction architecture described in the Virtualis invention disclosure — they are the point of the module, not incidental:

- **Context gating**: the indicator never fires on already-admitted patients (`shouldEvaluateDisposition`). Not every consult is an admission decision.
- **Dual-identity check**: resolutions are rejected unless both `patientId` and `threadId` match the obligation's context (`CTX_PATIENT_MISMATCH` / `CTX_THREAD_MISMATCH`).
- **Authority**: only `physician`/`app` roles can resolve status (`AUTH_ROLE`).
- **Obligation gating**: `createDispositionObligation` produces an open node that should block consult/encounter closure until resolved; it carries `clinicalRisk` + `requiredBy` for debt-queue ordering.
- **Advisory posture**: evidence is always fully displayed (non-device CDS); the disclaimer renders in the panel; the recommendation is never auto-applied.
- **Feedback separation**: feedback events have no write path into notes.

## Compliance & IP guardrails

- **No InterQual/MCG content** is embedded; rules are original and derive from public CMS Two-Midnight guidance plus configurable risk factors. To use a hospital's licensed criteria, integrate *their* license at deployment — never embed criteria text in this repo.
- Thresholds (`RuleThresholds`), LOS baselines, and modifiers are **facility-tunable config and trade secret**. The shipped values are placeholders; production loads tuned tables from configuration, not source.
- Do not market this as "patented." Claim mapping is pending counsel review; the disposition-obligation mechanism is candidate dependent-claim material for the governed-transaction family.

## Integration (VirtualisChat consult creation)

```tsx
import {
  useDisposition, StatusChip, LOSExpectationTag,
  registerFeedbackSink, type DispositionInput,
} from '@/features/disposition';

// Once, at app bootstrap — wire persistence (Supabase/API):
registerFeedbackSink((event) => supabase.from('disposition_feedback').insert(event));

function ConsultCreationCard({ consult, patient, actor }) {
  const input: DispositionInput = {
    context: {
      patientId: patient.id, mrn: patient.mrn,
      threadId: consult.threadId, consultId: consult.id,
      actorId: actor.id, actorRole: actor.role,
    },
    origin: consult.origin,            // from consult form / ADT
    patientClass: patient.adtClass,    // from ADT feed
    consultReason: consult.reason,
    conditionCategory: consult.conditionCategory,
    age: patient.age,
    vitals: patient.latestVitals,
    labs: patient.latestLabs,
    attested: consult.attestedFactors, // checkboxes on the consult form
    payer: patient.payer,
  };

  const d = useDisposition(input);
  if (!d.applicable || !d.assessment) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* existing acuity chip renders here */}
      <StatusChip assessment={d.assessment} obligation={d.obligation} onResolve={d.resolve} />
      {d.losExpectation && <LOSExpectationTag expectation={d.losExpectation} />}
    </div>
  );
}
```

During the stay (census/CM views), on midnight rollover:

```tsx
import { evaluateLOSVariance, LOSVarianceChip } from '@/features/disposition';

const tag = evaluateLOSVariance(storedExpectation, admission.admittedAt, {
  tagPhysicianIds: [attending.id, consultant.id],
});
<LOSVarianceChip tag={tag} onTagPhysicians={(t) => notifyPhysicians(t)} />
```

Closure gating: when the host app closes a consult/encounter, check the module's obligation — if `state === 'open'`, block closure the same way other obligation nodes gate attestation.

## Suggested persistence (host app)

| Table | Contents |
|---|---|
| `disposition_assessments` | full `DispositionAssessment` JSON, keyed by consult |
| `disposition_obligations` | obligation + resolution (audit trail) |
| `los_expectations` | expectation per admission |
| `disposition_feedback` | the segregated feedback stream |

## Value metrics to instrument from day one

1. **Override rate** (accuracy proxy) — target trend downward as thresholds tune.
2. **Denial/downgrade rate on confirmed statuses** — the CM sales number.
3. **Avoidable days flagged** — count of `exceeding` tags with documented barriers.

## File map

```
disposition/
├── types.ts        core types: assessment, obligation, LOS, feedback, context
├── rules.ts        rule content + facility-tunable thresholds
├── engine.ts       gate → evaluate → obligation → guarded resolution
├── los.ts          expected LOS + midnight-variance tagging
├── feedback.ts     segregated feedback stream (pluggable sink)
├── hooks/useDisposition.ts
├── components/StatusChip.tsx
├── components/StatusEvidencePanel.tsx
├── components/LOSTag.tsx
└── index.ts        public API
```
