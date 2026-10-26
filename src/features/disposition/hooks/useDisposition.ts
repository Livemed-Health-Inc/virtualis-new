/**
 * Virtualis Disposition Module — React integration hook.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 *
 * Port fixes: state resets whenever the patient/thread/consult context changes;
 * resolution is bound to the current assessment and guarded against stale or
 * double submission; the deciding actor is supplied by the host, not the
 * assessment; feedback failures are surfaced rather than assumed successful.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  createDispositionObligation,
  evaluateDisposition,
  resolveDispositionObligation,
  shouldEvaluateDisposition,
  type ResolutionError,
} from "../engine";
import { estimateLOS } from "../los";
import { recordResolution } from "../feedback";
import type {
  ClinicalRole,
  DispositionAssessment,
  DispositionInput,
  DispositionObligation,
  DispositionResolution,
  LOSExpectation,
} from "../types";

export type FeedbackStatus = "idle" | "pending" | "recorded" | "failed";

export interface UseDispositionResult {
  applicable: boolean;
  gateReason: string;
  assessment: DispositionAssessment | null;
  obligation: DispositionObligation | null;
  losExpectation: LOSExpectation | null;
  feedback: FeedbackStatus;
  resolve: (
    resolution: Omit<DispositionResolution, "decidedAt" | "agreesWithRecommendation">,
  ) => ResolutionError | null;
}

const contextKey = (i: DispositionInput | null) =>
  i ? `${i.context.patientId}|${i.context.threadId}|${i.context.consultId}` : "";

export function useDisposition(
  input: DispositionInput | null,
  actor: { id: string; role: ClinicalRole } | null,
): UseDispositionResult {
  const key = contextKey(input);
  const [state, setState] = useState<{
    key: string;
    obligation: DispositionObligation | null;
    feedback: FeedbackStatus;
  }>({ key: "", obligation: null, feedback: "idle" });
  const lock = useRef<string | null>(null);

  // Inputs are re-read only when the bound context changes, never per render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bound = useMemo(() => input, [key]);
  const gate = useMemo(
    () => (bound ? shouldEvaluateDisposition(bound) : { evaluate: false, reason: "No input." }),
    [bound],
  );
  const assessment = useMemo(
    () => (bound && gate.evaluate ? evaluateDisposition(bound) : null),
    [bound, gate.evaluate],
  );
  const losExpectation = useMemo(
    () => (bound && gate.evaluate ? estimateLOS(bound) : null),
    [bound, gate.evaluate],
  );
  const fresh = useMemo(
    () => (assessment ? createDispositionObligation(assessment) : null),
    [assessment],
  );
  const current = state.key === key ? state : { key, obligation: fresh, feedback: "idle" as const };

  const resolve = useCallback<UseDispositionResult["resolve"]>(
    (resolution) => {
      const obligation = current.obligation;
      if (!assessment || !obligation || !bound || !actor) return "ALREADY_RESOLVED";
      if (lock.current === obligation.nodeId) return "ALREADY_RESOLVED";
      const result = resolveDispositionObligation(obligation, assessment, {
        ...resolution,
        decidedBy: actor.id,
        decidedByRole: actor.role,
        context: bound.context,
      });
      if (!result.ok) return result.error;
      lock.current = obligation.nodeId;
      setState({ key, obligation: result.obligation, feedback: "pending" });
      recordResolution(assessment, result.obligation).then(
        () => setState((s) => (s.key === key ? { ...s, feedback: "recorded" } : s)),
        () => setState((s) => (s.key === key ? { ...s, feedback: "failed" } : s)),
      );
      return null;
    },
    [assessment, bound, actor, current.obligation, key],
  );

  return {
    applicable: gate.evaluate,
    gateReason: gate.reason,
    assessment,
    obligation: current.obligation,
    losExpectation,
    feedback: current.feedback,
    resolve,
  };
}
