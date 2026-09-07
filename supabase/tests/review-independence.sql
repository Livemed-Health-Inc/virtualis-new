-- Reviewer-independence regression test for the Clinical Review console.
-- Run by src/lib/modellab/review.db.test.ts, which provisions the three
-- synthetic reviewer accounts referenced below and removes them afterwards.
-- Everything this script writes is rolled back; no PHI is involved.
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO public.user_roles (user_id, role) VALUES
  (:'a', 'clinical_reviewer'),
  (:'b', 'clinical_reviewer'),
  (:'c', 'clinical_reviewer')
ON CONFLICT DO NOTHING;

INSERT INTO public.review_cases
  (id, decision_id, use_case, message_text, predicted_acuity, confidence, probabilities, reason_codes, model_version, state)
VALUES
  ('dddddddd-0000-4000-8000-000000000001','dddddddd-0000-4000-8000-0000000000a1','clinical_message','Synthetic: mild ankle swelling after a long flight.','medium',0.31,'{"low":0.3,"medium":0.4,"high":0.3}','{}','m-test','pending'),
  ('dddddddd-0000-4000-8000-000000000002','dddddddd-0000-4000-8000-0000000000a2','clinical_message','Synthetic: sore throat for two days, no fever.','low',0.32,'{"low":0.6,"medium":0.3,"high":0.1}','{}','m-test','pending');

CREATE OR REPLACE FUNCTION pg_temp.act_as(_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.check(_name text, _ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF _ok THEN RAISE NOTICE 'ok  - %', _name;
  ELSE RAISE EXCEPTION 'FAIL - %', _name; END IF;
END $$;

-- 1. Reviewer A records the first verdict.
SELECT pg_temp.act_as(:'a');
SELECT submit_review_verdict('dddddddd-0000-4000-8000-000000000001','high',false,'UNDER_TRIAGED');
RESET ROLE;

SELECT pg_temp.check('first verdict leaves final_acuity null',
  (SELECT final_acuity IS NULL AND label_quality = 'single_reviewed' AND state = 'single_reviewed'
     FROM public.review_cases WHERE id='dddddddd-0000-4000-8000-000000000001'));

-- 2. Reviewer B's queue row for that case carries no trace of A's answer.
SELECT pg_temp.act_as(:'b');
SELECT pg_temp.check('queue row hides the first verdict',
  (SELECT bool_and(
      (to_jsonb(q) - 'message_text' - 'predicted_acuity' - 'probabilities')::text NOT LIKE '%high%'
      AND q.final_acuity IS NULL)
     FROM review_queue() q WHERE q.id='dddddddd-0000-4000-8000-000000000001'));
SELECT pg_temp.check('case is still offered to reviewer B',
  (SELECT count(*)=1 FROM review_queue() q WHERE q.id='dddddddd-0000-4000-8000-000000000001'));

-- 3. Direct table read as reviewer B cannot reach the unjudged case.
SELECT pg_temp.check('direct table read hides an unjudged case',
  (SELECT count(*)=0 FROM public.review_cases WHERE id='dddddddd-0000-4000-8000-000000000001'));

-- 4. Agreement resolves the case; it leaves every queue.
SELECT submit_review_verdict('dddddddd-0000-4000-8000-000000000001','high',false,'UNDER_TRIAGED');
RESET ROLE;
SELECT pg_temp.check('agreement yields expert_reviewed with a final label',
  (SELECT state='expert_reviewed' AND label_quality='expert_reviewed' AND final_acuity='high'
     FROM public.review_cases WHERE id='dddddddd-0000-4000-8000-000000000001'));

SELECT pg_temp.act_as(:'c');
SELECT pg_temp.check('resolved case is not queued to a third reviewer',
  (SELECT count(*)=0 FROM review_queue() q WHERE q.id='dddddddd-0000-4000-8000-000000000001'));
RESET ROLE;

-- 5. Reviewers who judged a case can still read its resolved outcome.
SELECT pg_temp.act_as(:'a');
SELECT pg_temp.check('a judging reviewer reads the resolved case',
  (SELECT final_acuity='high' FROM public.review_cases WHERE id='dddddddd-0000-4000-8000-000000000001'));
RESET ROLE;

-- 6. Disagreement stays unlabelled, then adjudication produces the final label.
SELECT pg_temp.act_as(:'a');
SELECT submit_review_verdict('dddddddd-0000-4000-8000-000000000002','low',true,'AGREE_WITH_MODEL');
RESET ROLE;
SELECT pg_temp.act_as(:'b');
SELECT submit_review_verdict('dddddddd-0000-4000-8000-000000000002','high',false,'UNDER_TRIAGED');
RESET ROLE;
SELECT pg_temp.check('disagreement carries no label',
  (SELECT state='disagreement' AND label_quality IS NULL AND final_acuity IS NULL
     FROM public.review_cases WHERE id='dddddddd-0000-4000-8000-000000000002'));

SELECT pg_temp.act_as(:'c');
SELECT pg_temp.check('disagreement is queued for adjudication',
  (SELECT count(*)=1 FROM review_queue() q WHERE q.id='dddddddd-0000-4000-8000-000000000002'));
SELECT submit_review_verdict('dddddddd-0000-4000-8000-000000000002','medium',false,'AMBIGUOUS_TEXT');
SELECT pg_temp.check('an adjudicator never sees another reviewer''s verdict row',
  (SELECT count(*)=1 FROM public.review_verdicts WHERE case_id='dddddddd-0000-4000-8000-000000000002'));
RESET ROLE;
SELECT pg_temp.check('adjudication produces the adjudicator label',
  (SELECT state='adjudicated' AND label_quality='adjudicated' AND final_acuity='medium'
     FROM public.review_cases WHERE id='dddddddd-0000-4000-8000-000000000002'));

ROLLBACK;
