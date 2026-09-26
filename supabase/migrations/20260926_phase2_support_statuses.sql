-- =============================================================================
-- Phase 2 — extend support_messages.status for admin workflow
-- Necessary: product statuses "in behandeling" / "opgelost" are not in the
-- original CHECK ('open','beantwoord','gesloten').
-- Keeps 'gesloten' for existing rows / user-app compatibility.
-- =============================================================================

ALTER TABLE public.support_messages
  DROP CONSTRAINT IF EXISTS support_messages_status_check;

ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_status_check
  CHECK (
    status IN (
      'open',
      'in_behandeling',
      'beantwoord',
      'opgelost',
      'gesloten'
    )
  );

COMMENT ON CONSTRAINT support_messages_status_check ON public.support_messages IS
  'Admin workflow statuses; gesloten retained for legacy rows.';
