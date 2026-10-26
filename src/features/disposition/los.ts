/**
 * Virtualis Disposition Module — LOS expectation & point-of-care variance tagging.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 *
 * Two linked capabilities:
 *  1. At consult creation: set an EXPECTED LOS from a configurable condition
 *     table + patient modifiers (this is what powers the two-midnight call).
 *  2. During the stay: compare elapsed midnights vs expectation and TAG the
 *     responsible physicians at the point of care when the stay is approaching
 *     or exceeding expectation — the avoidable-day signal case management buys.
 *
 * The baseline table below is a PLACEHOLDER structure with illustrative values.
 * Production deployments load facility GMLOS/DRG-derived tables via config;
 * tuned values are trade secret and never hard-coded.
 */

import type {
  DispositionContextRef,
  DispositionInput,
  LOSBand,
  LOSExpectation,
  LOSVarianceState,
  LOSVarianceTag,
} from './types';

export const LOS_RULE_SET_VERSION = 'vds-los-0.1.0';

/** Baseline expected midnights by condition category. PLACEHOLDER VALUES. */
export const DEFAULT_LOS_BASELINES: Record<string, number> = {
  'chest-pain-ruleout': 1,
  'syncope': 1,
  'nstemi': 3,
  'chf-exacerbation': 4,
  'copd-exacerbation': 3,
  'pneumonia': 3,
  'sepsis': 5,
  'cellulitis': 3,
  'gi-bleed': 3,
  'aki': 3,
  'default': 2,
};

export interface LOSModifierConfig {
  ageOver75: number;
  highRiskComorbidity: number;
  failedOutpatientTherapy: number;
  alteredMentalStatus: number;
  unableToToleratePo: number;
}

export const DEFAULT_LOS_MODIFIERS: LOSModifierConfig = {
  ageOver75: 1,
  highRiskComorbidity: 1,
  failedOutpatientTherapy: 1,
  alteredMentalStatus: 1,
  unableToToleratePo: 1,
};

export function bandFor(midnights: number): LOSBand {
  if (midnights < 2) return 'lt_2_midnights';
  if (midnights <= 3) return '2_3_midnights';
  return '4_plus_midnights';
}

/** Set the expected LOS at consult creation. */
export function estimateLOS(
  input: DispositionInput,
  baselines: Record<string, number> = DEFAULT_LOS_BASELINES,
  modifiers: LOSModifierConfig = DEFAULT_LOS_MODIFIERS,
): LOSExpectation {
  const category = input.conditionCategory ?? 'default';
  const baseline = baselines[category] ?? baselines['default'] ?? 2;
  const basis: string[] = [`baseline(${category})=${baseline}`];
  let expected = baseline;

  if ((input.age ?? 0) >= 75) { expected += modifiers.ageOver75; basis.push('age ≥ 75'); }
  if (input.attested?.highRiskComorbidity) { expected += modifiers.highRiskComorbidity; basis.push('high-risk comorbidity'); }
  if (input.attested?.failedOutpatientTherapy) { expected += modifiers.failedOutpatientTherapy; basis.push('failed outpatient therapy'); }
  if (input.attested?.alteredMentalStatus) { expected += modifiers.alteredMentalStatus; basis.push('altered mental status'); }
  if (input.attested?.unableToToleratePo) { expected += modifiers.unableToToleratePo; basis.push('unable to tolerate PO'); }

  return {
    context: input.context,
    conditionCategory: category,
    expectedMidnights: expected,
    band: bandFor(expected),
    basis,
    setAt: input.evaluatedAt ?? new Date().toISOString(),
    ruleSetVersion: LOS_RULE_SET_VERSION,
  };
}

/** Count midnights elapsed between admission and now (local-time midnights). */
export function elapsedMidnights(admittedAtIso: string, nowIso?: string): number {
  const admitted = new Date(admittedAtIso);
  const now = nowIso ? new Date(nowIso) : new Date();
  if (Number.isNaN(admitted.getTime()) || now <= admitted) return 0;
  const a = new Date(admitted); a.setHours(0, 0, 0, 0);
  const n = new Date(now); n.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((n.getTime() - a.getTime()) / 86_400_000));
}

export interface VarianceOptions {
  /** Midnights before breach at which to pre-warn. Default 1. */
  approachWindow?: number;
  /** Physicians to tag (attending + consultant ids). */
  tagPhysicianIds: string[];
}

/**
 * Point-of-care LOS variance tag: 'LOS-expected' vs 'not'.
 * Call on a schedule (e.g., each midnight rollover) or on census refresh.
 */
export function evaluateLOSVariance(
  expectation: LOSExpectation,
  admittedAtIso: string,
  opts: VarianceOptions,
  context: DispositionContextRef = expectation.context,
  nowIso?: string,
): LOSVarianceTag {
  const elapsed = elapsedMidnights(admittedAtIso, nowIso);
  const approach = opts.approachWindow ?? 1;

  let state: LOSVarianceState;
  if (elapsed > expectation.expectedMidnights) state = 'exceeding';
  else if (elapsed >= expectation.expectedMidnights - approach + 1) state = 'approaching';
  else state = 'on_track';

  const message =
    state === 'on_track'
      ? `LOS on track: midnight ${elapsed} of ${expectation.expectedMidnights} expected.`
      : state === 'approaching'
        ? `LOS approaching expectation: midnight ${elapsed} of ${expectation.expectedMidnights}. Confirm discharge plan or document the barrier.`
        : `LOS exceeding expectation: midnight ${elapsed} vs ${expectation.expectedMidnights} expected. Document continued-stay necessity or escalate to case management.`;

  return {
    context,
    state,
    expectedMidnights: expectation.expectedMidnights,
    elapsedMidnights: elapsed,
    tagPhysicianIds: state === 'on_track' ? [] : opts.tagPhysicianIds,
    message,
    evaluatedAt: nowIso ?? new Date().toISOString(),
  };
}
