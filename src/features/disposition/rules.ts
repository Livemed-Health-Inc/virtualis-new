/**
 * Virtualis Disposition Module — rule definitions.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 *
 * Original, configurable rule content. Weights and thresholds are facility-tunable
 * configuration (trade secret), not hard clinical claims. No licensed criteria
 * (InterQual/MCG) content is embedded or reproduced.
 */

import type { DispositionEvidence, DispositionInput } from './types';

export const RULE_SET_VERSION = 'vds-rules-0.1.0';

export interface DispositionRule {
  id: string;
  label: string;
  supports: 'inpatient' | 'observation';
  weight: number;
  /** Returns evidence when the rule fires, null when it does not apply. */
  evaluate: (input: DispositionInput) => DispositionEvidence | null;
  /** Input fields this rule needs — used to compute missingData. */
  requires: string[];
}

const ev = (
  rule: Pick<DispositionRule, 'id' | 'label' | 'supports' | 'weight'>,
  rationale: string,
  observed: Record<string, string | number | boolean>,
  dataSource: DispositionEvidence['dataSource'],
): DispositionEvidence => ({
  ruleId: rule.id,
  label: rule.label,
  supports: rule.supports,
  weight: rule.weight,
  rationale,
  observed,
  dataSource,
});

/** Facility-tunable thresholds. Ship defaults; override per deployment. */
export interface RuleThresholds {
  hypoxiaSpo2: number;
  tachycardiaHr: number;
  hypotensionSbp: number;
  tachypneaRr: number;
  feverTempC: number;
  troponinElevatedNgMl: number;
  lactateElevatedMmolL: number;
  akiCreatinineRatio: number;
  severeHyponatremiaMEqL: number;
  significantAnemiaGdl: number;
}

export const DEFAULT_THRESHOLDS: RuleThresholds = {
  hypoxiaSpo2: 90,
  tachycardiaHr: 120,
  hypotensionSbp: 90,
  tachypneaRr: 24,
  feverTempC: 38.3,
  troponinElevatedNgMl: 0.04,
  lactateElevatedMmolL: 2.0,
  akiCreatinineRatio: 1.5,
  severeHyponatremiaMEqL: 125,
  significantAnemiaGdl: 7.0,
};

export function buildRules(t: RuleThresholds = DEFAULT_THRESHOLDS): DispositionRule[] {
  return [
    /* ── Inpatient-supporting: objective instability ─────────────────────── */
    {
      id: 'hypoxia_room_air',
      label: 'Hypoxia on room air',
      supports: 'inpatient',
      weight: 0.30,
      requires: ['vitals.spo2'],
      evaluate(i) {
        const v = i.vitals;
        if (v?.spo2 == null) return null;
        if (v.o2Supplemented) {
          return ev(this, 'Supplemental O₂ already required — ongoing oxygen need expected to span midnights.',
            { spo2: v.spo2, o2Supplemented: true }, 'vitals');
        }
        return v.spo2 < t.hypoxiaSpo2
          ? ev(this, `SpO₂ ${v.spo2}% on room air is below the ${t.hypoxiaSpo2}% threshold.`,
              { spo2: v.spo2 }, 'vitals')
          : null;
      },
    },
    {
      id: 'hemodynamic_instability',
      label: 'Hemodynamic instability',
      supports: 'inpatient',
      weight: 0.30,
      requires: ['vitals.sbp', 'vitals.hr'],
      evaluate(i) {
        const v = i.vitals;
        if (v?.sbp == null && v?.hr == null) return null;
        const hypo = v?.sbp != null && v.sbp < t.hypotensionSbp;
        const tachy = v?.hr != null && v.hr > t.tachycardiaHr;
        if (!hypo && !tachy) return null;
        return ev(this,
          [hypo ? `SBP ${v?.sbp} < ${t.hypotensionSbp}` : null, tachy ? `HR ${v?.hr} > ${t.tachycardiaHr}` : null]
            .filter(Boolean).join('; ') + ' — instability unlikely to resolve within one midnight.',
          { sbp: v?.sbp ?? 'n/a', hr: v?.hr ?? 'n/a' }, 'vitals');
      },
    },
    {
      id: 'rising_troponin',
      label: 'Elevated/rising troponin',
      supports: 'inpatient',
      weight: 0.28,
      requires: ['labs.troponinNgMl'],
      evaluate(i) {
        const l = i.labs;
        if (l?.troponinNgMl == null) return null;
        if (l.troponinNgMl <= t.troponinElevatedNgMl) return null;
        const rising = l.troponinTrend === 'rising';
        return ev(this,
          `Troponin ${l.troponinNgMl} ng/mL${rising ? ' and rising' : ''} — serial testing, telemetry, and cardiology management anticipated beyond two midnights.`,
          { troponin: l.troponinNgMl, trend: l.troponinTrend ?? 'single' }, 'labs');
      },
    },
    {
      id: 'elevated_lactate',
      label: 'Elevated lactate',
      supports: 'inpatient',
      weight: 0.22,
      requires: ['labs.lactateMmolL'],
      evaluate(i) {
        const l = i.labs?.lactateMmolL;
        if (l == null) return null;
        return l >= t.lactateElevatedMmolL
          ? ev(this, `Lactate ${l} mmol/L ≥ ${t.lactateElevatedMmolL} — hypoperfusion workup and resuscitation expected.`,
              { lactate: l }, 'labs')
          : null;
      },
    },
    {
      id: 'acute_kidney_injury',
      label: 'Acute kidney injury vs baseline',
      supports: 'inpatient',
      weight: 0.18,
      requires: ['labs.creatinineMgDl', 'labs.baselineCreatinineMgDl'],
      evaluate(i) {
        const l = i.labs;
        if (l?.creatinineMgDl == null || l?.baselineCreatinineMgDl == null || l.baselineCreatinineMgDl <= 0) return null;
        const ratio = l.creatinineMgDl / l.baselineCreatinineMgDl;
        return ratio >= t.akiCreatinineRatio
          ? ev(this, `Creatinine ${l.creatinineMgDl} is ${ratio.toFixed(1)}× baseline — AKI management expected to span midnights.`,
              { creatinine: l.creatinineMgDl, baseline: l.baselineCreatinineMgDl }, 'labs')
          : null;
      },
    },
    {
      id: 'failed_outpatient_therapy',
      label: 'Failed outpatient therapy',
      supports: 'inpatient',
      weight: 0.20,
      requires: ['attested.failedOutpatientTherapy'],
      evaluate(i) {
        return i.attested?.failedOutpatientTherapy
          ? ev(this, 'Clinician attests outpatient management already failed — escalation of care is the plan.',
              { failedOutpatientTherapy: true }, 'clinician_attestation')
          : null;
      },
    },
    {
      id: 'iv_therapy_required',
      label: 'Ongoing IV therapy required',
      supports: 'inpatient',
      weight: 0.16,
      requires: ['attested.activeIvTherapyRequired'],
      evaluate(i) {
        return i.attested?.activeIvTherapyRequired
          ? ev(this, 'Continuous/scheduled IV therapy that cannot be completed within one midnight.',
              { activeIvTherapyRequired: true }, 'clinician_attestation')
          : null;
      },
    },
    {
      id: 'physician_2mn_expectation',
      label: 'Physician two-midnight expectation',
      supports: 'inpatient',
      weight: 0.35,
      requires: ['attested.physicianTwoMidnightExpectation'],
      evaluate(i) {
        return i.attested?.physicianTwoMidnightExpectation === true
          ? ev(this, 'The treating physician expects medically necessary hospital care to span two or more midnights (CMS Two-Midnight benchmark).',
              { physicianTwoMidnightExpectation: true }, 'clinician_attestation')
          : null;
      },
    },

    /* ── Observation-supporting: short-horizon workups ───────────────────── */
    {
      id: 'stable_vitals',
      label: 'Stable vital signs',
      supports: 'observation',
      weight: 0.18,
      requires: ['vitals.hr', 'vitals.sbp', 'vitals.spo2'],
      evaluate(i) {
        const v = i.vitals;
        if (v?.hr == null || v?.sbp == null || v?.spo2 == null) return null;
        const stable =
          v.hr <= t.tachycardiaHr && v.sbp >= t.hypotensionSbp &&
          (v.spo2 >= t.hypoxiaSpo2 && !v.o2Supplemented) &&
          (v.rr == null || v.rr <= t.tachypneaRr);
        return stable
          ? ev(this, 'Vitals within stable ranges on room air — consistent with a < 2-midnight observation window.',
              { hr: v.hr, sbp: v.sbp, spo2: v.spo2 }, 'vitals')
          : null;
      },
    },
    {
      id: 'short_horizon_workup',
      label: 'Protocolized short-stay workup',
      supports: 'observation',
      weight: 0.22,
      requires: ['consultReason'],
      evaluate(i) {
        const text = (i.consultReason ?? '').toLowerCase();
        if (!text) return null;
        const shortStay = ['rule out', 'r/o', 'serial troponin', 'syncope workup', 'obs protocol', 'chest pain protocol'];
        const hit = shortStay.find((k) => text.includes(k));
        return hit
          ? ev(this, `Consult describes a protocolized short-horizon workup (“${hit}”) typically completed within one midnight.`,
              { phrase: hit }, 'consult_text')
          : null;
      },
    },
    {
      id: 'physician_not_2mn',
      label: 'Physician does not expect two midnights',
      supports: 'observation',
      weight: 0.30,
      requires: ['attested.physicianTwoMidnightExpectation'],
      evaluate(i) {
        return i.attested?.physicianTwoMidnightExpectation === false
          ? ev(this, 'Treating physician does not expect care to span two midnights — observation is the presumptive status.',
              { physicianTwoMidnightExpectation: false }, 'clinician_attestation')
          : null;
      },
    },
  ];
}
