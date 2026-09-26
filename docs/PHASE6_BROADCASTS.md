# Fase 6 — Broadcasts

## Gedrag

- Admin schrijft naar `broadcast_notifications` (JWT + RLS).
- Verzenden blijft de **bestaande** gebruikersapp-dispatcher:
  `POST {USER_APP_URL}/api/admin/dispatch-broadcasts` + `ADMIN_BROADCAST_TOKEN`.
- Doelgroep = alle users (zoals bestaande fan-out). Geen tweede dispatcher.

## Migratie

`supabase/migrations/20260926_phase6_broadcast_rls.sql` — RLS op broadcasts/notifications.

## Env (optioneel voor dispatcher-knop)

```text
USER_APP_URL=https://app.socialcore.nl
ADMIN_BROADCAST_TOKEN=...
```
