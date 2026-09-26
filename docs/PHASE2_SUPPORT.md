# Fase 2 — Support inbox

## Database (eenmalig)

Voer in Supabase SQL Editor uit:

`supabase/migrations/20260926_phase2_support_statuses.sql`

Dit verruimt `support_messages.status` met `in_behandeling` en `opgelost` (naast bestaande `open` / `beantwoord` / `gesloten`).

Zonder deze migratie falen statusupdates naar de nieuwe waarden op de CHECK-constraint.

## Rechten

| Rol | Lezen | Muteren (reply/status/prioriteit/chat) |
|-----|-------|----------------------------------------|
| superadmin | ja | ja |
| support | ja | ja |
| content | ja | nee |
| viewer | ja | nee |

## Teststappen

1. Login als superadmin → `/support`
2. Standaardfilter toont open tickets
3. Filters: status, prioriteit, categorie, zoekterm
4. Open een ticket → `/support/[id]`
5. Antwoord opslaan → zichtbaar als `admin_reply`, status bijgewerkt
6. Status wijzigen naar In behandeling / Opgelost
7. Prioriteit aan/uit
8. Indien human conversation bestaat: bericht met `sender_type=human`
9. Controleer `admin_audit_logs` op nieuwe rijen
10. (Optioneel) login als viewer-rol → wel lezen, geen mutatie-UI actief
