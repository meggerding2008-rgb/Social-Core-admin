# Fase 5 — CMS (FAQ + videotutorials)

## Onderzoek

Originele kolommen:

| Tabel | Kolommen |
|-------|----------|
| `faq_items` | `question`, `answer`, `display_order`, `created_at` |
| `video_tutorials` | `title`, `thumbnail_url`, `duration`, `video_url`, `display_order`, `created_at` |

Geen status/categorie. Gebruikersapp: `/api/support` → service role `select * order by display_order`.

## Migratie (verplicht)

`supabase/migrations/20260926_phase5_cms_content.sql`

- `category`, `is_published`, `updated_at` (beide tabellen)
- `description` op video’s
- RLS write alleen `superadmin` + `content`
- JWT SELECT: gepubliceerd óf platform-admin

**Let op:** de gebruikersapp gebruikt service role en toont nog alle rijen (ook `is_published=false`) tot die API filtert. Gepubliceerde **wijzigingen** zijn wél direct zichtbaar.

## Rechten

| Rol | Lezen | Muteren |
|-----|-------|---------|
| superadmin | ja | ja |
| content | ja | ja |
| support | ja | nee |
| viewer | ja | nee |

## XSS

Antwoorden/beschrijvingen als platte tekst (`whitespace-pre-wrap`), nooit `dangerouslySetInnerHTML`.
