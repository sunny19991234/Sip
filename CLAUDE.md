# Sip — waterintake-tracker

Persoonlijke PWA om met één NFC-tik tegen een drinkfles de vochtinname te registreren,
tegen een dagdoel van 3.000 ml. Eén gebruiker, Android, Chrome.

**De volledige specificatie staat in `docs/PRD.md`. Dat document is leidend.**
Toets elk voorstel daaraan. Wijkt een verzoek af van de PRD, benoem dat eerst en vraag
of de PRD moet worden bijgewerkt — geen stille scope-uitbreiding.

## Stack (vastgelegd)

- Frontend: React + TypeScript + Vite, Tailwind CSS, Recharts
- PWA: vite-plugin-pwa (service worker, manifest, offline)
- Backend: Supabase — Postgres met RLS, anonymous auth, Edge Functions, pg_cron
- Hosting: Vercel (HTTPS), auto-deploy vanaf `main`
- Geen iOS, geen native app, geen Play Store

## Supabase-werkwijze

- Wijzigingen worden toegepast via de Supabase MCP-connector.
- Élke schemawijziging wordt óók weggeschreven als genummerd migratiebestand in
  `supabase/migrations/`. De bestanden zijn de bron van waarheid; MCP is alleen het
  uitvoermiddel. Nooit een schemawijziging die niet als bestand in de repo staat.
- RLS staat aan op elke tabel, met policy op `auth.uid()`.
- De service-role key komt nooit in frontend-code en nooit in de repo. Alleen in
  lokale `.env`, en `.env` staat in `.gitignore`.

## Werkwijze

- Bouw de MVP in de volgorde van hoofdstuk 13 van de PRD. Eén stap per keer: rond een
  stap af, laat mij testen, wacht op akkoord voor de volgende.
- Voor je een stap bouwt: vat in enkele regels samen wat je gaat doen en welke aannames
  je maakt, zodat ik kan bijsturen voordat er code is.
- Corrigeer een verkeerde aanname in mijn vraag vóór je hem beantwoordt. Wees kritisch op
  de framing, niet alleen op de inhoud.
- Direct en zakelijk. Geen inleidingen, geen complimenten, geen samenvatting van wat ik
  net vroeg. Kort antwoord waar dat volstaat.
- Taal: Nederlands in overleg. Code, commits, comments en identifiers in het Engels.

## Technische regels

- Geen nieuwe dependency zonder eerst te benoemen waarom die nodig is en wat het
  alternatief zonder is.
- Elke registratie krijgt een client-generated UUID, zodat offline synchronisatie
  idempotent is. Registraties worden soft-deleted (`deleted_at`), nooit hard-deleted.
- Tijd altijd als `timestamptz` opslaan. De logische dag wordt berekend met
  `day_start_hour` en tijdzone Europe/Amsterdam, niet met UTC-datums.
- Bij platformspecifiek gedrag (NFC-intents, service workers, web push): geef aan wat
  geverifieerd is en wat een aanname is. Verzin geen API-gedrag.

## Inhoudelijk

- Het dagdoel van 3.000 ml is een instelling die de gebruiker heeft bepaald. Geef geen
  medisch advies, geen aanbevelingen over vochtinname, geen interpretatie van de data.
- Geen motiverende teksten, gamification of "goed bezig!"-copy in de UI, tenzij erom
  gevraagd.
