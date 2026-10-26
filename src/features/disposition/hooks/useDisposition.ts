/**
 * Virtualis Disposition Module — React integration hook.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  createDispositionObligation,
  evaluateDisposition,
  resolveDispositionObligation,
  shouldEvaluateDisposition,
  type ResolutionError,
} from '../engine';
import { estimateLOS } from '../los';
import { recordResolution } from '../feedback';
import type {
  DispositionAssessment,
  DispositionInput,
  DispositionObligation,
  DispositionResolution,
  LOSExpectation,
} from '../types';

export interface UseDispositionResult {
  /** Whether the indicator should render at all for this consult. */
  applicable: boolean;
  gateReason: string;
  assessment: DispositionAssessment | null;
  obligation: DispositionObligation | null;
  losExpectation: LOSExpectation | null;
  /** Re-run evaluation (e.g., after the clinician adds attested inputs). */
  evaluate: (input: DispositionInput) => void;
  /** Physician confirms or overrides; returns error code if rejected. */
  resolve: (
    resolution: Omit<DispositionResolution, 'decidedAt' | 'agreesWithRecommendation'>,
  ) => ResolutionError | null;
}

export function useDisposition(initialInput: DispositionInput | null): UseDispositionResult {
  const [input, setInput] = useState<DispositionInput | null>(initialInput);
  const [obligation, setObligation] = useState<DispositionObligation | null>(null);
  const [resolvedOnce, setResolvedOnce] = useState(false);

  const gate = useMemo(
    () => (input ? shouldEvaluateDisposition(input) : { evaluate: false, reason: 'No input.' }),
    [input],
  );

  const assessment = useMemo(
    () => (input && gate.evaluate ? evaluateDisposition(input) : null),
    [input, gate.evaluate],
  );

  const losExpectation = useMemo(
    () => (input && gate.evaluate ? estimateLOS(input) : null),
    [input, gate.evaluate],
  );

  // Create the obligation once per assessment (unless already resolved).
  const activeObligation = useMemo(() => {
    if (!assessment || resolvedOnce) return obligation;
    if (obligation && obligation.assessmentId === assessment.assessmentId) return obligation;
    return createDispositionObligation(assessment);
  }, [assessment, obligation, resolvedOnce]);

  const evaluate = useCallback((next: DispositionInput) => {
    setInput(next);
    setObligation(null);
    setResolvedOnce(false);
  }, []);

  const resolve = useCallback(
    (
      resolution: Omit<DispositionResolution, 'decidedAt' | 'agreesWithRecommendation'>,
    ): ResolutionError | null => {
      if (!assessment || !activeObligation || !input) return 'ALREADY_RESOLVED';
      const result = resolveDispositionObligation(activeObligation, assessment, {
        ...resolution,
        context: input.context,
      });
      if (!result.ok) return result.error;
      setObligation(result.obligation);
      setResolvedOnce(true);
      void recordResolution(assessment, result.obligation);
      return null;
    },
    [assessment, activeObligation, input],
  );

  return {
    applicable: gate.evaluate,
    gateReason: gate.reason,
    assessment,
    obligation: activeObligation,
    losExpectation,
    evaluate,
    resolve,
  };
}
