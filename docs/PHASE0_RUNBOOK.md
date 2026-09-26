# Fase 0 — uitvoeren in Supabase

Geen dashboardcode. Alleen database + seed.

## Bestanden

| Bestand | Doel |
|---------|------|
| `supabase/migrations/20260926_phase0_admin_platform.sql` | Tabellen, helpers, RLS |
| `supabase/seeds/seed_first_superadmin.sql` | Eerste superadmin |

## Stap 1 — Migratie uitvoeren

1. Open het **gedeelde** Supabase-project (zelfde als de gebruikersapp).
2. Ga naar **SQL Editor** → New query.
3. Plak de volledige inhoud van `20260926_phase0_admin_platform.sql`.
4. Run. Verwacht: success, geen errors.
5. Bij fouten: stop, kopieer de foutmelding; voer de seed **niet** uit.

## Stap 2 — Auth-account controleren

Het e-mailadres `meggerding2008@gmail.com` moet bestaan onder **Authentication → Users**.

- Bestaat het al (via gebruikersapp): door naar stap 3.
- Bestaat het niet: **Add user** in Authentication, of registreer één keer via de gebruikersapp met dat e-mailadres.

## Stap 3 — Superadmin seeden

1. SQL Editor → New query.
2. Plak `supabase/seeds/seed_first_superadmin.sql`.
3. Run.
4. Verwacht in Messages: `Superadmin gezet voor meggerding2008@gmail.com ...`
5. **Log opnieuw in** (of refresh sessie) zodat `app_metadata.platform_role` in de JWT zit.

> De seed moet als SQL Editor / postgres draaien (bypasst RLS).  
> Een gewone user-JWT kan de eerste admin niet aanmaken (geen superadmin → policy blokkeert).

## Stap 4 — Controles vóór fase 1

Zie `docs/PHASE0_CHECKLIST.md`.
