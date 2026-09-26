-- =============================================================================
-- Phase 5 — CMS: FAQ + video tutorials publish/category/updated_at
-- Original columns only:
--   faq_items: id, question, answer, display_order, created_at
--   video_tutorials: id, title, thumbnail_url, duration, video_url, display_order, created_at
-- Publish/hide + category require new columns. User app selects * via service_role
-- (sees all rows); prefer is_published=true for live content until the user app
-- filters. Authenticated JWT clients only see published items.
-- =============================================================================

ALTER TABLE public.faq_items
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.video_tutorials
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_faq_items_published_order
  ON public.faq_items (is_published, display_order ASC);

CREATE INDEX IF NOT EXISTS idx_video_tutorials_published_order
  ON public.video_tutorials (is_published, display_order ASC);

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

DROP TRIGGER IF EXISTS trg_faq_items_updated_at ON public.faq_items;
CREATE TRIGGER trg_faq_items_updated_at
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_video_tutorials_updated_at ON public.video_tutorials;
CREATE TRIGGER trg_video_tutorials_updated_at
  BEFORE UPDATE ON public.video_tutorials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Tighten write policies: content + superadmin only (support/viewer read-only in app + DB)
DROP POLICY IF EXISTS faq_items_select_authenticated ON public.faq_items;
CREATE POLICY faq_items_select_authenticated
  ON public.faq_items
  FOR SELECT
  TO authenticated
  USING (is_published = true OR public.is_platform_admin());

DROP POLICY IF EXISTS faq_items_admin_insert ON public.faq_items;
CREATE POLICY faq_items_admin_insert
  ON public.faq_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));

DROP POLICY IF EXISTS faq_items_admin_update ON public.faq_items;
CREATE POLICY faq_items_admin_update
  ON public.faq_items
  FOR UPDATE
  TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));

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
  USING (is_published = true OR public.is_platform_admin());

DROP POLICY IF EXISTS video_tutorials_admin_insert ON public.video_tutorials;
CREATE POLICY video_tutorials_admin_insert
  ON public.video_tutorials
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));

DROP POLICY IF EXISTS video_tutorials_admin_update ON public.video_tutorials;
CREATE POLICY video_tutorials_admin_update
  ON public.video_tutorials
  FOR UPDATE
  TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']))
  WITH CHECK (public.has_platform_role(ARRAY['superadmin', 'content']));

DROP POLICY IF EXISTS video_tutorials_admin_delete ON public.video_tutorials;
CREATE POLICY video_tutorials_admin_delete
  ON public.video_tutorials
  FOR DELETE
  TO authenticated
  USING (public.has_platform_role(ARRAY['superadmin', 'content']));
