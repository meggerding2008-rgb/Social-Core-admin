# Fase 1 checklist

## Lokaal

- [ ] `.env.local` gevuld (zelfde Supabase-project als gebruikersapp; geen `.env.example`)
- [ ] `npm run dev` start zonder errors
- [ ] `/login` laadt met logo, navy/mist huisstijl en favicon
- [ ] Login als superadmin → `/dashboard`
- [ ] Header toont rol `superadmin` en e-mail
- [ ] Uitloggen → terug naar `/login`
- [ ] Login met een **niet-admin** account → `/forbidden`
- [ ] Direct `/dashboard` zonder sessie → redirect `/login`

## Supabase Auth URLs

- [ ] `http://localhost:3001/auth/callback` in redirect allowlist
- [ ] Later productie: `https://admin.socialcore.nl/auth/callback` (zonder de gebruikersapp Site URL te overschrijven)

## Beveiliging

- [ ] Geen `SUPABASE_SERVICE_ROLE_KEY` in client bundles
- [ ] `.env.local` staat in `.gitignore` en wordt niet gecommit
- [ ] Adminroutes draaien alleen na `requireAdmin()` (layout)
- [ ] Geen wijzigingen in `Social-Core-App-Cursor`

Klaar voor fase 2 (support inbox) wanneer bovenstaande groen is.
