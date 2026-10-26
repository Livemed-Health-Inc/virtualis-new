/* Internal development-only synthetic disposition panel. Memory-only: no
   database, browser storage, notes, notifications or status/order changes. */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  evaluateLOSVariance,
  LOSExpectationTag,
  LOSVarianceChip,
  registerFeedbackSink,
  StatusChip,
  useDisposition,
  type DispositionFeedbackEvent,
} from '..';
import {
  SYNTHETIC_ACTORS,
  SYNTHETIC_FIXTURES,
  SYNTHETIC_STAY,
  SYNTHETIC_TIME_ZONE,
} from './fixtures';

export default function SyntheticDispositionPanel() {
  const [fixtureId, setFixtureId] = useState(SYNTHETIC_FIXTURES[0].id);
  const [actorId, setActorId] = useState(SYNTHETIC_ACTORS[0].id);
  const [events, setEvents] = useState<DispositionFeedbackEvent[]>([]);
  const [closed, setClosed] = useState<string | null>(null);
  const fixture = SYNTHETIC_FIXTURES.find((f) => f.id === fixtureId)!;
  const actor = SYNTHETIC_ACTORS.find((a) => a.id === actorId)!;
  const d = useDisposition(fixture.input, actor);

  useEffect(() => {
    registerFeedbackSink((e) => setEvents((x) => [...x, e]));
    return () => registerFeedbackSink(() => {});
  }, []);

  const open = d.obligation?.state === 'open';
  const select = (id: string) => {
    setFixtureId(id);
    setClosed(null);
  };

  return (
    <section
      aria-label="Synthetic disposition panel"
      className="mt-4 space-y-3 border-y border-border py-3 text-foreground"
    >
      <div>
        <h3 className="text-sm font-semibold">Disposition · synthetic · internal development only</h3>
        <p className="text-xs text-muted-foreground">
          Placeholder thresholds and LOS baselines (research, not tuned). Not clinically
          validated. Not for external demo. Does not affect this consult.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Synthetic fixture"
          value={fixtureId}
          onChange={(e) => select(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          {SYNTHETIC_FIXTURES.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select
          aria-label="Simulated clinician"
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          {SYNTHETIC_ACTORS.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </div>
      {!d.applicable || !d.assessment ? (
        <p role="status" className="text-xs text-muted-foreground">Not evaluated: {d.gateReason}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip assessment={d.assessment} obligation={d.obligation} onResolve={d.resolve} />
            {d.losExpectation && <LOSExpectationTag expectation={d.losExpectation} />}
          </div>
          {d.losExpectation && (
            <div className="flex flex-wrap items-center gap-2" aria-label="Synthetic LOS variance">
              <span className="text-xs text-muted-foreground">Variance demo ({SYNTHETIC_TIME_ZONE}):</span>
              {SYNTHETIC_STAY.checkpoints.map((now) => {
                const tag = evaluateLOSVariance(
                  d.losExpectation!,
                  SYNTHETIC_STAY.admittedAt,
                  { tagPhysicianIds: [], timeZone: SYNTHETIC_TIME_ZONE },
                  undefined,
                  now,
                );
                return tag && <LOSVarianceChip key={now} tag={tag} />;
              })}
            </div>
          )}
          <p role="status" className="text-xs text-muted-foreground">
            Feedback (memory only, separate from notes): {d.feedback} · {events.length} event(s)
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClosed(open ? 'blocked' : 'closed')}
          >
            Close synthetic consult
          </Button>
          {closed && (
            <p role="alert" className="text-xs text-muted-foreground">
              {closed === 'blocked'
                ? 'Blocked: synthetic status decision is still open.'
                : 'Synthetic consult closed (memory only).'}
            </p>
          )}
        </>
      )}
    </section>
  );
}
