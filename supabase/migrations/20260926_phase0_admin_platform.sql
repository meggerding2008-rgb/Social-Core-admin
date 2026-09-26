-- =============================================================================
-- Social Core Admin — Phase 0
-- Platform admin tables, SECURITY DEFINER helpers, RLS policies
--
-- Run in the SHARED Supabase project (same DB as the user app).
-- Does NOT modify user-app application code.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS patterns.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. admin_profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'support', 'content', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_active_role
  ON public.admin_profiles (role)
  WHERE is_active = true;

COMMENT ON TABLE public.admin_profiles IS
  'Platform admins for admin.socialcore.nl. Separate from customer team roles.';

-- -----------------------------------------------------------------------------
-- 2. admin_audit_logs (immutable append-only from app perspective)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
  ON public.admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_created
  ON public.admin_audit_logs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_resource
  ON public.admin_audit_logs (resource_type, resource_id, created_at DESC);

COMMENT ON TABLE public.admin_audit_logs IS
  'Security/audit trail for every admin mutation on admin.socialcore.nl.';

-- -----------------------------------------------------------------------------
-- 3. error_reports
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'admin'
    CHECK (source IN ('admin', 'user_app', 'api', 'cron', 'other')),
  severity TEXT NOT NULL DEFAULT 'error'
    CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'triaged', 'resolved', 'ignored')),
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  user_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
  assignee_admin_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_reports_status_created
  ON public.error_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_reports_severity_created
  ON public.error_reports (severity, created_at DESC)
  WHERE status IN ('open', 'triaged');

CREATE INDEX IF NOT EXISTS idx_error_reports_user
  ON public.error_reports (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.error_reports IS
  'Triaged error reports for Social Core admin operations.';

-- -----------------------------------------------------------------------------
-- 4. SECURITY DEFINER helpers (avoid RLS recursion on admin_profiles)
--
-- These run as the function owner and bypass RLS when reading admin_profiles.
-- Policies on admin_profiles MAY call these functions safely.
-- search_path is fixed to public to prevent search_path injection.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE user_id = auth.uid()
      AND is_active = true
      AND role = 'superadmin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_platform_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE user_id = auth.uid()
      AND is_active = true
      AND role = ANY (allowed_roles)
  );
$$;

COMMENT ON FUNCTION public.is_platform_admin() IS
  'True when the current auth.uid() is an active platform admin. SECURITY DEFINER; does not recurse via RLS.';

COMMENT ON FUNCTION public.is_platform_superadmin() IS
  'True when the current auth.uid() is an active superadmin.';

COMMENT ON FUNCTION public.has_platform_role(text[]) IS
  'True when the current auth.uid() is an active platform admin with one of the given roles.';

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_superadmin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_platform_role(text[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_platform_role(text[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_superadmin() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_platform_role(text[]) TO service_role;

-- -----------------------------------------------------------------------------
-- 5. updated_at trigger helper
-- -----------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_admin_profiles_updated_at ON public.admin_profiles;
CREATE TRIGGER trg_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_error_reports_updated_at ON public.error_reports;
CREATE TRIGGER trg_error_reports_updated_at
  BEFORE UPDATE ON public.error_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. RLS — new tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- admin_profiles --------------------------------------------------------------
-- SELECT own row OR any row if platform admin (helper bypasses RLS → no recursion)
DROP POLICY IF EXISTS admin_profiles_select ON public.admin_profiles;
CREATE POLICY admin_profiles_select
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_platform_admin()
  );

-- Only superadmins may create / change / deactivate admin rows
DROP POLICY IF EXISTS admin_profiles_insert ON public.admin_profiles;
CREATE POLICY admin_profiles_insert
  ON public.admin_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_superadmin());

DROP POLICY IF EXISTS admin_profiles_update ON public.admin_profiles;
CREATE POLICY admin_profiles_update
  ON public.admin_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_superadmin())
  WITH CHECK (public.is_platform_superadmin());

DROP POLICY IF EXISTS admin_profiles_delete ON public.admin_profiles;
CREATE POLICY admin_profiles_delete
  ON public.admin_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_platform_superadmin());

-- admin_audit_logs ------------------------------------------------------------
DROP POLICY IF EXISTS admin_audit_logs_select ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_select
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS admin_audit_logs_insert ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_insert
  ON public.admin_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    AND actor_id = auth.uid()
  );

-- No UPDATE/DELETE policies → audit rows are immutable via authenticated role

-- error_reports ---------------------------------------------------------------
DROP POLICY IF EXISTS error_reports_select ON public.error_reports;
CREATE POLICY error_reports_select
  ON public.error_reports
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS error_reports_insert ON public.error_reports;
CREATE POLICY error_reports_insert
  ON public.error_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS error_reports_update ON public.error_reports;
CREATE POLICY error_reports_update
  ON public.error_reports
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS error_reports_delete ON public.error_reports;
CREATE POLICY error_reports_delete
  ON public.error_reports
  FOR DELETE
  TO authenticated
  USING (public.is_platform_superadmin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_profiles TO authenticated;
GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.error_reports TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.error_reports TO service_role;

-- -----------------------------------------------------------------------------
-- 7. RLS — admin access on existing shared tables (additive; keeps user policies)
-- User app APIs that use service_role are unaffected (bypass RLS).
-- -----------------------------------------------------------------------------

-- users: admins may read all profiles
DROP POLICY IF EXISTS users_admin_select ON public.users;
CREATE POLICY users_admin_select
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- support_messages: admins read + update (reply / status)
DROP POLICY IF EXISTS support_messages_admin_select ON public.support_messages;
CREATE POLICY support_messages_admin_select
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS support_messages_admin_update ON public.support_messages;
CREATE POLICY support_messages_admin_update
  ON public.support_messages
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- support_conversations
DROP POLICY IF EXISTS support_conversations_admin_select ON public.support_conversations;
CREATE POLICY support_conversations_admin_select
  ON public.support_conversations
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS support_conversations_admin_update ON public.support_conversations;
CREATE POLICY support_conversations_admin_update
  ON public.support_conversations
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- support_conversation_messages: admins read + insert human replies
DROP POLICY IF EXISTS support_conversation_messages_admin_select
  ON public.support_conversation_messages;
CREATE POLICY support_conversation_messages_admin_select
  ON public.support_conversation_messages
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS support_conversation_messages_admin_insert
  ON public.support_conversation_messages;
CREATE POLICY support_conversation_messages_admin_insert
  ON public.support_conversation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    AND sender_type = 'human'
  );

-- content_reviews: enable RLS; users keep own read; admins manage
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_reviews_select_own ON public.content_reviews;
CREATE POLICY content_reviews_select_own
  ON public.content_reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS content_reviews_admin_select ON public.content_reviews;
CREATE POLICY content_reviews_admin_select
  ON public.content_reviews
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS content_reviews_admin_insert ON public.content_reviews;
CREATE POLICY content_reviews_admin_insert
  ON public.content_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content', 'support']));

DROP POLICY IF EXISTS content_reviews_admin_update ON public.content_reviews;
CREATE POLICY content_reviews_admin_update
  ON public.content_reviews
  FOR UPDATE
  TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content', 'support']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content', 'support']));

DROP POLICY IF EXISTS content_reviews_admin_delete ON public.content_reviews;
CREATE POLICY content_reviews_admin_delete
  ON public.content_reviews
  FOR DELETE
  TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']));

-- faq_items / video_tutorials: enable RLS; authenticated read; admin write
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tutorials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faq_items_select_authenticated ON public.faq_items;
CREATE POLICY faq_items_select_authenticated
  ON public.faq_items
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS faq_items_admin_insert ON public.faq_items;
CREATE POLICY faq_items_admin_insert
  ON public.faq_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content', 'support']));

DROP POLICY IF EXISTS faq_items_admin_update ON public.faq_items;
CREATE POLICY faq_items_admin_update
  ON public.faq_items
  FOR UPDATE
  TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content', 'support']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content', 'support']));

DROP POLICY IF EXISTS faq_items_admin_delete ON public.faq_items;
CREATE POLICY faq_items_admin_delete
  ON public.faq_items
  FOR DELETE
  TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']));

DROP POLICY IF EXISTS video_tutorials_select_authenticated ON public.video_tutorials;
CREATE POLICY video_tutorials_select_authenticated
  ON public.video_tutorials
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS video_tutorials_admin_insert ON public.video_tutorials;
CREATE POLICY video_tutorials_admin_insert
  ON public.video_tutorials
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content', 'support']));

DROP POLICY IF EXISTS video_tutorials_admin_update ON public.video_tutorials;
CREATE POLICY video_tutorials_admin_update
  ON public.video_tutorials
  FOR UPDATE
  TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content', 'support']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content', 'support']));

DROP POLICY IF EXISTS video_tutorials_admin_delete ON public.video_tutorials;
CREATE POLICY video_tutorials_admin_delete
  ON public.video_tutorials
  FOR DELETE
  TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']));

-- subscriptions: enable RLS if not already; own row + admin read
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS subscriptions_admin_select ON public.subscriptions;
CREATE POLICY subscriptions_admin_select
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- posts: enable RLS if not already.
-- User app uses the browser anon/authenticated client for CRUD on own posts
-- (lib/posts.ts) — own-row write policies are REQUIRED to avoid breakage.
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS posts_select_own ON public.posts;
CREATE POLICY posts_select_own
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS posts_insert_own ON public.posts;
CREATE POLICY posts_insert_own
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS posts_update_own ON public.posts;
CREATE POLICY posts_update_own
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS posts_delete_own ON public.posts;
CREATE POLICY posts_delete_own
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS posts_admin_select ON public.posts;
CREATE POLICY posts_admin_select
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- Verify with the Phase 0 checklist: create/edit/delete a post as a normal user
-- after applying this migration, before starting Phase 1.
