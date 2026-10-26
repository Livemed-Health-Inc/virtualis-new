import { describe, expect, it, vi } from 'vitest';
import {
  createDispositionObligation,
  elapsedMidnights,
  evaluateDisposition,
  evaluateLOSVariance,
  estimateLOS,
  recordResolution,
  registerFeedbackSink,
  resolveDispositionObligation,
  shouldEvaluateDisposition,
  type DispositionInput,
} from '.';
import { SYNTHETIC_FIXTURES, SYNTHETIC_TIME_ZONE } from './synthetic/fixtures';

const [rich, sparse, admitted] = SYNTHETIC_FIXTURES.map((f) => f.input) as [DispositionInput, DispositionInput, DispositionInput];
const setup = (input = rich) => {
  const a = evaluateDisposition(input);
  return { a, o: createDispositionObligation(a)! };
};
const by = (input = rich, over = {}) => ({
  decidedStatus: 'inpatient' as const,
  decidedBy: 'synthetic-physician-1',
  decidedByRole: 'physician' as const,
  context: input.context,
  ...over,
});

describe('disposition context gating', () => {
  it('never evaluates an already-admitted patient', () => {
    expect(shouldEvaluateDisposition(admitted).evaluate).toBe(false);
    const a = evaluateDisposition(admitted);
    expect(a.recommendation).toBe('not_applicable');
    expect(createDispositionObligation(a)).toBeNull();
  });
  it('missing data degrades to insufficient_data with zero score', () => {
    const a = evaluateDisposition(sparse);
    expect(a.recommendation).toBe('insufficient_data');
    expect(a.confidence).toBe(0);
    expect(a.missingData.length).toBeGreaterThan(0);
  });
});

describe('guarded resolution', () => {
  it('rejects patient, thread and stale assessment mismatches', () => {
    const { a, o } = setup();
    const other = { ...rich.context };
    expect(resolveDispositionObligation(o, a, by(rich, { context: { ...other, patientId: 'x' } })))
      .toEqual({ ok: false, error: 'CTX_PATIENT_MISMATCH' });
    expect(resolveDispositionObligation(o, a, by(rich, { context: { ...other, threadId: 'x' } })))
      .toEqual({ ok: false, error: 'CTX_THREAD_MISMATCH' });
    const stale = evaluateDisposition(rich); // new assessment id
    expect(resolveDispositionObligation(o, stale, by())).toEqual({ ok: false, error: 'CTX_ASSESSMENT_MISMATCH' });
    const { a: b } = setup(sparse);
    expect(resolveDispositionObligation(o, b, by())).toEqual({ ok: false, error: 'CTX_ASSESSMENT_MISMATCH' });
  });
  it('rejects double resolution', () => {
    const { a, o } = setup();
    const r = resolveDispositionObligation(o, a, by(rich, { overrideReason: 'r', decidedStatus: a.recommendation === 'meets_inpatient' ? 'inpatient' : 'observation' }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(resolveDispositionObligation(r.obligation, a, by())).toEqual({ ok: false, error: 'ALREADY_RESOLVED' });
  });
  it('enforces role, bound identity and override reason', () => {
    const { a, o } = setup();
    expect(resolveDispositionObligation(o, a, by(rich, { decidedByRole: 'nurse', decidedBy: 'synthetic-nurse-1' })))
      .toEqual({ ok: false, error: 'AUTH_ROLE' });
    expect(resolveDispositionObligation(o, a, by(rich, { decidedBy: 'synthetic-physician-2' })))
      .toEqual({ ok: false, error: 'AUTH_ACTOR' });
    expect(resolveDispositionObligation(o, a, by(rich, { decidedStatus: 'discharge' })))
      .toEqual({ ok: false, error: 'OVERRIDE_REASON_REQUIRED' });
    const s = setup(sparse);
    expect(resolveDispositionObligation(s.o, s.a, by(sparse, { decidedStatus: 'observation' })))
      .toEqual({ ok: false, error: 'OVERRIDE_REASON_REQUIRED' });
    expect(resolveDispositionObligation(o, a, by(rich, { decidedStatus: 'discharge', overrideReason: 'synthetic' })).ok)
      .toBe(true);
  });
});

describe('LOS midnights in an explicit facility zone', () => {
  const tz = SYNTHETIC_TIME_ZONE;
  it('counts facility calendar midnights, not browser or UTC', () => {
    // 23:30 and 00:30 Chicago (05:30Z / 06:30Z) straddle a facility midnight.
    expect(elapsedMidnights('2026-01-05T05:30:00Z', '2026-01-05T06:30:00Z', tz)).toBe(1);
    // 18:00 and 23:00 Chicago cross UTC midnight but not facility midnight.
    expect(elapsedMidnights('2026-01-06T00:00:00Z', '2026-01-06T05:00:00Z', tz)).toBe(0);
    expect(elapsedMidnights('2026-01-05T05:30:00Z', '2026-01-05T06:30:00Z', 'UTC')).toBe(0);
  });
  it('returns null for invalid dates, zone or reversed time; no NaN', () => {
    expect(elapsedMidnights('bad', '2026-01-05T00:00:00Z', tz)).toBeNull();
    expect(elapsedMidnights('2026-01-05T00:00:00Z', 'bad', tz)).toBeNull();
    expect(elapsedMidnights('2026-01-05T00:00:00Z', '2026-01-04T00:00:00Z', tz)).toBeNull();
    expect(elapsedMidnights('2026-01-05T00:00:00Z', '2026-01-06T00:00:00Z', 'Not/AZone')).toBeNull();
    const e = estimateLOS(rich);
    expect(evaluateLOSVariance(e, 'bad', { tagPhysicianIds: [], timeZone: tz }, undefined, '2026-01-06T00:00:00Z')).toBeNull();
  });
  it('variance boundaries around the expectation', () => {
    const e = { ...estimateLOS(rich), expectedMidnights: 2 };
    const at = (now: string) =>
      evaluateLOSVariance(e, '2026-01-05T18:00:00Z', { tagPhysicianIds: ['p'], timeZone: tz }, undefined, now)!;
    expect(at('2026-01-06T18:00:00Z').state).toBe('on_track');
    expect(at('2026-01-07T18:00:00Z').state).toBe('approaching');
    expect(at('2026-01-08T18:00:00Z').state).toBe('exceeding');
    expect(at('2026-01-06T18:00:00Z').tagPhysicianIds).toEqual([]);
  });
});

describe('feedback and external effects', () => {
  it('surfaces sink failures and makes no network calls', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    try {
      const { a, o } = setup();
      const r = resolveDispositionObligation(o, a, by(rich, { decidedStatus: 'discharge', overrideReason: 'x' }));
      if (!r.ok) throw new Error('expected ok');
      registerFeedbackSink(() => { throw new Error('sink down'); });
      await expect(recordResolution(a, r.obligation)).rejects.toThrow('sink down');
      const seen: string[] = [];
      registerFeedbackSink((e) => { seen.push(e.stream); });
      await recordResolution(a, r.obligation);
      expect(seen).toEqual(['disposition-feedback']);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      registerFeedbackSink(() => {});
      vi.unstubAllGlobals();
    }
  });
});
