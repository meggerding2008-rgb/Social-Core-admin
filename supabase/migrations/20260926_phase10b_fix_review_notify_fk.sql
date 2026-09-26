-- =============================================================================
-- Fix content-review notifications FK failure
--
-- Root cause: notifications.related_post_id has a DEFAULT (gen_random_uuid) that
-- produces a UUID not present in posts. The review notify trigger omitted the
-- column, so DEFAULT applied → INSERT into notifications fails → review
-- INSERT/UPDATE with status=verzonden is rolled back.
--
-- Safe: does not delete content_reviews. Run manually in Supabase SQL editor.
-- =============================================================================

-- 1) Stop inventing fake post ids
ALTER TABLE public.notifications
  ALTER COLUMN related_post_id DROP DEFAULT;

ALTER TABLE public.notifications
  ALTER COLUMN related_post_id SET DEFAULT NULL;

-- 2) Notify only on verzonden; always set related_post_id = NULL explicitly
CREATE OR REPLACE FUNCTION public.notify_content_review_available()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'verzonden' THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link_url,
      link_label,
      related_post_id
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

  IF TG_OP = 'UPDATE'
    AND NEW.status = 'verzonden'
    AND COALESCE(OLD.status, '') IS DISTINCT FROM 'verzonden'
  THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link_url,
      link_label,
      related_post_id
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

COMMENT ON COLUMN public.notifications.related_post_id IS
  'Optional post link. Must be NULL or a real posts.id — never a random default.';
