-- =============================================================================
-- Website messages (Base44 / Social Core website) + app-support source extension
-- Run manually in Supabase SQL editor.
-- Does not modify user-app application code.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. support_messages.source (add if missing, then allow website_converted)
-- Safe when 20260927_support_admin_outreach.sql was never applied.
-- Existing rows and new inserts default to 'user' (user-app compatible).
-- -----------------------------------------------------------------------------
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user';

-- Ensure default remains 'user' even if the column already existed without one
ALTER TABLE public.support_messages
  ALTER COLUMN source SET DEFAULT 'user';

-- Backfill any unexpected NULLs (defensive; column is NOT NULL after add)
UPDATE public.support_messages
SET source = 'user'
WHERE source IS NULL;

ALTER TABLE public.support_messages
  ALTER COLUMN source SET NOT NULL;

ALTER TABLE public.support_messages
  DROP CONSTRAINT IF EXISTS support_messages_source_check;

ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_source_check
  CHECK (source IN ('user', 'admin_initiated', 'website_converted'));

COMMENT ON COLUMN public.support_messages.source IS
  'user = gebruiker startte; admin_initiated = Social Core; website_converted = omgezet vanuit website_messages.';

CREATE INDEX IF NOT EXISTS idx_support_messages_source_created
  ON public.support_messages (source, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. website_messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nieuw'
    CHECK (status IN (
      'nieuw',
      'in_behandeling',
      'beantwoord',
      'gesloten'
    )),
  source TEXT NOT NULL DEFAULT 'base44_website',
  user_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
  support_ticket_id UUID REFERENCES public.support_messages (id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  replied_at TIMESTAMPTZ,
  external_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT website_messages_external_id_unique UNIQUE (external_id)
);

CREATE INDEX IF NOT EXISTS idx_website_messages_status_created
  ON public.website_messages (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_website_messages_email
  ON public.website_messages (lower(sender_email));

CREATE INDEX IF NOT EXISTS idx_website_messages_user
  ON public.website_messages (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_website_messages_assigned
  ON public.website_messages (assigned_to, created_at DESC)
  WHERE assigned_to IS NOT NULL;

COMMENT ON TABLE public.website_messages IS
  'Inbound contact messages from Social Core website / Base44. Admin-only.';

DROP TRIGGER IF EXISTS trg_website_messages_updated_at ON public.website_messages;
CREATE TRIGGER trg_website_messages_updated_at
  BEFORE UPDATE ON public.website_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. RLS — never publicly readable
-- -----------------------------------------------------------------------------
ALTER TABLE public.website_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS website_messages_admin_select ON public.website_messages;
CREATE POLICY website_messages_admin_select
  ON public.website_messages
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS website_messages_admin_update ON public.website_messages;
CREATE POLICY website_messages_admin_update
  ON public.website_messages
  FOR UPDATE
  TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'support']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'support']));

DROP POLICY IF EXISTS website_messages_admin_insert ON public.website_messages;
CREATE POLICY website_messages_admin_insert
  ON public.website_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'support']));

-- No anon/public policies. Webhook inserts use service_role (bypasses RLS).

GRANT SELECT, INSERT, UPDATE ON public.website_messages TO authenticated;
GRANT ALL ON public.website_messages TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Badge helpers (server-side via RPC, JWT + is_platform_admin)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_app_support_badge_count()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result integer;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RETURN 0;
  END IF;

  WITH open_tickets AS (
    SELECT id::text AS key
    FROM public.support_messages
    WHERE status IN ('open', 'in_behandeling')
      AND source IN ('user', 'admin_initiated', 'website_converted')
  ),
  open_convs AS (
    SELECT id::text AS key
    FROM public.support_conversations
    WHERE type = 'human'
      AND status = 'open'
  ),
  last_msg AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.sender_type,
      m.created_at
    FROM public.support_conversation_messages m
    INNER JOIN public.support_conversations c
      ON c.id = m.conversation_id
     AND c.type = 'human'
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unanswered_ticket_replies AS (
    SELECT t.id::text AS key
    FROM public.support_messages t
    WHERE t.status IN ('beantwoord', 'opgelost')
      AND t.source IN ('user', 'admin_initiated', 'website_converted')
      AND EXISTS (
        SELECT 1
        FROM public.support_conversations c
        INNER JOIN last_msg lm ON lm.conversation_id = c.id
        WHERE c.user_id = t.user_id
          AND c.type = 'human'
          AND c.status = 'open'
          AND lm.sender_type = 'user'
      )
  )
  SELECT COUNT(*)::integer INTO result
  FROM (
    SELECT key FROM open_tickets
    UNION
    SELECT key FROM open_convs
    UNION
    SELECT key FROM unanswered_ticket_replies
  ) s;

  RETURN COALESCE(result, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_web_support_badge_count()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result integer;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::integer INTO result
  FROM public.website_messages
  WHERE status IN ('nieuw', 'in_behandeling');

  RETURN COALESCE(result, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_app_support_badge_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_web_support_badge_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_app_support_badge_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_web_support_badge_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_app_support_badge_count() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_web_support_badge_count() TO service_role;

COMMENT ON FUNCTION public.admin_app_support_badge_count() IS
  'Unique actionable App support items: open tickets, open human convs, answered tickets with new user reply.';

COMMENT ON FUNCTION public.admin_web_support_badge_count() IS
  'Website messages with status nieuw or in_behandeling.';
