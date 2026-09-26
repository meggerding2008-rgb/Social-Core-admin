-- =============================================================================
-- SEED: eerste platform superadmin
-- Email: meggerding2008@gmail.com
--
-- VOORWAARDEN:
-- 1. Phase 0 migratie is al uitgevoerd.
-- 2. Dit account bestaat al in Authentication → Users (auth.users).
--    Zo niet: eerst inloggen/registreren via de gebruikersapp of
--    handmatig aanmaken in Supabase Dashboard → Authentication → Users.
-- 3. Uitvoeren in Supabase SQL Editor als database owner (bypasst RLS).
--    NIET uitvoeren als gewone authenticated user — dan faalt insert
--    omdat er nog geen superadmin bestaat (chicken-and-egg).
-- =============================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'meggerding2008@gmail.com';
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'Geen auth.users-rij voor %. Maak het account eerst aan in Authentication → Users, daarna dit script opnieuw.',
      v_email;
  END IF;

  INSERT INTO public.admin_profiles (user_id, role, is_active, display_name)
  VALUES (v_user_id, 'superadmin', true, 'Megge')
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'superadmin',
        is_active = true,
        updated_at = now();

  -- Spiegel in JWT app_metadata (zichtbaar na refresh / opnieuw inloggen)
  UPDATE auth.users
  SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('platform_role', 'superadmin')
  WHERE id = v_user_id;

  RAISE NOTICE 'Superadmin gezet voor % (user_id=%). Log opnieuw in om JWT-claims te vernieuwen.',
    v_email, v_user_id;
END;
$$;
