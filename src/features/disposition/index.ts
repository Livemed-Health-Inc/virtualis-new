/**
 * Virtualis Disposition Module — public API.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 *
 * Self-contained feature package: copy `src/features/disposition/` into any
 * Virtualis app (Chat, Note, combined canvas). Only external dependencies are
 * React, lucide-react, and the shadcn ui primitives (popover, progress, button).
 */

export * from './types';
export {
  shouldEvaluateDisposition,
  evaluateDisposition,
  createDispositionObligation,
  resolveDispositionObligation,
  type EvaluateOptions,
  type ResolutionError,
} from './engine';
export { buildRules, DEFAULT_THRESHOLDS, RULE_SET_VERSION, type DispositionRule, type RuleThresholds } from './rules';
export {
  estimateLOS,
  evaluateLOSVariance,
  elapsedMidnights,
  bandFor,
  DEFAULT_LOS_BASELINES,
  DEFAULT_LOS_MODIFIERS,
  LOS_RULE_SET_VERSION,
  type LOSModifierConfig,
  type VarianceOptions,
} from './los';
export {
  registerFeedbackSink,
  recordResolution,
  recordPayerOutcome,
  recordLOSOutcome,
  type FeedbackSink,
} from './feedback';
export { useDisposition, type UseDispositionResult } from './hooks/useDisposition';
export { StatusChip, type StatusChipProps } from './components/StatusChip';
export { StatusEvidencePanel, type StatusEvidencePanelProps } from './components/StatusEvidencePanel';
export { LOSExpectationTag, LOSVarianceChip, type LOSVarianceTagProps } from './components/LOSTag';
