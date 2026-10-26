/**
 * Virtualis Disposition Module — segregated feedback stream.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 *
 * Invariant (per the governed-transaction architecture): feedback events NEVER
 * write into clinical documentation. They flow to a separate store and are the
 * module's accuracy flywheel: override rate, payer outcomes, LOS outcomes.
 */

import type {
  DispositionAssessment,
  DispositionFeedbackEvent,
  DispositionObligation,
  LOSVarianceTag,
} from './types';

export type FeedbackSink = (event: DispositionFeedbackEvent) => Promise<void> | void;

/** Default sink is a no-op; the host app wires Supabase/API persistence. */
let sink: FeedbackSink = () => {};

export function registerFeedbackSink(fn: FeedbackSink) {
  sink = fn;
}

// Rejections propagate so the host can report failure; never assume success.
const emit = (event: DispositionFeedbackEvent) => Promise.resolve().then(() => sink(event));

export function recordResolution(
  assessment: DispositionAssessment,
  obligation: DispositionObligation,
): Promise<void> {
  const r = obligation.resolution;
  if (!r) return Promise.resolve();
  return emit({
    stream: 'disposition-feedback',
    kind: r.agreesWithRecommendation ? 'confirm' : 'override',
    assessmentId: assessment.assessmentId,
    context: assessment.context,
    payload: {
      recommendation: assessment.recommendation,
      confidence: assessment.confidence,
      decidedStatus: r.decidedStatus,
      overrideReason: r.overrideReason ?? null,
      ruleSetVersion: assessment.ruleSetVersion,
      firedRuleIds: assessment.evidence.map((e) => e.ruleId),
    },
    recordedAt: new Date().toISOString(),
  });
}

/** Record the eventual payer result for a confirmed status (denied/upheld). */
export function recordPayerOutcome(
  assessmentId: string,
  context: DispositionAssessment['context'],
  outcome: { status: 'paid' | 'denied' | 'downgraded' | 'appealed_upheld' | 'appealed_lost'; notes?: string },
): Promise<void> {
  return emit({
    stream: 'disposition-feedback',
    kind: 'payer_outcome',
    assessmentId,
    context,
    payload: outcome,
    recordedAt: new Date().toISOString(),
  });
}

/** Record actual vs expected LOS at discharge — tunes the baseline tables. */
export function recordLOSOutcome(
  assessmentId: string,
  tag: LOSVarianceTag,
  actualMidnightsAtDischarge: number,
): Promise<void> {
  return emit({
    stream: 'disposition-feedback',
    kind: 'los_outcome',
    assessmentId,
    context: tag.context,
    payload: {
      expectedMidnights: tag.expectedMidnights,
      actualMidnights: actualMidnightsAtDischarge,
      varianceMidnights: actualMidnightsAtDischarge - tag.expectedMidnights,
    },
    recordedAt: new Date().toISOString(),
  });
}
