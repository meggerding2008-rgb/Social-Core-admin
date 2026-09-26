# Periodieke contentreviews (fase 10)

## Vergelijking oud → nieuw

| Oud | Nieuw |
|-----|--------|
| Losse review + optionele `post_id` | Periodieke totaalreview per gebruiker |
| Status: concept / gepubliceerd / gearchiveerd | concept / gepland / verzonden / geannuleerd |
| Velden: title, feedback, score, review_date | + periode, analysevelden, scheduled_for, sent_at, tier, created_by |
| Notificatie op **iedere INSERT** | Notificatie alleen bij status **verzonden** |

Bestaande rijen blijven bestaan. `title`, `review_date`, `feedback` blijven verplicht voor de gebruikersapp.

## Migratie (handmatig in Supabase)

`supabase/migrations/20260926_phase10_periodic_reviews.sql`

- Voegt kolommen toe (geen DROP van data)
- Remapt `gepubliceerd` → `verzonden`, `gearchiveerd` → `geannuleerd`
- RLS: users zien via JWT alleen `verzonden`
- Trigger: notify bij INSERT/UPDATE naar `verzonden`

## Frequentie

| Tier (DB) | Label | Interval |
|-----------|-------|----------|
| `silver` | Zilver | 90 dagen |
| `gold` | Goud | 30 dagen |
| `diamond` | Diamant | 7 dagen |

## Bekende bugfix (notificatie FK)

Als **verzenden** faalde met een generieke fout: `notifications.related_post_id`
had een `DEFAULT gen_random_uuid()` waardoor de notify-trigger een nep-post-id
aanmaakte en de FK naar `posts` brak. Daardoor werd de hele review-transactie
teruggedraaid.

Fix: `supabase/migrations/20260926_phase10b_fix_review_notify_fk.sql`
(uitvoeren in Supabase SQL editor). Concept/gepland werkten al zonder deze fix.

`pages/api/support/index.ts` laadt reviews met **service role** en filtert niet op status.
Daardoor kunnen concepten nog zichtbaar zijn tot de gebruikersapp filtert op `status = 'verzonden'`.

Voorstel (user-app, later):

```ts
.eq('user_id', userId)
.eq('status', 'verzonden')
```

Notificaties werken al correct via de aangepaste DB-trigger.
