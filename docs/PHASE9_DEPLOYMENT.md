# Fase 9 — Productie & deployment (`admin.socialcore.nl`)

## Niet uitvoeren zonder bevestiging

Deze checklist is voorbereiding. **Deploy niet** tot jij dat expliciet vraagt.

## Vercel environment variables

| Variabele | Verplicht | Toelichting |
|-----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ja | Zelfde project als gebruikersapp |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ja | Anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | ja | Alleen server (Auth Admin) |
| `NEXT_PUBLIC_ADMIN_URL` | aanbevolen | `https://admin.socialcore.nl` |
| `NEXT_PUBLIC_USER_APP_URL` | aanbevolen | Reset-redirect |
| `USER_APP_URL` | optioneel | Broadcast dispatcher base URL |
| `ADMIN_BROADCAST_TOKEN` | optioneel | Zelfde token als gebruikersapp |

Geen `.env.example` in de repo (bewust). Gebruik lokale `.env.local` (in `.gitignore`).

## Supabase Auth

Redirect allowlist toevoegen:

- `https://admin.socialcore.nl/auth/callback`
- Preview URLs indien gewenst

Site URL van de gebruikersapp **niet** overschrijven.

## DNS

| Type | Naam | Waarde |
|------|------|--------|
| CNAME of A | `admin` | Vercel target (volgens Vercel domain UI) |

Domein: `admin.socialcore.nl` → Vercel project van deze adminrepo.

## Build-instellingen (Vercel)

- Framework: Next.js
- Build command: `npm run build`
- Output: Next default
- Node: 20.x aanbevolen
- Root: repo root `Social-Core-Admin-Cursor`

## SQL-migraties (handmatig in Supabase)

Voer in volgorde uit indien nog niet gedaan:

1. `20260926_phase0_admin_platform.sql`
2. `20260926_phase2_support_statuses.sql`
3. `20260926_phase3_user_management.sql`
4. `20260926_phase4_content_reviews.sql`
5. `20260926_phase5_cms_content.sql`
6. `20260926_phase6_broadcast_rls.sql`
7. `20260926_phase10_periodic_reviews.sql`
8. `20260926_phase10b_fix_review_notify_fk.sql` (verplicht voor verzenden + notificatie)
9. Seed: `supabase/seeds/seed_first_superadmin.sql`

## Productie-checklist

- [ ] Alle migraties uitgevoerd
- [ ] Superadmin seed + opnieuw inloggen (JWT claim)
- [ ] Env vars op Vercel gezet (geen secrets in git)
- [ ] Auth callback URL toegevoegd
- [ ] DNS `admin.socialcore.nl` actief
- [ ] Login / forbidden / middleware OK
- [ ] Roltesten: superadmin, support, content, viewer
- [ ] Broadcast: aanmaken + bestaande dispatcher
- [ ] Service role nooit in client bundle
- [ ] Logo + favicon OK
- [ ] `npm run build` groen

## Routes (compleet)

`/login`, `/forbidden`, `/dashboard`, `/users`, `/users/[id]`, `/support`, `/support/[id]`, `/reviews`, `/reviews/new`, `/reviews/[id]`, `/content`, `/content/faq`, `/content/faq/new`, `/content/faq/[id]`, `/content/videos`, `/content/videos/new`, `/content/videos/[id]`, `/broadcasts`, `/broadcasts/new`, `/broadcasts/[id]`, `/errors`, `/errors/[id]`, `/audit`, `/admins`, `/admins/new`, `/admins/[id]`
