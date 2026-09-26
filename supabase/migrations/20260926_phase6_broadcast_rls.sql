-- =============================================================================
-- Phase 6–8 support: RLS for broadcast_notifications + notifications admin read
-- Broadcast fan-out remains in the user-app dispatcher (ADMIN_BROADCAST_TOKEN).
-- Admin app only inserts/updates pending broadcast rows via JWT + RLS.
-- =============================================================================

ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS broadcast_notifications_admin_select ON public.broadcast_notifications;
CREATE POLICY broadcast_notifications_admin_select
  ON public.broadcast_notifications
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS broadcast_notifications_admin_insert ON public.broadcast_notifications;
CREATE POLICY broadcast_notifications_admin_insert
  ON public.broadcast_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_superadmin());

DROP POLICY IF EXISTS broadcast_notifications_admin_update ON public.broadcast_notifications;
CREATE POLICY broadcast_notifications_admin_update
  ON public.broadcast_notifications
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_superadmin()
    AND dispatched_at IS NULL
  )
  WITH CHECK (public.is_platform_superadmin());

-- Admins may count fan-out rows (no insert from admin app)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_admin_select ON public.notifications;
CREATE POLICY notifications_admin_select
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

GRANT SELECT, INSERT, UPDATE ON public.broadcast_notifications TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;
