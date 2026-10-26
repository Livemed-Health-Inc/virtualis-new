/**
 * StatusChip — the point-of-care disposition indicator for consult creation.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 *
 * Renders next to the acuity indicator in the consult card. Advisory only:
 * tapping opens the evidence panel; the physician confirms or overrides there.
 */

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BedDouble, Eye, HelpCircle, type LucideIcon } from 'lucide-react';
import type { DispositionAssessment, DispositionObligation } from '../types';
import { StatusEvidencePanel, type StatusEvidencePanelProps } from './StatusEvidencePanel';

const STYLES: Record<
  string,
  { label: string; icon: LucideIcon; className: string }
> = {
  meets_inpatient: {
    label: 'Meets Inpatient',
    icon: BedDouble,
    className:
      'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/15',
  },
  meets_observation: {
    label: 'Meets Obs',
    icon: Eye,
    className:
      'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15',
  },
  insufficient_data: {
    label: 'Status: more data',
    icon: HelpCircle,
    className:
      'border-border bg-muted text-muted-foreground hover:bg-muted/80',
  },
};

export interface StatusChipProps {
  assessment: DispositionAssessment;
  obligation: DispositionObligation | null;
  onResolve: StatusEvidencePanelProps['onResolve'];
}

export function StatusChip({ assessment, obligation, onResolve }: StatusChipProps) {
  if (assessment.recommendation === 'not_applicable') return null;

  const style = STYLES[assessment.recommendation];
  if (!style) return null;
  const Icon = style.icon;
  const resolved = obligation?.state === 'confirmed' || obligation?.state === 'overridden';
  const decided = obligation?.resolution?.decidedStatus;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Patient status recommendation: ${style.label}. Open evidence.`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${style.className}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {resolved && decided ? (
            <span className="capitalize">
              {decided} {obligation?.state === 'overridden' ? '· overridden' : '· confirmed'}
            </span>
          ) : (
            <>
              {style.label}
              {assessment.confidence > 0 && (
                <span className="opacity-70">score {Math.round(assessment.confidence * 100)}%</span>
              )}
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-0">
        <StatusEvidencePanel
          assessment={assessment}
          obligation={obligation}
          onResolve={onResolve}
        />
      </PopoverContent>
    </Popover>
  );
}
