-- =============================================================================
-- Website message email replies (Brevo)
-- Run manually in Supabase SQL editor after 20260927_website_messages.sql.
-- Does not modify user-app application code.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.website_message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_message_id UUID NOT NULL
    REFERENCES public.website_messages (id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  message TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status TEXT NOT NULL DEFAULT 'accepted'
    CHECK (delivery_status IN ('accepted', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_message_replies_message_sent
  ON public.website_message_replies (website_message_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_website_message_replies_admin
  ON public.website_message_replies (admin_id, sent_at DESC);

COMMENT ON TABLE public.website_message_replies IS
  'Outbound email replies to website_messages via Brevo. Admin-only.';

ALTER TABLE public.website_message_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS website_message_replies_admin_select
  ON public.website_message_replies;
CREATE POLICY website_message_replies_admin_select
  ON public.website_message_replies
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS website_message_replies_admin_insert
  ON public.website_message_replies;
CREATE POLICY website_message_replies_admin_insert
  ON public.website_message_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'support']));

-- No public/anon access. No UPDATE/DELETE for immutability of send history.

GRANT SELECT, INSERT ON public.website_message_replies TO authenticated;
GRANT ALL ON public.website_message_replies TO service_role;
