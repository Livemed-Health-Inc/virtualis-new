/**
 * Virtualis Disposition Module — core types.
 *
 * © 2026 Virtualis Technologies / Livemed Health Inc. Proprietary & confidential.
 * Embodies the governed-encounter architecture: every assessment is bound to a
 * communication context (consult thread + patient) and resolves through an
 * obligation that gates encounter closure. Advisory clinical decision support —
 * the physician always makes the status determination.
 *
 * NOTE: Contains no InterQual/MCG content. Rule logic derives from public
 * CMS Two-Midnight guidance plus original, configurable risk-factor rules.
 */

/** Dual-identity context binding (patient AND thread must both match). */
export interface DispositionContextRef {
  patientId: string;
  mrn?: string;
  threadId: string;
  consultId: string;
  facilityId?: string;
  /** Actor who triggered evaluation (consult author). */
  actorId: string;
  actorRole: ClinicalRole;
}

export type ClinicalRole =
  | 'physician'
  | 'app' // advanced practice provider
  | 'nurse'
  | 'case_manager'
  | 'system';

/** Where the consult originated — gates whether the indicator fires at all. */
export type ConsultOrigin =
  | 'ed' // emergency department, disposition undetermined
  | 'direct_admission' // clinic/transfer requesting a bed
  | 'inpatient' // consult on an already-admitted patient
  | 'outpatient'
  | 'telehealth'
  | 'unknown';

/** ADT patient class at the moment of consult creation. */
export type PatientClass =
  | 'emergency'
  | 'observation'
  | 'inpatient'
  | 'outpatient'
  | 'preadmit'
  | 'unknown';

export type StatusRecommendation =
  | 'meets_inpatient'
  | 'meets_observation'
  | 'insufficient_data'
  | 'not_applicable';

/** Minimal structured inputs. Everything optional — missing data degrades
 *  gracefully to `insufficient_data` rather than guessing. */
export interface DispositionInput {
  context: DispositionContextRef;
  origin: ConsultOrigin;
  patientClass: PatientClass;
  /** Free-text reason for consult (used only for keyword risk hints). */
  consultReason?: string;
  /** Optional condition category key for LOS expectation (see los.ts). */
  conditionCategory?: string;
  age?: number;
  vitals?: {
    hr?: number;
    sbp?: number;
    dbp?: number;
    rr?: number;
    spo2?: number; // on room air unless o2Supplemented
    o2Supplemented?: boolean;
    tempC?: number;
  };
  labs?: {
    troponinNgMl?: number;
    troponinTrend?: 'rising' | 'falling' | 'flat' | 'single';
    lactateMmolL?: number;
    wbcK?: number;
    creatinineMgDl?: number;
    baselineCreatinineMgDl?: number;
    sodiumMEqL?: number;
    hemoglobinGdl?: number;
  };
  /** Clinician-attested facts (checkbox-style at consult creation). */
  attested?: {
    failedOutpatientTherapy?: boolean;
    activeIvTherapyRequired?: boolean;
    telemetryRequired?: boolean;
    highRiskComorbidity?: boolean;
    alteredMentalStatus?: boolean;
    unableToToleratePo?: boolean;
    /** Physician expects care to span two or more midnights. */
    physicianTwoMidnightExpectation?: boolean | null;
  };
  payer?: 'medicare' | 'medicare_advantage' | 'commercial' | 'medicaid' | 'self_pay' | 'unknown';
  evaluatedAt?: string; // ISO8601; defaults to now
}

/** One fired rule with its provenance — the unit CM and auditors read. */
export interface DispositionEvidence {
  ruleId: string;
  label: string;
  rationale: string;
  /** Which direction this evidence pushes. */
  supports: 'inpatient' | 'observation';
  weight: number; // 0..1 contribution
  /** Source values that fired the rule, for display + audit. */
  observed: Record<string, string | number | boolean>;
  dataSource: 'vitals' | 'labs' | 'clinician_attestation' | 'consult_text' | 'derived';
}

export interface DispositionAssessment {
  assessmentId: string;
  context: DispositionContextRef;
  recommendation: StatusRecommendation;
  /** 0..1; rendered as a bar, never as false precision. */
  confidence: number;
  evidence: DispositionEvidence[];
  /** Inputs that were missing and would most change the answer. */
  missingData: string[];
  twoMidnightExpectation: 'expected' | 'not_expected' | 'indeterminate';
  payerNote?: string;
  ruleSetVersion: string;
  evaluatedAt: string;
  disclaimer: string;
}

/** Obligation node — the consult cannot close while this is unresolved.
 *  Mirrors the ObligationNode of the governed-transaction architecture. */
export interface DispositionObligation {
  nodeId: string;
  type: 'disposition';
  context: DispositionContextRef;
  assessmentId: string;
  state: 'open' | 'confirmed' | 'overridden' | 'waived';
  requiredBy: string; // ISO8601 time-to-breach
  clinicalRisk: number; // ordering key for the documentation-debt queue
  resolution?: DispositionResolution;
}

export interface DispositionResolution {
  decidedStatus: 'inpatient' | 'observation' | 'discharge' | 'transfer';
  decidedBy: string; // actorId — must be physician/app per authority rules
  decidedByRole: ClinicalRole;
  agreesWithRecommendation: boolean;
  overrideReason?: string; // required when overriding
  decidedAt: string;
}

/* ───────────────────────── LOS expectation & variance ──────────────────── */

export type LOSBand = 'lt_2_midnights' | '2_3_midnights' | '4_plus_midnights';

export interface LOSExpectation {
  context: DispositionContextRef;
  conditionCategory: string;
  expectedMidnights: number;
  band: LOSBand;
  basis: string[]; // which modifiers adjusted the baseline
  setAt: string;
  ruleSetVersion: string;
}

export type LOSVarianceState = 'on_track' | 'approaching' | 'exceeding';

/** The point-of-care physician tag: expected vs not. */
export interface LOSVarianceTag {
  context: DispositionContextRef;
  state: LOSVarianceState;
  expectedMidnights: number;
  elapsedMidnights: number;
  /** Physicians to notify (attending + consultant) when exceeding. */
  tagPhysicianIds: string[];
  message: string;
  evaluatedAt: string;
}

/* ───────────────────────── Segregated feedback stream ──────────────────── */

/** Feedback NEVER writes into clinical documentation — separate stream only. */
export interface DispositionFeedbackEvent {
  stream: 'disposition-feedback';
  kind: 'confirm' | 'override' | 'payer_outcome' | 'los_outcome';
  assessmentId: string;
  context: DispositionContextRef;
  payload: Record<string, unknown>;
  recordedAt: string;
}

export const DISPOSITION_DISCLAIMER =
  'Advisory decision support only. Status determination is a physician decision; ' +
  'review the evidence and confirm or override. Not a utilization-review criteria product.';
