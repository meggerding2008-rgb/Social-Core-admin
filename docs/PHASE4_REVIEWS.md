# Fase 4 — Contentreviews

## Onderzoek (bestaande DB)

Originele `content_reviews` kolommen:

- `id`, `user_id` → `users`
- `title`, `review_date`, `feedback`, `score` (TEXT, optioneel)
- `created_at`
- **Geen** status, post_id of updated_at

Trigger `content_review_notification_trigger` (AFTER INSERT) → rij in `notifications`
(`type = content_review_available`, link `/support`).

RLS (fase 0): users lezen eigen reviews; admins select/insert/update (rollen via
`has_platform_role` / `is_platform_admin`).

## Migratie (verplicht)

`supabase/migrations/20260926_phase4_content_reviews.sql`

Voegt toe: `status` (`concept|gepubliceerd|gearchiveerd`), `post_id`, `updated_at`.

Trigger voor notificaties blijft ongewijzigd (alleen INSERT).

## Rechten (app-laag)

| Rol | Lezen | Muteren |
|-----|-------|---------|
| superadmin | ja | ja |
| content | ja | ja |
| support | ja | nee |
| viewer | ja | nee |

## Test notificatie

1. Migratie uitvoeren
2. Als content/superadmin: `/reviews/new` → review voor een testuser met status `gepubliceerd`
3. In Supabase: `select * from notifications where type = 'content_review_available' order by created_at desc limit 5`
4. In gebruikersapp: gebruiker ziet review onder Support + notificatie
