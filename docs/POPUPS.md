# Admin Pop-ups + gebruikersapp-koppeling

## Tabellen (migratie)

Voer uit in Supabase: `supabase/migrations/20260927_admin_popups.sql`

| Tabel | Doel |
|-------|------|
| `admin_popups` | Definitie van pop-ups |
| `admin_popup_responses` | Antwoorden (feedback/enquête), uniek per user+popup |
| `admin_popup_dismissals` | “Niet nu” / afwijzing, uniek per user+popup |

Broadcasts (`broadcast_notifications`) blijven bestaan maar worden **niet** meer gebruikt in de admin-UI.

## RLS (in migratie)

- Admins: select/insert/update/delete op `admin_popups` (mutatie: superadmin/content)
- Gebruikers: select alleen `status = 'actief'` binnen `start_at`/`end_at`
- Responses/dismissals: eigen insert + select; admins lezen alles

## Gebruikersapp — voorgestelde query (nog niet gebouwd)

```ts
// Pseudocode — service role of JWT + RLS
const { data: popups } = await supabase
  .from('admin_popups')
  .select('*')
  .eq('status', 'actief')
  .or(`start_at.is.null,start_at.lte.${now}`)
  .or(`end_at.is.null,end_at.gte.${now}`);

// Filter client/server:
// 1. audience (all / new_users / subscription.tier / feature)
// 2. show_after_days vs user.created_at
// 3. exclude als row in admin_popup_dismissals of admin_popup_responses
//    afhankelijk van persist_until
```

## Response-actie

```ts
await supabase.from('admin_popup_responses').upsert({
  popup_id,
  user_id,
  response: { rating: 5, comment: '...' },
  responded_at: new Date().toISOString(),
}, { onConflict: 'popup_id,user_id' });
```

## Dismiss-actie (“Niet nu”)

```ts
await supabase.from('admin_popup_dismissals').upsert({
  popup_id,
  user_id,
  dismissed_at: new Date().toISOString(),
}, { onConflict: 'popup_id,user_id' });
```

## Zichtbaarheidsregels

Toon alleen als álle waar zijn:

1. Gebruiker zit in doelgroep (`audience` + `audience_filter`)
2. `status = 'actief'`
3. `start_at` null of ≤ nu
4. `end_at` null of ≥ nu
5. Geen dismissal/response volgens `persist_until` / `show_once`
6. Optioneel: accountleeftijd ≥ `show_after_days`

Gebruikersapp is **niet** aangepast in deze opdracht.
