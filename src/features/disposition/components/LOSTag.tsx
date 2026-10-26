/**
 * LOSTag — point-of-care "LOS expected vs not" indicator.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 *
 * Two render modes:
 *  - expectation mode (at consult creation): "Expected LOS: 3 midnights"
 *  - variance mode (during stay): on-track / approaching / exceeding, with the
 *    physician-tag affordance when the stay deviates from expectation.
 */

import { CalendarClock, CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import type { LOSExpectation, LOSVarianceTag } from "../types";

export function LOSExpectationTag({ expectation }: { expectation: LOSExpectation }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
      title={`Basis: ${expectation.basis.join(" · ")}`}
    >
      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
      Expected LOS: {expectation.expectedMidnights}{" "}
      {expectation.expectedMidnights === 1 ? "midnight" : "midnights"}
    </span>
  );
}

const VARIANCE_STYLE = {
  on_track: {
    icon: CheckCircle2,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    label: "LOS on track",
  },
  approaching: {
    icon: Clock3,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    label: "LOS approaching",
  },
  exceeding: {
    icon: TriangleAlert,
    className: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
    label: "LOS exceeding",
  },
} as const;

export interface LOSVarianceTagProps {
  tag: LOSVarianceTag;
  /** Called when the clinician taps the chip on a deviating stay — host opens
   *  the tagged-physician action (notify attending, document barrier). */
  onTagPhysicians?: (tag: LOSVarianceTag) => void;
}

export function LOSVarianceChip({ tag, onTagPhysicians }: LOSVarianceTagProps) {
  const style = VARIANCE_STYLE[tag.state];
  const Icon = style.icon;
  const actionable = tag.state !== "on_track" && onTagPhysicians;

  return (
    <button
      type="button"
      disabled={!actionable}
      onClick={actionable ? () => onTagPhysicians(tag) : undefined}
      title={tag.message}
      aria-label={tag.message}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${style.className} ${
        actionable ? "cursor-pointer hover:brightness-110" : "cursor-default"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {style.label}
      <span className="tabular-nums opacity-75">
        {tag.elapsedMidnights}/{tag.expectedMidnights}
      </span>
    </button>
  );
}
