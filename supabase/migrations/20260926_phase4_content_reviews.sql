-- =============================================================================
-- Phase 4 — content_reviews: status, post link, updated_at
-- Necessary: original table has only
--   id, user_id, title, review_date, feedback, score, created_at
-- No status / post_id / updated_at. INSERT trigger for notifications stays unchanged.
-- =============================================================================

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'gepubliceerd';

ALTER TABLE public.content_reviews
  DROP CONSTRAINT IF EXISTS content_reviews_status_check;

ALTER TABLE public.content_reviews
  ADD CONSTRAINT content_reviews_status_check
  CHECK (status IN ('concept', 'gepubliceerd', 'gearchiveerd'));

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.posts (id) ON DELETE SET NULL;

ALTER TABLE public.content_reviews
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_content_reviews_status_date
  ON public.content_reviews (status, review_date DESC);

CREATE INDEX IF NOT EXISTS idx_content_reviews_post_id
  ON public.content_reviews (post_id)
  WHERE post_id IS NOT NULL;

-- Keep updated_at fresh on edits (reuse public.set_updated_at from phase 0 if present)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_reviews_updated_at ON public.content_reviews;
CREATE TRIGGER trg_content_reviews_updated_at
  BEFORE UPDATE ON public.content_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN public.content_reviews.status IS
  'Admin workflow. User app currently lists all rows; prefer gepubliceerd for live reviews.';

COMMENT ON COLUMN public.content_reviews.post_id IS
  'Optional link to a posts row for context. Notification trigger does not require it.';
