-- =============================================================================
-- Support: admin-initiated outreach + source column
-- Does not delete tickets. Run manually in Supabase SQL editor.
-- =============================================================================

ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'user';

ALTER TABLE public.support_messages
  DROP CONSTRAINT IF EXISTS support_messages_source_check;

ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_source_check
  CHECK (source IN ('user', 'admin_initiated'));

COMMENT ON COLUMN public.support_messages.source IS
  'user = gebruiker startte; admin_initiated = Social Core benaderde de gebruiker.';

CREATE INDEX IF NOT EXISTS idx_support_messages_source_created
  ON public.support_messages (source, created_at DESC);

-- Admins may create tickets (outreach) and human conversations
DROP POLICY IF EXISTS support_messages_admin_insert ON public.support_messages;
CREATE POLICY support_messages_admin_insert
  ON public.support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_platform_role(ARRAY['superadmin', 'support'])
  );

DROP POLICY IF EXISTS support_conversations_admin_insert ON public.support_conversations;
CREATE POLICY support_conversations_admin_insert
  ON public.support_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_platform_role(ARRAY['superadmin', 'support'])
  );

GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT SELECT, INSERT ON public.support_conversation_messages TO authenticated;

-- Allow admins to create in-app notifications (outreach + fallback)
DROP POLICY IF EXISTS notifications_admin_insert ON public.notifications;
CREATE POLICY notifications_admin_insert
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

GRANT INSERT ON public.notifications TO authenticated;
