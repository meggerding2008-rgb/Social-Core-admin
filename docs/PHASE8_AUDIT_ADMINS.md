# Fase 8 — Audit & Admins

## Audit (`/audit`)

- Read-only over `admin_audit_logs`
- Filters: actor, actie, resource, datum, zoekterm
- Before/after JSON in `<details>`
- Geen delete/update

## Admins (`/admins`) — alleen superadmin

- Toevoegen via bestaand `users` + Auth Admin `getUserById`
- Rol / actief / display_name
- Sync `app_metadata.platform_role`
- Guards: niet jezelf deactiveren; minstens 1 actieve superadmin
