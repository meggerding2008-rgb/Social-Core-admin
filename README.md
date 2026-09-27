# Social Core Admin

Aparte Next.js-adminapp voor `admin.socialcore.nl`.  
Deelt Supabase Auth + database met de gebruikersapp. **Geen wijzigingen in de gebruikersapp-code.**

## Status

| Fase | Status |
|------|--------|
| 0 — DB + superadmin | Klaar |
| 1 — Auth shell | Klaar |
| 2 — Support | Klaar |
| 3 — Users | Klaar |
| 4 — Reviews | Klaar |
| 5 — CMS | Klaar |
| 6 — Broadcasts | Vervangen door Pop-ups |
| 7 — Errors | Klaar |
| 8 — Audit / Admins | Klaar |
| 9 — Deploy prep | Klaar (nog niet deployen) |
| Pop-ups | Klaar |

## Lokaal

1. Migraties in Supabase uitvoeren (zie `docs/PHASE9_DEPLOYMENT.md`).
2. Alleen `.env.local` (staat in `.gitignore`).
3. `npm install && npm run dev -- -p 3001`

## Docs

- [PHASE0_RUNBOOK.md](docs/PHASE0_RUNBOOK.md)
- [PHASE1_CHECKLIST.md](docs/PHASE1_CHECKLIST.md)
- [PHASE2_SUPPORT.md](docs/PHASE2_SUPPORT.md)
- [PHASE3_USERS.md](docs/PHASE3_USERS.md)
- [PHASE4_REVIEWS.md](docs/PHASE4_REVIEWS.md)
- [PHASE5_CMS.md](docs/PHASE5_CMS.md)
- [PHASE6_BROADCASTS.md](docs/PHASE6_BROADCASTS.md)
- [PHASE7_ERRORS.md](docs/PHASE7_ERRORS.md)
- [PHASE8_AUDIT_ADMINS.md](docs/PHASE8_AUDIT_ADMINS.md)
- [PHASE9_DEPLOYMENT.md](docs/PHASE9_DEPLOYMENT.md)
- [PHASE10_PERIODIC_REVIEWS.md](docs/PHASE10_PERIODIC_REVIEWS.md)
- [POPUPS.md](docs/POPUPS.md)
