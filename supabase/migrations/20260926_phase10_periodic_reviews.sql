-- =============================================================================
-- Periodic content reviews — extend content_reviews (backward-compatible)
--
-- Does NOT drop existing rows or required columns (title, review_date, feedback).
-- Status remap: gepubliceerd → verzonden, gearchiveerd → geannuleerd.
-- post_id remains optional (admin UI stops using it; not required).
--
-- Run manually in Supabase SQL editor. Do not auto-run in production.
-- =============================================================================

-- 1) New columns (all nullable except where defaults apply)
ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS period_start DATE;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS period_end DATE;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS summary TEXT;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS what_went_well TEXT;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS improvement_points TEXT;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS performance_analysis TEXT;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS recommendations TEXT;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS recommended_content_types TEXT;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS recommended_posting_frequency TEXT;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS platform_recommendations TEXT;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS conclusion TEXT;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users (id) ON DELETE SET NULL;

-- 2) Status migration (preserve rows)
UPDATE public.content_reviews
SET status = 'verzonden'
WHERE status = 'gepubliceerd';

UPDATE public.content_reviews
SET status = 'geannuleerd'
WHERE status = 'gearchiveerd';

UPDATE public.content_reviews
SET sent_at = COALESCE(sent_at, created_at)
WHERE status = 'verzonden'
  AND sent_at IS NULL;

-- Heuristic backfill for period from review_date
UPDATE public.content_reviews
SET
  period_end = COALESCE(period_end, review_date),
  period_start = COALESCE(period_start, (review_date - INTERVAL '30 days')::date)
WHERE period_end IS NULL OR period_start IS NULL;

ALTER TABLE public.content_reviews
  DROP CONSTRAINT IF EXISTS content_reviews_status_check;

ALTER TABLE public.content_reviews
  ADD CONSTRAINT content_reviews_status_check
  CHECK (status IN ('concept', 'gepland', 'verzonden', 'geannuleerd'));

-- Default for new rows
ALTER TABLE public.content_reviews
  ALTER COLUMN status SET DEFAULT 'concept';

CREATE INDEX IF NOT EXISTS idx_content_reviews_status_scheduled
  ON public.content_reviews (status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_content_reviews_user_sent
  ON public.content_reviews (user_id, sent_at DESC)
  WHERE status = 'verzonden';

CREATE INDEX IF NOT EXISTS idx_content_reviews_tier
  ON public.content_reviews (subscription_tier)
  WHERE subscription_tier IS NOT NULL;

-- 3) Users should only see sent reviews via JWT+RLS
-- (User-app support API uses service role and still needs a filter — see docs.)
DROP POLICY IF EXISTS content_reviews_select_own ON public.content_reviews;
CREATE POLICY content_reviews_select_own
  ON public.content_reviews
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'verzonden'
  );

-- 4) Notification: only when a review becomes verzonden (not on draft INSERT)
CREATE OR REPLACE FUNCTION public.notify_content_review_available()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'verzonden' THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, link_url, link_label, related_post_id
    ) VALUES (
      NEW.user_id,
      'content_review_available',
      'Nieuwe content review beschikbaar',
      'Je hebt een nieuwe content review ontvangen: ''' || NEW.title || '''.',
      '/support',
      'Bekijk review',
      NULL
    );
    RETURN NEW;
  END IF;

  -- Transition to verzonden
  IF TG_OP = 'UPDATE'
    AND NEW.status = 'verzonden'
    AND COALESCE(OLD.status, '') IS DISTINCT FROM 'verzonden'
  THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, link_url, link_label, related_post_id
    ) VALUES (
      NEW.user_id,
      'content_review_available',
      'Nieuwe content review beschikbaar',
      'Je hebt een nieuwe content review ontvangen: ''' || NEW.title || '''.',
      '/support',
      'Bekijk review',
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_review_notification_trigger ON public.content_reviews;
CREATE TRIGGER content_review_notification_trigger
  AFTER INSERT OR UPDATE OF status ON public.content_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_content_review_available();

COMMENT ON COLUMN public.content_reviews.status IS
  'concept | gepland | verzonden | geannuleerd. User-visible when verzonden.';
COMMENT ON COLUMN public.content_reviews.period_start IS
  'Start of analysed social-performance period.';
COMMENT ON COLUMN public.content_reviews.period_end IS
  'End of analysed social-performance period.';
COMMENT ON COLUMN public.content_reviews.scheduled_for IS
  'Planned send datetime (status=gepland).';
COMMENT ON COLUMN public.content_reviews.sent_at IS
  'Actual send datetime when status became verzonden.';
COMMENT ON COLUMN public.content_reviews.feedback IS
  'Legacy user-app field; admin composes from structured sections for display.';

-- Also ensure notify inserts set related_post_id NULL (see phase10b for DEFAULT drop).
