-- =============================================================================
-- Admin pop-ups module (replaces Broadcasts in the admin UI)
-- New tables — does not modify broadcast_notifications.
-- Run manually in Supabase SQL editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN (
      'feedback',
      'product_update',
      'maintenance',
      'announcement',
      'survey'
    )),
  audience TEXT NOT NULL DEFAULT 'all'
    CHECK (audience IN (
      'all',
      'new_users',
      'subscription',
      'feature'
    )),
  -- Extra filters: { "tier": "gold" } or { "feature": "trends" }
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'concept'
    CHECK (status IN (
      'concept',
      'gepland',
      'actief',
      'gepauzeerd',
      'verlopen',
      'gearchiveerd'
    )),
  display_style TEXT NOT NULL DEFAULT 'informatief'
    CHECK (display_style IN (
      'informatief',
      'feedbackvraag',
      'enquete',
      'onderhoudsmelding',
      'update'
    )),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  -- Trigger rules
  show_after_days INTEGER
    CHECK (show_after_days IS NULL OR show_after_days >= 0),
  show_once BOOLEAN NOT NULL DEFAULT true,
  persist_until TEXT NOT NULL DEFAULT 'until_dismiss_or_respond'
    CHECK (persist_until IN (
      'once',
      'until_dismiss',
      'until_respond',
      'until_dismiss_or_respond'
    )),
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_popups_status_start
  ON public.admin_popups (status, start_at);

CREATE INDEX IF NOT EXISTS idx_admin_popups_type
  ON public.admin_popups (type);

CREATE TABLE IF NOT EXISTS public.admin_popup_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id UUID NOT NULL REFERENCES public.admin_popups (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (popup_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_popup_responses_popup
  ON public.admin_popup_responses (popup_id, responded_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_popup_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  popup_id UUID NOT NULL REFERENCES public.admin_popups (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (popup_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_popup_dismissals_popup
  ON public.admin_popup_dismissals (popup_id, dismissed_at DESC);

DROP TRIGGER IF EXISTS trg_admin_popups_updated_at ON public.admin_popups;
CREATE TRIGGER trg_admin_popups_updated_at
  BEFORE UPDATE ON public.admin_popups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.admin_popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_popup_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_popup_dismissals ENABLE ROW LEVEL SECURITY;

-- Admins: full manage
DROP POLICY IF EXISTS admin_popups_admin_select ON public.admin_popups;
CREATE POLICY admin_popups_admin_select
  ON public.admin_popups FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS admin_popups_admin_insert ON public.admin_popups;
CREATE POLICY admin_popups_admin_insert
  ON public.admin_popups FOR INSERT TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));

DROP POLICY IF EXISTS admin_popups_admin_update ON public.admin_popups;
CREATE POLICY admin_popups_admin_update
  ON public.admin_popups FOR UPDATE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));

DROP POLICY IF EXISTS admin_popups_admin_delete ON public.admin_popups;
CREATE POLICY admin_popups_admin_delete
  ON public.admin_popups FOR DELETE TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']));

-- Users: read only active + in window (audience filtering done in app query)
DROP POLICY IF EXISTS admin_popups_user_select_active ON public.admin_popups;
CREATE POLICY admin_popups_user_select_active
  ON public.admin_popups FOR SELECT TO authenticated
  USING (
    status = 'actief'
    AND (start_at IS NULL OR start_at <= now())
    AND (end_at IS NULL OR end_at >= now())
  );

-- Responses: users insert/select own; admins read all
DROP POLICY IF EXISTS admin_popup_responses_own_select ON public.admin_popup_responses;
CREATE POLICY admin_popup_responses_own_select
  ON public.admin_popup_responses FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS admin_popup_responses_own_insert ON public.admin_popup_responses;
CREATE POLICY admin_popup_responses_own_insert
  ON public.admin_popup_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS admin_popup_responses_admin_all ON public.admin_popup_responses;
CREATE POLICY admin_popup_responses_admin_all
  ON public.admin_popup_responses FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Dismissals
DROP POLICY IF EXISTS admin_popup_dismissals_own_select ON public.admin_popup_dismissals;
CREATE POLICY admin_popup_dismissals_own_select
  ON public.admin_popup_dismissals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS admin_popup_dismissals_own_insert ON public.admin_popup_dismissals;
CREATE POLICY admin_popup_dismissals_own_insert
  ON public.admin_popup_dismissals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS admin_popup_dismissals_admin_all ON public.admin_popup_dismissals;
CREATE POLICY admin_popup_dismissals_admin_all
  ON public.admin_popup_dismissals FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_popups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_popup_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_popup_dismissals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_popups TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_popup_responses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_popup_dismissals TO service_role;

COMMENT ON TABLE public.admin_popups IS
  'In-app pop-ups managed by Social Core Admin. Not related to broadcast_notifications.';
