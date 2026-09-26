# Fase 7 — Foutmeldingen

## Statusmapping (bestaande DB-waarden)

| UI | DB (`error_reports.status`) |
|----|-----------------------------|
| Nieuw | `open` |
| Onderzocht | `triaged` |
| Opgelost | `resolved` |
| Genegeerd | `ignored` |

Severity/source: ongewijzigd t.o.v. fase 0.

## Clientintegratie gebruikersapp — voorstel (niet geïmplementeerd)

De gebruikersapp schrijft **nog niet** naar `error_reports` (grep: 0 hits).

Voorstel zonder deze PR:

1. In de gebruikersapp een dunne server helper `reportError({ message, stack, url, userId, source })` die met **service role** of een begrensde Edge Function insert op `error_reports`.
2. Client: `window.onerror` / `unhandledrejection` → POST `/api/errors/report` (auth optioneel).
3. Scrub secrets client-side vóór verzenden.
4. Rate-limit per user/IP.
5. Adminapp triaget reeds via `/errors`.

Geen gebruikersapp-code in deze fase aangepast.
