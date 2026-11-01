-- ----------------------------------------------------------------------------
-- MEYALO 014: RETENTION
-- Applies the retention table in docs/product-decisions.md ("Spec: accounts"),
-- written without a lawyer and to be reviewed when one is available:
--   deletion records   3 years after the deletion
--   event reports      12 months after they were sent (reports have no
--                      "closed" state to count from)
--   event suggestions  12 months after the decision; one that became an
--                      event stays as its provenance, without the
--                      submitter's note
-- Inactive accounts (24 months, warned by email first) wait for an email
-- provider and are not handled here.
-- Runs daily with pg_cron. Tested by supabase/tests/11_retention.test.sql.
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.apply_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deletions INTEGER;
  reports INTEGER;
  suggestions INTEGER;
  notes INTEGER;
BEGIN
  DELETE FROM public.account_deletions
  WHERE deleted_at < now() - interval '3 years';
  GET DIAGNOSTICS deletions = ROW_COUNT;

  DELETE FROM public.reports
  WHERE created_at < now() - interval '12 months';
  GET DIAGNOSTICS reports = ROW_COUNT;

  -- The decision is the last change of a decided suggestion.
  DELETE FROM public.submissions AS s
  WHERE s.status <> 'under_review'
    AND s.updated_at < now() - interval '12 months'
    AND NOT EXISTS (
      SELECT 1 FROM public.events AS e WHERE e.source_submission_id = s.id
    );
  GET DIAGNOSTICS suggestions = ROW_COUNT;

  UPDATE public.submissions AS s
  SET note = NULL
  WHERE s.status <> 'under_review'
    AND s.updated_at < now() - interval '12 months'
    AND s.note IS NOT NULL;
  GET DIAGNOSTICS notes = ROW_COUNT;

  RETURN jsonb_build_object(
    'deletion_records', deletions,
    'reports', reports,
    'suggestions', suggestions,
    'suggestion_notes', notes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_retention() TO service_role;

-- Daily at 03:17 UTC (04:17 in Cameroon), replacing any earlier schedule.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'meyalo-retention';
SELECT cron.schedule('meyalo-retention', '17 3 * * *', 'SELECT public.apply_retention()');
