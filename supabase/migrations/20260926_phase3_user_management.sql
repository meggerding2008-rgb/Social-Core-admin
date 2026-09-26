-- =============================================================================
-- Phase 3 — user management: account_status + admin RLS for users/usage
-- Necessary: no existing blocked/active flag on public.users.
-- Does not remove accounts; non-destructive admin workflow only.
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_account_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active', 'blocked'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_account_status
  ON public.users (account_status);

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON public.users (created_at DESC);

COMMENT ON COLUMN public.users.account_status IS
  'Platform account flag for admin.socialcore.nl; mirrored with Auth ban on block/unblock.';

-- Admins may update user profile / account_status (field limits enforced in app)
DROP POLICY IF EXISTS users_admin_update ON public.users;
CREATE POLICY users_admin_update
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- usage: enable RLS; users read own; admins read all
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_select_own ON public.usage;
CREATE POLICY usage_select_own
  ON public.usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS usage_admin_select ON public.usage;
CREATE POLICY usage_admin_select
  ON public.usage
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());
