/**
 * Virtualis Disposition Module — evaluation engine + obligation lifecycle.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 *
 * Embodies the claimed architecture:
 *  - gating on communication context (only disposition-undetermined consults fire);
 *  - evidence-linked recommendation (every conclusion carries its sources);
 *  - a disposition OBLIGATION that must be physician-resolved before closure;
 *  - dual-identity context check on resolution writes;
 *  - segregated feedback stream (see feedback.ts).
 */

import {
  DISPOSITION_DISCLAIMER,
  type DispositionAssessment,
  type DispositionContextRef,
  type DispositionEvidence,
  type DispositionInput,
  type DispositionObligation,
  type DispositionResolution,
  type StatusRecommendation,
} from './types';
import { buildRules, DEFAULT_THRESHOLDS, RULE_SET_VERSION, type RuleThresholds } from './rules';

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/* ───────────────────────────── Gate ─────────────────────────────────────── */

/**
 * The design rule from product: not every consult is an admission decision.
 * Fire ONLY when disposition is genuinely undetermined.
 */
export function shouldEvaluateDisposition(
  input: Pick<DispositionInput, 'origin' | 'patientClass'>,
): { evaluate: boolean; reason: string } {
  if (input.patientClass === 'inpatient') {
    return { evaluate: false, reason: 'Patient already admitted — continued-stay review applies, not admission status.' };
  }
  if (input.origin === 'ed' || input.origin === 'direct_admission') {
    return { evaluate: true, reason: 'Disposition undetermined at consult creation.' };
  }
  if (input.origin === 'inpatient') {
    return { evaluate: false, reason: 'Inpatient consult — status already established.' };
  }
  if (input.patientClass === 'emergency' || input.patientClass === 'preadmit') {
    return { evaluate: true, reason: 'ED/preadmit patient class — status decision pending.' };
  }
  return { evaluate: false, reason: 'Consult context does not involve an admission decision.' };
}

/* ─────────────────────────── Evaluation ─────────────────────────────────── */

export interface EvaluateOptions {
  thresholds?: RuleThresholds;
  /** Minimum net signal before we commit to a recommendation. */
  minSignal?: number;
}

export function evaluateDisposition(
  input: DispositionInput,
  opts: EvaluateOptions = {},
): DispositionAssessment {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const base = {
    assessmentId: newId('dsp'),
    context: input.context,
    ruleSetVersion: RULE_SET_VERSION,
    evaluatedAt,
    disclaimer: DISPOSITION_DISCLAIMER,
  };

  const gate = shouldEvaluateDisposition(input);
  if (!gate.evaluate) {
    return {
      ...base,
      recommendation: 'not_applicable',
      confidence: 1,
      evidence: [],
      missingData: [],
      twoMidnightExpectation: 'indeterminate',
      payerNote: gate.reason,
    };
  }

  const rules = buildRules(opts.thresholds ?? DEFAULT_THRESHOLDS);
  const evidence: DispositionEvidence[] = [];
  const missing = new Set<string>();

  for (const rule of rules) {
    const fired = rule.evaluate(input);
    if (fired) {
      evidence.push(fired);
    } else if (!hasInputs(input, rule.requires)) {
      rule.requires.forEach((r) => missing.add(r));
    }
  }

  const inpatientScore = sum(evidence, 'inpatient');
  const observationScore = sum(evidence, 'observation');
  const net = inpatientScore - observationScore;
  const totalSignal = inpatientScore + observationScore;
  const minSignal = opts.minSignal ?? 0.2;

  let recommendation: StatusRecommendation;
  if (totalSignal < minSignal) {
    recommendation = 'insufficient_data';
  } else if (net > 0.1) {
    recommendation = 'meets_inpatient';
  } else if (net < -0.1) {
    recommendation = 'meets_observation';
  } else {
    recommendation = 'insufficient_data';
  }

  // Confidence: proportion of signal agreeing with the winner, damped by missing data.
  const agree = recommendation === 'meets_inpatient' ? inpatientScore
    : recommendation === 'meets_observation' ? observationScore
    : 0;
  const dampen = Math.max(0.5, 1 - missing.size * 0.06);
  const confidence = recommendation === 'insufficient_data'
    ? 0
    : Math.min(0.95, Number(((agree / Math.max(totalSignal, 0.001)) * dampen).toFixed(2)));

  const twoMidnightExpectation =
    input.attested?.physicianTwoMidnightExpectation === true ? 'expected'
    : input.attested?.physicianTwoMidnightExpectation === false ? 'not_expected'
    : recommendation === 'meets_inpatient' ? 'expected'
    : recommendation === 'meets_observation' ? 'not_expected'
    : 'indeterminate';

  return {
    ...base,
    recommendation,
    confidence,
    evidence: evidence.sort((a, b) => b.weight - a.weight),
    missingData: [...missing],
    twoMidnightExpectation,
    payerNote: payerNote(input.payer),
  };
}

function sum(evidence: DispositionEvidence[], side: 'inpatient' | 'observation') {
  return evidence.filter((e) => e.supports === side).reduce((s, e) => s + e.weight, 0);
}

function hasInputs(input: DispositionInput, paths: string[]): boolean {
  return paths.every((p) => {
    const parts = p.split('.');
    let cur: unknown = input;
    for (const part of parts) {
      if (cur == null || typeof cur !== 'object') return false;
      cur = (cur as Record<string, unknown>)[part];
    }
    return cur !== undefined && cur !== null;
  });
}

function payerNote(payer: DispositionInput['payer']): string | undefined {
  switch (payer) {
    case 'medicare':
      return 'Medicare FFS: CMS Two-Midnight benchmark applies.';
    case 'medicare_advantage':
    case 'commercial':
      return 'Plan-specific medical-necessity criteria may apply — route to UM review.';
    default:
      return undefined;
  }
}

/* ─────────────────────── Obligation lifecycle ───────────────────────────── */

/** Create the disposition obligation that gates consult/encounter closure. */
export function createDispositionObligation(
  assessment: DispositionAssessment,
  opts: { requiredWithinHours?: number } = {},
): DispositionObligation | null {
  if (assessment.recommendation === 'not_applicable') return null;
  const hours = opts.requiredWithinHours ?? 6;
  const clinicalRisk =
    assessment.recommendation === 'meets_inpatient' ? 0.8 :
    assessment.recommendation === 'insufficient_data' ? 0.6 : 0.4;
  return {
    nodeId: newId('obl'),
    type: 'disposition',
    context: assessment.context,
    assessmentId: assessment.assessmentId,
    state: 'open',
    requiredBy: new Date(Date.now() + hours * 3_600_000).toISOString(),
    clinicalRisk,
  };
}

export type ResolutionError =
  | 'CTX_PATIENT_MISMATCH'
  | 'CTX_THREAD_MISMATCH'
  | 'CTX_ASSESSMENT_MISMATCH'
  | 'AUTH_ROLE'
  | 'AUTH_ACTOR'
  | 'ALREADY_RESOLVED'
  | 'OVERRIDE_REASON_REQUIRED';

const sameContext = (a: DispositionContextRef, b: DispositionContextRef) =>
  a.patientId === b.patientId && a.threadId === b.threadId && a.consultId === b.consultId;

/**
 * Resolve the obligation. Enforces:
 *  - assessment ↔ obligation binding (id and context);
 *  - dual-identity context match (patient AND thread);
 *  - the deciding actor is the bound physician/APP (client check only — not
 *    production authorization);
 *  - mandatory reason whenever the decision is not the recommendation.
 */
export function resolveDispositionObligation(
  obligation: DispositionObligation,
  assessment: DispositionAssessment,
  resolution: Omit<DispositionResolution, 'decidedAt' | 'agreesWithRecommendation'> & {
    context: DispositionContextRef;
  },
): { ok: true; obligation: DispositionObligation } | { ok: false; error: ResolutionError } {
  if (obligation.state !== 'open') return { ok: false, error: 'ALREADY_RESOLVED' };
  if (
    obligation.assessmentId !== assessment.assessmentId ||
    !sameContext(obligation.context, assessment.context)
  )
    return { ok: false, error: 'CTX_ASSESSMENT_MISMATCH' };
  if (resolution.context.patientId !== obligation.context.patientId)
    return { ok: false, error: 'CTX_PATIENT_MISMATCH' };
  if (resolution.context.threadId !== obligation.context.threadId)
    return { ok: false, error: 'CTX_THREAD_MISMATCH' };
  if (resolution.context.consultId !== obligation.context.consultId)
    return { ok: false, error: 'CTX_ASSESSMENT_MISMATCH' };
  if (resolution.decidedByRole !== 'physician' && resolution.decidedByRole !== 'app')
    return { ok: false, error: 'AUTH_ROLE' };
  if (
    resolution.decidedBy !== obligation.context.actorId ||
    resolution.decidedByRole !== obligation.context.actorRole
  )
    return { ok: false, error: 'AUTH_ACTOR' };

  const recommendedStatus =
    assessment.recommendation === 'meets_inpatient' ? 'inpatient'
    : assessment.recommendation === 'meets_observation' ? 'observation'
    : null;
  const agrees = recommendedStatus !== null && resolution.decidedStatus === recommendedStatus;
  if (!agrees && !resolution.overrideReason?.trim())
    return { ok: false, error: 'OVERRIDE_REASON_REQUIRED' };

  return {
    ok: true,
    obligation: {
      ...obligation,
      state: agrees ? 'confirmed' : 'overridden',
      resolution: {
        decidedStatus: resolution.decidedStatus,
        decidedBy: resolution.decidedBy,
        decidedByRole: resolution.decidedByRole,
        agreesWithRecommendation: agrees,
        overrideReason: resolution.overrideReason,
        decidedAt: new Date().toISOString(),
      },
    },
  };
}
