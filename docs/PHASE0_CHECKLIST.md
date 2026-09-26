# Fase 0 checklist — vóór fase 1

Voer dit uit in het **zelfde** Supabase-project als de gebruikersapp. Geen admin-dashboard nodig.

## A. Schema

In SQL Editor:

```sql
-- Tabellen bestaan
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('admin_profiles', 'admin_audit_logs', 'error_reports')
ORDER BY 1;
-- Verwacht: 3 rijen

-- Functies bestaan + SECURITY DEFINER
SELECT p.proname,
       p.prosecdef AS security_definer,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_platform_admin', 'is_platform_superadmin', 'has_platform_role');
-- Verwacht: security_definer = true voor alle drie
```

## B. Superadmin-seed

```sql
SELECT u.email,
       ap.role,
       ap.is_active,
       u.raw_app_meta_data ->> 'platform_role' AS jwt_platform_role
FROM public.admin_profiles ap
JOIN auth.users u ON u.id = ap.user_id
WHERE lower(u.email) = 'meggerding2008@gmail.com';
```

Verwacht:

| email | role | is_active | jwt_platform_role |
|-------|------|-----------|-------------------|
| meggerding2008@gmail.com | superadmin | true | superadmin |

Als `jwt_platform_role` leeg is: seed opnieuw, daarna **opnieuw inloggen**.

## C. Geen RLS-recursie

```sql
-- Moet true teruggeven als je dit als de superadmin-user runt
-- (Dashboard → SQL kan niet zomaar auth.uid() van jou zijn;
--  test via een latere adminapp of: Authentication → user impersonation tooling)
SELECT public.is_platform_admin();
SELECT public.is_platform_superadmin();
```

In SQL Editor zonder JWT is `auth.uid()` meestal `null` → beide `false`. Dat is normaal.  
Recursie-test: policies op `admin_profiles` roepen de helper aan; de helper leest `admin_profiles` als definer → **geen** infinite recursion. Als `SELECT * FROM admin_profiles` in de SQL Editor werkt (owner bypass), is de tabel bereikbaar.

## D. Gebruikersapp mag niet breken (kritiek)

Na de migratie, in de **bestaande gebruikersapp** (niet admin):

1. Inloggen als gewone gebruiker (niet-admin mag).
2. Een post aanmaken / bewerken / verwijderen (of favoriet togglen).
3. Supportpagina openen (FAQ, reviews, ticketlijst).
4. Profiel laden.

Alles moet werken. `posts` heeft nu RLS met own-row CRUD; support-API’s gebruiken service_role en blijven werken.

## E. Admin mag niet “per ongeluk” iedereen zijn

```sql
-- Willekeurige non-admin mag GEEN rij in admin_profiles hebben
SELECT count(*) FROM public.admin_profiles WHERE is_active = true;
-- Verwacht: 1 (alleen jij), tenzij je expres meer admins hebt gezet
```

## F. Audit + errors schrijfbaar (straks via JWT)

Nog geen app: overslaan tot fase 1, of handmatig als service role:

```sql
-- Alleen ter verificatie van grants/constraints; daarna mag je de testrij verwijderen
INSERT INTO public.admin_audit_logs (actor_id, action, resource_type, resource_id, metadata)
SELECT user_id, 'phase0.test', 'system', 'phase0', '{"ok": true}'::jsonb
FROM public.admin_profiles
WHERE role = 'superadmin'
LIMIT 1;

DELETE FROM public.admin_audit_logs WHERE action = 'phase0.test';
```

## Klaar voor fase 1 wanneer

- [ ] Migratie zonder errors
- [ ] Superadmin-rij + `platform_role` in `app_metadata`
- [ ] Gebruikersapp: posts + support nog OK
- [ ] Exact één actieve superadmin (jij), tenzij bewust anders
- [ ] Geen wijzigingen gecommit in de gebruikersapp-repo

Daarna: Next.js scaffold, login, middleware + server-side `admin_profiles`-check.
