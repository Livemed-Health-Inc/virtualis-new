/**
 * StatusEvidencePanel — "why this status" evidence + physician confirm/override.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 *
 * Non-device CDS posture: the basis for the recommendation is fully displayed
 * so the clinician can independently review it; the clinician decides.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Check,
  FlaskConical,
  MessageSquare,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import type { DispositionAssessment, DispositionObligation, DispositionResolution } from "../types";
import type { ResolutionError } from "../engine";

const SOURCE_ICON = {
  vitals: Stethoscope,
  labs: FlaskConical,
  clinician_attestation: UserCheck,
  consult_text: MessageSquare,
  derived: Check,
} as const;

export interface StatusEvidencePanelProps {
  assessment: DispositionAssessment;
  obligation: DispositionObligation | null;
  /** Host supplies the actor; returns an error code when the write is rejected. */
  onResolve: (
    resolution: Omit<DispositionResolution, "decidedAt" | "agreesWithRecommendation">,
  ) => ResolutionError | null;
}

export function StatusEvidencePanel({
  assessment,
  obligation,
  onResolve,
}: StatusEvidencePanelProps) {
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState<ResolutionError | null>(null);

  const resolved = obligation?.state === "confirmed" || obligation?.state === "overridden";
  const recommendedStatus =
    assessment.recommendation === "meets_inpatient"
      ? "inpatient"
      : assessment.recommendation === "meets_observation"
        ? "observation"
        : null;

  const resolve = (decidedStatus: DispositionResolution["decidedStatus"], reason?: string) => {
    // decidedBy/decidedByRole are injected by the host via onResolve's closure
    // in most integrations; this panel passes through what it knows.
    const err = onResolve({
      decidedStatus,
      decidedBy: assessment.context.actorId,
      decidedByRole: assessment.context.actorRole,
      overrideReason: reason,
    });
    setError(err);
  };

  return (
    <div className="space-y-3 p-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Status decision support
        </div>
        <div className="mt-0.5 text-sm font-semibold">
          {assessment.recommendation === "meets_inpatient" && "Meets inpatient considerations"}
          {assessment.recommendation === "meets_observation" && "Meets observation considerations"}
          {assessment.recommendation === "insufficient_data" &&
            "Insufficient data for a recommendation"}
        </div>
        {assessment.confidence > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Progress value={assessment.confidence * 100} className="h-1.5" />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {Math.round(assessment.confidence * 100)}% heuristic rule score · not validated
              accuracy
            </span>
          </div>
        )}
        {assessment.payerNote && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">{assessment.payerNote}</p>
        )}
      </div>

      <ul className="space-y-1.5" aria-label="Evidence">
        {assessment.evidence.map((e) => {
          const Icon = SOURCE_ICON[e.dataSource] ?? Check;
          return (
            <li key={e.ruleId} className="rounded-lg border border-border bg-muted/40 p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                {e.label}
                <span
                  className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    e.supports === "inpatient"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {e.supports === "inpatient" ? "IP" : "Obs"}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{e.rationale}</p>
            </li>
          );
        })}
        {assessment.evidence.length === 0 && (
          <li className="text-xs text-muted-foreground">No rules fired on the available data.</li>
        )}
      </ul>

      {assessment.missingData.length > 0 && (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" aria-hidden />
          Would sharpen the call: {assessment.missingData.slice(0, 4).join(", ")}
          {assessment.missingData.length > 4 ? "…" : ""}
        </p>
      )}

      {!resolved && !overrideMode && (
        <div className="flex gap-2 pt-1">
          {recommendedStatus && (
            <Button size="sm" className="flex-1" onClick={() => resolve(recommendedStatus)}>
              <Check className="mr-1 h-3.5 w-3.5" /> Confirm {recommendedStatus}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setOverrideMode(true)}
          >
            {recommendedStatus ? "Override" : "Decide status"}
          </Button>
        </div>
      )}

      {!resolved && overrideMode && (
        <div className="space-y-2 pt-1">
          <textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Override reason (required — recorded for audit)"
            className="min-h-16 w-full rounded-md border border-border bg-background p-2 text-xs"
            aria-label="Override reason"
          />
          <div className="flex flex-wrap gap-2">
            {(["inpatient", "observation", "discharge", "transfer"] as const)
              .filter((s) => s !== recommendedStatus)
              .map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="secondary"
                  disabled={!overrideReason.trim()}
                  onClick={() => resolve(s, overrideReason.trim())}
                  className="capitalize"
                >
                  {s}
                </Button>
              ))}
            <Button size="sm" variant="ghost" onClick={() => setOverrideMode(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {resolved && obligation?.resolution && (
        <p className="rounded-lg bg-emerald-500/10 p-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          Status {obligation.resolution.decidedStatus} ·{" "}
          {obligation.state === "confirmed" ? "confirmed" : "overridden"} — kept in memory only.
        </p>
      )}

      {error && (
        <p className="text-[11px] font-semibold text-destructive" role="alert">
          {error === "OVERRIDE_REASON_REQUIRED" && "An override reason is required."}
          {error === "AUTH_ROLE" && "Only a physician or APP can set patient status."}
          {error === "AUTH_ACTOR" && "Decision identity does not match the bound clinician."}
          {error === "CTX_ASSESSMENT_MISMATCH" &&
            "Assessment is stale or does not match this consult."}
          {(error === "CTX_PATIENT_MISMATCH" || error === "CTX_THREAD_MISMATCH") &&
            "Context mismatch — this decision does not match the open patient/thread."}
          {error === "ALREADY_RESOLVED" && "This status decision was already recorded."}
        </p>
      )}

      <p className="border-t border-border pt-2 text-[10px] leading-snug text-muted-foreground">
        {assessment.disclaimer}
      </p>
    </div>
  );
}
