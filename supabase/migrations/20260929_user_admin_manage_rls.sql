-- =============================================================================
-- Admin manage policies for shared user-app tables (posts, billing, team, etc.)
-- Read/write for platform admins via JWT + is_platform_admin / has_platform_role.
-- Does NOT create duplicate business tables. Does NOT expose OAuth tokens in app code.
-- Run manually in Supabase SQL editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- posts: admin write (select already exists)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS posts_admin_insert ON public.posts;
CREATE POLICY posts_admin_insert
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));

DROP POLICY IF EXISTS posts_admin_update ON public.posts;
CREATE POLICY posts_admin_update
  ON public.posts FOR UPDATE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));

DROP POLICY IF EXISTS posts_admin_delete ON public.posts;
CREATE POLICY posts_admin_delete
  ON public.posts FOR DELETE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;

-- -----------------------------------------------------------------------------
-- subscriptions: admin may correct status/tier (Stripe API remains separate)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS subscriptions_admin_update ON public.subscriptions;
CREATE POLICY subscriptions_admin_update
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin']));

GRANT SELECT, UPDATE ON public.subscriptions TO authenticated;

-- -----------------------------------------------------------------------------
-- usage: admin read already; allow superadmin corrections
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS usage_admin_update ON public.usage;
CREATE POLICY usage_admin_update
  ON public.usage FOR UPDATE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin']));

GRANT SELECT, UPDATE ON public.usage TO authenticated;

-- -----------------------------------------------------------------------------
-- social_account_metrics / post_metrics / platform_connections (read-only admin)
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.social_account_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS social_account_metrics_admin_select ON public.social_account_metrics;
CREATE POLICY social_account_metrics_admin_select
  ON public.social_account_metrics FOR SELECT TO authenticated
  USING (public.is_platform_admin());
GRANT SELECT ON public.social_account_metrics TO authenticated;

ALTER TABLE IF EXISTS public.post_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS post_metrics_admin_select ON public.post_metrics;
CREATE POLICY post_metrics_admin_select
  ON public.post_metrics FOR SELECT TO authenticated
  USING (public.is_platform_admin());
GRANT SELECT ON public.post_metrics TO authenticated;

ALTER TABLE IF EXISTS public.platform_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_connections_admin_select ON public.platform_connections;
CREATE POLICY platform_connections_admin_select
  ON public.platform_connections FOR SELECT TO authenticated
  USING (public.is_platform_admin());
GRANT SELECT ON public.platform_connections TO authenticated;

-- -----------------------------------------------------------------------------
-- trend_items
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.trend_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trend_items_admin_select ON public.trend_items;
CREATE POLICY trend_items_admin_select
  ON public.trend_items FOR SELECT TO authenticated
  USING (public.is_platform_admin());
DROP POLICY IF EXISTS trend_items_admin_update ON public.trend_items;
CREATE POLICY trend_items_admin_update
  ON public.trend_items FOR UPDATE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));
GRANT SELECT, UPDATE ON public.trend_items TO authenticated;

-- -----------------------------------------------------------------------------
-- competitor_data
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.competitor_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS competitor_data_admin_select ON public.competitor_data;
CREATE POLICY competitor_data_admin_select
  ON public.competitor_data FOR SELECT TO authenticated
  USING (public.is_platform_admin());
DROP POLICY IF EXISTS competitor_data_admin_insert ON public.competitor_data;
CREATE POLICY competitor_data_admin_insert
  ON public.competitor_data FOR INSERT TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));
DROP POLICY IF EXISTS competitor_data_admin_update ON public.competitor_data;
CREATE POLICY competitor_data_admin_update
  ON public.competitor_data FOR UPDATE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));
DROP POLICY IF EXISTS competitor_data_admin_delete ON public.competitor_data;
CREATE POLICY competitor_data_admin_delete
  ON public.competitor_data FOR DELETE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_data TO authenticated;

-- -----------------------------------------------------------------------------
-- post_media_assets (library)
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.post_media_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS post_media_assets_admin_select ON public.post_media_assets;
CREATE POLICY post_media_assets_admin_select
  ON public.post_media_assets FOR SELECT TO authenticated
  USING (public.is_platform_admin());
DROP POLICY IF EXISTS post_media_assets_admin_update ON public.post_media_assets;
CREATE POLICY post_media_assets_admin_update
  ON public.post_media_assets FOR UPDATE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));
GRANT SELECT, UPDATE ON public.post_media_assets TO authenticated;

-- -----------------------------------------------------------------------------
-- content_settings
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.content_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_settings_admin_select ON public.content_settings;
CREATE POLICY content_settings_admin_select
  ON public.content_settings FOR SELECT TO authenticated
  USING (public.is_platform_admin());
DROP POLICY IF EXISTS content_settings_admin_update ON public.content_settings;
CREATE POLICY content_settings_admin_update
  ON public.content_settings FOR UPDATE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin']));
GRANT SELECT, UPDATE ON public.content_settings TO authenticated;

-- -----------------------------------------------------------------------------
-- team + team_invitations
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.team ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_admin_select ON public.team;
CREATE POLICY team_admin_select
  ON public.team FOR SELECT TO authenticated
  USING (public.is_platform_admin());
DROP POLICY IF EXISTS team_admin_insert ON public.team;
CREATE POLICY team_admin_insert
  ON public.team FOR INSERT TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'support']));
DROP POLICY IF EXISTS team_admin_update ON public.team;
CREATE POLICY team_admin_update
  ON public.team FOR UPDATE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'support']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'support']));
DROP POLICY IF EXISTS team_admin_delete ON public.team;
CREATE POLICY team_admin_delete
  ON public.team FOR DELETE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'support']));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team TO authenticated;

ALTER TABLE IF EXISTS public.team_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_invitations_admin_select ON public.team_invitations;
CREATE POLICY team_invitations_admin_select
  ON public.team_invitations FOR SELECT TO authenticated
  USING (public.is_platform_admin());
DROP POLICY IF EXISTS team_invitations_admin_insert ON public.team_invitations;
CREATE POLICY team_invitations_admin_insert
  ON public.team_invitations FOR INSERT TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'support']));
DROP POLICY IF EXISTS team_invitations_admin_update ON public.team_invitations;
CREATE POLICY team_invitations_admin_update
  ON public.team_invitations FOR UPDATE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'support']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'support']));
DROP POLICY IF EXISTS team_invitations_admin_delete ON public.team_invitations;
CREATE POLICY team_invitations_admin_delete
  ON public.team_invitations FOR DELETE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'support']));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invitations TO authenticated;

-- -----------------------------------------------------------------------------
-- users: allow onboarding_completed updates by superadmin (already has admin update)
-- -----------------------------------------------------------------------------
-- (users_admin_update from phase3 already covers this)

COMMENT ON POLICY posts_admin_update ON public.posts IS
  'Admin content/superadmin may edit user posts; audited in application layer.';
