# Fase 3 — Gebruikersbeheer

## Migratie (verplicht)

Voer in Supabase SQL Editor uit:

`supabase/migrations/20260926_phase3_user_management.sql`

Voegt toe:

- `users.account_status` (`active` | `blocked`)
- `users.blocked_at`, `users.blocked_reason`
- Admin UPDATE-policy op `users`
- RLS + admin SELECT op `usage`

## Optionele env

```text
NEXT_PUBLIC_USER_APP_URL=https://app.socialcore.nl
```

Gebruikt als redirect voor wachtwoordreset (Auth recovery).

## Rechten

| Rol | Lezen | Muteren (blokkeren / activeren / edit / reset) |
|-----|-------|--------------------------------------------------|
| superadmin | ja | ja |
| support | ja | nee |
| content | ja | nee |
| viewer | ja | nee |

## Beveiliging

- Data: user JWT + RLS
- Service role alleen voor Auth Admin (`ban_duration`, `generateLink`, recovery-mail)
- Geen account delete
- Recovery-URL nooit in auditlogs
- Elke mutatie → `logAdminAction()`
