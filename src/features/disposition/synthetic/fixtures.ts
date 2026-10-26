/* Explicit synthetic fixtures for the internal development panel. Never derived
   from patient names, thread messages or a default ED classification. */
import type { ClinicalRole, DispositionInput } from '../types';

export const SYNTHETIC_TIME_ZONE = 'America/Chicago';
export const SYNTHETIC_EVALUATED_AT = '2026-01-05T15:00:00.000Z';

const ctx = (n: string) => ({
  patientId: `synthetic-patient-${n}`,
  threadId: `synthetic-thread-${n}`,
  consultId: `synthetic-consult-${n}`,
  facilityId: 'synthetic-facility',
  actorId: 'synthetic-physician-1',
  actorRole: 'physician' as ClinicalRole,
});

export const SYNTHETIC_ACTORS: { id: string; role: ClinicalRole; label: string }[] = [
  { id: 'synthetic-physician-1', role: 'physician', label: 'Bound physician (synthetic)' },
  { id: 'synthetic-physician-2', role: 'physician', label: 'Other physician (synthetic)' },
  { id: 'synthetic-nurse-1', role: 'nurse', label: 'Nurse (synthetic)' },
];

export const SYNTHETIC_FIXTURES: { id: string; label: string; input: DispositionInput }[] = [
  {
    id: 'a',
    label: 'ED · multiple risk signals',
    input: {
      context: ctx('a'),
      origin: 'ed',
      patientClass: 'emergency',
      conditionCategory: 'pneumonia',
      age: 80,
      vitals: { hr: 118, sbp: 88, rr: 26, spo2: 87, tempC: 38.9 },
      labs: { lactateMmolL: 3.1, wbcK: 17 },
      attested: { activeIvTherapyRequired: true, physicianTwoMidnightExpectation: true },
      payer: 'medicare',
      evaluatedAt: SYNTHETIC_EVALUATED_AT,
    },
  },
  {
    id: 'b',
    label: 'ED · sparse data',
    input: {
      context: ctx('b'),
      origin: 'ed',
      patientClass: 'emergency',
      evaluatedAt: SYNTHETIC_EVALUATED_AT,
    },
  },
  {
    id: 'c',
    label: 'Already admitted (gated off)',
    input: {
      context: ctx('c'),
      origin: 'inpatient',
      patientClass: 'inpatient',
      evaluatedAt: SYNTHETIC_EVALUATED_AT,
    },
  },
];

/** Fixed admission and "now" instants for the variance demonstration. */
export const SYNTHETIC_STAY = {
  admittedAt: '2026-01-05T15:00:00.000Z',
  checkpoints: [
    '2026-01-06T15:00:00.000Z',
    '2026-01-08T15:00:00.000Z',
    '2026-01-10T15:00:00.000Z',
  ],
};
