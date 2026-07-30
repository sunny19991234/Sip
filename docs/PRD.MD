# PRD — Waterintake-tracker (*Sip*)

**Versie:** 0.1 (concept) · **Datum:** 24 juli 2026 · **Eigenaar:** Sunny · **Status:** ter besluitvorming

---

## 1. Doel en probleemstelling

Het handmatig bijhouden van vochtinname mislukt in de praktijk omdat de drempel per registratie te hoog is: telefoon pakken, app openen, hoeveelheid kiezen, bevestigen. Het gevolg is onvolledige data en daarmee geen bruikbaar beeld van de werkelijke inname.

Doel van dit project is een persoonlijke web-app waarmee (a) registreren vrijwel nul moeite kost — één tik met de telefoon tegen de fles — en (b) de historie betrouwbaar wordt vastgelegd tegen een dagdoel van 3.000 ml.

**Succescriterium:** in de eerste vier weken na oplevering wordt op minimaal 90% van de dagen geregistreerd, waarvan het merendeel van de registraties via NFC.

---

## 2. Scope

| | Onderdeel |
|---|---|
| **Fase 1 (MVP)** | Web-app (PWA) met visuele voortgang, snelknoppen, vrije invoer, correctie/undo, NFC-registratie via tag op de fles, dag- en weekhistorie, dagdoel 3.000 ml |
| **Fase 2** | Push-notificaties op basis van tijdgebonden tussendoelen; instelbaar schema; stilteperiode |
| **Fase 3 (optioneel)** | CSV-/PDF-export, meerdere dranktypen, streaks en trendanalyse, koppeling Health Connect |
| **Buiten scope** | Meerdere gebruikers, accountbeheer met wachtwoorden, native Android-app (Play Store), iOS-ondersteuning, medische interpretatie van de data |

Het dagdoel van 3.000 ml is een door de gebruiker ingestelde waarde en wordt door het systeem niet geïnterpreteerd of geadviseerd.

---

## 3. Gebruiker en gebruikscontext

Eén gebruiker, één Android-toestel, één fles van 750 ml. De app wordt gebruikt op kantoor, thuis en onderweg — netwerkdekking is dus niet gegarandeerd. Registratie gebeurt vaak eenhandig en zonder aandacht (tijdens werk, tijdens een gesprek). Dit stelt harde eisen aan snelheid, offline-gedrag en foutcorrectie.

---

## 4. Vastgelegde technische keuzes

| Beslissing | Keuze | Motivatie |
|---|---|---|
| Platform | Progressive Web App (PWA), Android/Chrome | Geen store-distributie nodig, Android ondersteunt zowel NFC-URL-intents als Web Push volledig |
| Frontend | React + TypeScript + Vite, Tailwind CSS | Standaard, snel, goed ondersteund door Claude Code |
| PWA-laag | `vite-plugin-pwa` (service worker, manifest, offline cache) | Vereist voor installatie op beginscherm en voor Web Push in fase 2 |
| Backend/data | Supabase (Postgres, Auth, Edge Functions, pg_cron) | Eén platform voor opslag, RLS en het geplande notificatie-mechanisme |
| Authenticatie | Supabase anonymous sign-in, sessie persistent in browser-storage; later koppelbaar aan e-mail | Geen inlogdrempel bij een NFC-tik, wél RLS-afdwingbaar per `user_id` |
| Hosting | GitHub Pages (HTTPS verplicht), auto-deploy vanaf `main` via GitHub Actions | HTTPS is randvoorwaarde voor PWA, service worker en Web Push; geen aparte hostingpartij nodig naast GitHub |
| Grafieken | Recharts | Voldoende voor staaf- en lijndiagrammen |

---

## 5. Gebruikersstromen

### 5.1 NFC-registratie (primaire stroom)

1. Gebruiker tikt telefoon tegen de NFC-tag op de fles.
2. Android leest de NDEF-URI-record en opent `https://<domein>/log?ml=750&src=nfc`. Staat de PWA geïnstalleerd met *"ondersteunde links openen"* aan, dan opent de geïnstalleerde app in plaats van de browser.
3. De app registreert direct — zonder bevestigingsscherm — en toont een grote visuele bevestiging met de nieuwe dagstand.
4. Gedurende 10 seconden is een **Ongedaan maken**-knop zichtbaar.
5. Na 3 seconden (of bij een tik) gaat de app naar het dashboard.

**Randgevallen:**
- *Dubbele registratie:* is er binnen 90 seconden al een identieke NFC-registratie, dan registreert de app niet stil, maar vraagt expliciet "Nog een fles loggen?".
- *Offline:* de registratie wordt lokaal (IndexedDB) opgeslagen en gesynchroniseerd zodra er verbinding is. De gebruiker ziet direct de bijgewerkte stand met een subtiele "wordt gesynchroniseerd"-indicator.
- *Nog geen sessie in deze browser:* de app maakt automatisch een anonieme sessie aan en registreert alsnog.

### 5.2 Handmatige registratie

Gebruiker opent de app en tikt op een snelknop (Glas 250 ml / Fles 750 ml / Liter 1.000 ml) of op **Anders**, waarna een numeriek invoerveld verschijnt. Registratie is één tik; er volgt geen bevestigingsdialoog, wel een undo.

### 5.3 Correctie

Vanuit het dashboard is de lijst met registraties van vandaag opvouwbaar zichtbaar. Per registratie kan de hoeveelheid worden aangepast of de registratie worden verwijderd. Registraties van eerdere dagen zijn te corrigeren via het historie-scherm.

---

## 6. Functionele eisen

Prioritering volgens MoSCoW. `M` = must (fase 1), `S` = should, `C` = could (fase 3).

### Registreren

| ID | Eis | Prio |
|---|---|---|
| F-01 | De gebruiker kan een registratie toevoegen via een snelknop met vooraf ingestelde inhoud | M |
| F-02 | De gebruiker kan een vrij aantal milliliter invoeren (10–3.000 ml, alleen gehele getallen) | M |
| F-03 | Een NFC-tik registreert automatisch de fles-inhoud zonder verdere interactie | M |
| F-04 | Elke registratie legt bron (`ui`, `nfc`, `manual`), tijdstip en hoeveelheid vast | M |
| F-05 | Een registratie is binnen 10 seconden ongedaan te maken via een undo-actie | M |
| F-06 | Dubbele NFC-registraties binnen 90 seconden worden ter bevestiging voorgelegd in plaats van stil verwerkt | M |
| F-07 | De gebruiker kan de snelknoppen (naam en inhoud) zelf beheren | S |

### Visualiseren

| ID | Eis | Prio |
|---|---|---|
| F-10 | Het hoofdscherm toont een glas/beker dat proportioneel vult ten opzichte van het dagdoel | M |
| F-11 | Het hoofdscherm toont numeriek de stand (bv. "1.750 / 3.000 ml") en het restant | M |
| F-12 | Bij het bereiken van het dagdoel volgt een duidelijke, niet-blokkerende visuele bevestiging | S |
| F-13 | Boven 100% blijft doorregistreren mogelijk; de weergave loopt niet over maar toont het percentage | M |

### Historie

| ID | Eis | Prio |
|---|---|---|
| F-20 | De registraties van vandaag zijn per stuk zichtbaar met tijdstip en bron | M |
| F-21 | Een staafdiagram toont de laatste 7 dagen met de doellijn | M |
| F-22 | Een maandoverzicht toont per dag doel gehaald / niet gehaald | S |
| F-23 | De gebruiker ziet het gemiddelde per dag over de laatste 7 en 30 dagen | S |
| F-24 | De gebruiker kan de historie als CSV exporteren | C |

### Instellingen

| ID | Eis | Prio |
|---|---|---|
| F-30 | Het dagdoel is instelbaar (standaard 3.000 ml) | M |
| F-31 | De daggrens is instelbaar (standaard 04:00, tijdzone Europe/Amsterdam), zodat een glas om 01:00 aan de voorgaande dag wordt toegerekend | M |
| F-32 | De gebruiker kan de anonieme sessie koppelen aan een e-mailadres om data te behouden bij toestelwissel | S |

### Fase 2 — notificaties

| ID | Eis | Prio |
|---|---|---|
| F-40 | De gebruiker kan pushmeldingen aan- of uitzetten en toestemming verlenen | S |
| F-41 | Het systeem controleert op ingestelde momenten (bv. 11:00, 14:00, 17:00, 20:00) of het bijbehorende tussendoel is gehaald | S |
| F-42 | Een melding wordt uitsluitend verstuurd als het tussendoel *niet* is gehaald, met vermelding van de achterstand | S |
| F-43 | De tijdstippen en bijbehorende tussendoelen zijn instelbaar | S |
| F-44 | Er geldt een stilteperiode (standaard 22:00–08:00) waarin niets wordt verstuurd | S |
| F-45 | Een tik op de melding opent de app op het registratiescherm | S |

---

## 7. Datamodel

Alle tabellen hebben RLS aan met policy `user_id = auth.uid()`.

```
settings
  user_id            uuid  PK, FK auth.users
  daily_target_ml    int   default 3000
  day_start_hour     int   default 4
  timezone           text  default 'Europe/Amsterdam'
  quiet_hours        jsonb default '{"from":"22:00","to":"08:00"}'
  created_at         timestamptz
  updated_at         timestamptz

containers                      -- snelknoppen
  id                 uuid  PK
  user_id            uuid  FK
  name               text        -- 'Glas', 'Fles', 'Liter'
  volume_ml          int
  sort_order         int
  is_nfc_default     boolean     -- gekoppeld aan de tag op de fles
  archived           boolean default false

drink_log
  id                 uuid  PK    -- client-generated, t.b.v. offline idempotentie
  user_id            uuid  FK
  amount_ml          int   check (amount_ml between 1 and 5000)
  source             text  check (source in ('ui','nfc','manual'))
  logged_at          timestamptz -- werkelijk tijdstip van drinken
  created_at         timestamptz default now()
  deleted_at         timestamptz -- soft delete t.b.v. undo

push_subscriptions              -- fase 2
  id                 uuid  PK
  user_id            uuid  FK
  endpoint           text  unique
  p256dh             text
  auth               text
  created_at         timestamptz

reminder_rules                  -- fase 2
  id                 uuid  PK
  user_id            uuid  FK
  at_time            time        -- bv. 14:00
  expected_ml        int         -- bv. 1500
  enabled            boolean default true
```

**View `daily_intake`:** aggregeert `drink_log` per logische dag, rekening houdend met `day_start_hour` en `timezone`, en levert `day`, `total_ml`, `target_ml`, `goal_met`.

De client genereert de `id` van een registratie (UUID v4). Daarmee is de synchronisatie van offline-registraties idempotent: een dubbel verzonden rij levert een conflict op de primary key op en wordt genegeerd.

---

## 8. Architectuur en NFC-mechanisme

```
[NFC-tag op fles]
   │  NDEF URI-record: https://<domein>/log?ml=750&src=nfc
   ▼
[Android NFC-intent] ──> [Geïnstalleerde PWA of Chrome]
   │
   ▼
[React-app] ──(offline queue: IndexedDB)──> [Supabase Postgres + RLS]
   │                                              ▲
   ▼                                              │
[Service worker: cache + push-ontvangst]          │
                                                  │
[pg_cron elk uur] ──> [Edge Function: check + web-push] (fase 2)
```

De tag bevat geen geheim en geen gebruikers-identificatie: de sessie zit in de browser-storage van het toestel. Wie de tag scant met een ander toestel krijgt een lege app en registreert niets op het account van de gebruiker.

**Web NFC (`NDEFReader`)** is op Android Chrome beschikbaar en kan optioneel worden ingezet om vanuit de geopende app een tag te lezen of te beschrijven. Dit is een *could*, geen vereiste — de primaire stroom loopt via de URL-intent en werkt ook als de app dicht is.

---

## 9. Hardware en tagconfiguratie

- **Tagtype:** NTAG213 (144 bytes) volstaat ruim voor een URL. NTAG215/216 werkt eveneens.
- **Beschrijven:** met de Android-app *NFC Tools*: `Schrijven → Record toevoegen → URL/URI` → volledige `https://`-URL invoeren → `Schrijven`. Tag pas definitief vergrendelen na het testen; vergrendelen is onomkeerbaar.
- **Plaatsing:** op een kunststof fles werkt een standaardtag. Bij een fles van RVS of aluminium is een *on-metal* tag (met ferrietlaag) noodzakelijk, anders wordt het veld gedempt en leest de tag niet. Water zelf dempt eveneens: plaats de tag bij voorkeur op de dop of hoog op de schouder van de fles.
- **Bevestiging:** waterbestendige tag of afgedekt met transparante tape; de tag gaat mee de tas in en wordt nat.

**Randvoorwaarde:** NFC moet op het toestel aan staan en het scherm ontgrendeld zijn. Dit is niet omzeilbaar en dient als aanname te worden geaccepteerd.

---

## 10. Niet-functionele eisen

| ID | Eis |
|---|---|
| NF-01 | Van NFC-tik tot zichtbare bevestiging: maximaal 2 seconden bij een normale verbinding |
| NF-02 | De app is volledig bruikbaar zonder netwerkverbinding; registraties synchroniseren automatisch bij herstel |
| NF-03 | De app is installeerbaar op het beginscherm en start in standalone-modus |
| NF-04 | Alle interactieve elementen zijn eenhandig bereikbaar (onderste twee derde van het scherm), minimaal 48×48 px |
| NF-05 | Geen dataverlies bij het sluiten van de app tijdens een niet-gesynchroniseerde registratie |
| NF-06 | RLS staat op elke tabel aan; er is geen endpoint dat data van een andere `user_id` teruggeeft |
| NF-07 | De app functioneert in donkere modus (registreren gebeurt ook 's avonds) |

---

## 11. Open punten

| # | Punt | Nodig vóór |
|---|---|---|
| 1 | ~~Domeinnaam en hostingpartij vastleggen~~ — vastgelegd: GitHub Pages op `https://sunny19991234.github.io/Sip/` | Tag beschrijven |
| 2 | Wordt de fles-inhoud van 750 ml bevestigd, of wijkt de werkelijke inhoud af? | Bouw F-03 |
| 3 | Moet koffie/thee/andere dranken meetellen, of uitsluitend water? | Bouw fase 1 |
| 4 | Gewenste tijdstippen en tussendoelen voor de meldingen in fase 2 | Bouw fase 2 |
| 5 | Is export van de historie relevant voor controleafspraken? Zo ja, dan verschuift F-24 naar *should* | Bouw fase 3 |

---

## 12. Acceptatiecriteria fase 1

De MVP is geaccepteerd wanneer:

1. Een tik tegen de fles binnen 2 seconden een registratie van 750 ml oplevert, zichtbaar op het dashboard, zonder handmatige bevestiging.
2. Een registratie binnen 10 seconden ongedaan gemaakt kan worden en de dagstand direct daarop correct is.
3. Registreren zonder netwerkverbinding lukt en de registratie na herstel van de verbinding exact één keer in Supabase staat.
4. Het dashboard de dagstand toont ten opzichte van 3.000 ml, met correcte daggrens om 04:00.
5. Het weekoverzicht zeven dagen toont met de doellijn.
6. De app vanaf het beginscherm start in standalone-modus.
7. Een query op `drink_log` vanuit een andere sessie geen rijen teruggeeft (RLS-verificatie).

---

## 13. Aanpak

| Stap | Resultaat |
|---|---|
| 1 | Supabase-project, schema, RLS-policies en seed van de standaard snelknoppen |
| 2 | React-app met dashboard, glas-visualisatie en handmatige registratie |
| 3 | Offline-laag (IndexedDB-queue + synchronisatie) en undo |
| 4 | PWA-configuratie, deploy op HTTPS-domein, installatie op toestel |
| 5 | `/log`-route, tag beschrijven, end-to-endtest, tag vergrendelen |
| 6 | Historie en instellingen |
| 7 | *Fase 2:* VAPID-sleutels, service worker push-handler, Edge Function, pg_cron-schedule |
