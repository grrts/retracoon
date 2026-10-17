# Accounts, scoreboard and friends

The online scoreboard is a small Symfony API in [`server/`](../server) with a PostgreSQL database. The game talks to it over HTTPS; a website can read the same API later.

Players sign in with **Google, Apple or Steam** (setup: [ACCOUNTS.md](ACCOUNTS.md)). The account is the player: signing in with it on another device gets the same name, scores, friends, gems and purchases back. Each device keeps its own secret token. Names are shown as **NAME#1234**: anyone can pick any name, and the 4-digit tag makes it unique. Every player also gets a 6-letter **friend code** to share.

Anyone can play as a guest. Sign-in is offered at the first launch and asked for when a guest opens the scoreboard or buys something (Apple doesn't allow a login wall in front of a game). Steam signs in by itself.

Until the game is built with an API address, there is no sign-in, the scoreboard screen says "not connected yet" and everything else works offline.

## What you need to provide

1. **A server that runs PHP 8.2 or newer** with the `pdo_pgsql`, `intl` and `ctype` extensions. Any small VPS, a PHP host (Hostinger, TransIP, Combell…), or a platform like Railway or Render.
2. **A PostgreSQL 16 database.** Many hosts include one; managed options like Neon or Supabase's plain Postgres also work.
3. **A domain for the API**, for example `api.retracoon.com`, with HTTPS.

Then send the API address (for example `https://api.retracoon.com`) or set it yourself as described below.

## Deploying the API

```bash
cd server
composer install --no-dev --optimize-autoloader
```

Create `server/.env.local` on the server (never commit it):

```dotenv
APP_ENV=prod
APP_SECRET=<32 random characters, e.g. from: php -r "echo bin2hex(random_bytes(16));">
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?serverVersion=16&charset=utf8"
# Origins allowed to call the API from a browser: the apps, plus your website later.
# app://game is the Steam app.
CORS_ALLOW_ORIGIN='^(https?://localhost(:[0-9]+)?|capacitor://localhost|app://game|https://(www\.)?retracoon\.com)$'
# Sign-in, purchases and the deletion page: see docs/ACCOUNTS.md
GOOGLE_CLIENT_IDS=...
APPLE_AUDIENCES=com.retracoon.game
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
STEAM_WEB_API_KEY=...
STEAM_APP_ID=...
REVENUECAT_WEBHOOK_AUTH=...
SUPPORT_EMAIL=support@retracoon.com
# Optional: a long random key that unlocks GET /api/stats (soft-launch numbers)
STATS_KEY=...
# Website: the mailing list's confirm emails (any SMTP provider), and the store pages
# behind the store buttons. Leave a store empty to hide its button until it is live.
MAILER_DSN=smtp://USER:PASSWORD@smtp.example.com:587
MAILER_FROM="Retracoon <news@retracoon.com>"
STORE_GOOGLE_PLAY_URL=https://play.google.com/store/apps/details?id=com.retracoon.game
STORE_APP_STORE_URL=
STORE_STEAM_URL=
# The site's address, used for links in emails and exports
DEFAULT_URI=https://retracoon.com
```

Then:

```bash
composer dump-env prod
php bin/console doctrine:migrations:migrate -n   # creates the tables
php bin/console cache:clear
```

Point the web server's document root at `server/public/` (Apache or nginx with PHP-FPM; see [Symfony's guide](https://symfony.com/doc/current/setup/web_server_configuration.html)). Check it with `curl https://api.retracoon.com/api/health`, which answers `{"ok":true}`.

Run the migrate command again after each update of the API.

Add one cron job so daily and season prizes are paid even on a quiet day (the API also pays them by itself whenever a board or profile is read):

```cron
*/15 * * * * cd /path/to/server && php bin/console app:prizes
```

## Daily run, seasons and prizes

- **Daily run.** Everyone plays the same seed each UTC day (the game makes it from the date). The board ranks the furthest stage, and the fastest time breaks ties. Players can try as often as they like; their best run counts. When the day closes, #1 gets **10 gems**.
- **Season.** A season is a UTC calendar month. Every normal run of a signed-in player counts; the board ranks like the world board. When the month closes, #1 gets **300 gems** (`Prizes::SEASON_GEMS`).
- Results from an offline phone still count for 30 minutes after a day or season closes, then the winner is paid. Each board is paid once (a lock plus a unique row per board and place). Only signed-in players are on these boards, so only they can win.
- The game shows a "YOU WON!" popup on the title screen and then marks the prize seen. On Steam, which has no gem shop, the game turns a prize into Bottle Caps (10 per gem).

## Gameplay tracking

The game sends a few events to `POST /api/events` under a random install id made on the device: `app_open`, `tutorial_done`, `run_start`, `run_end` (mode, reason, stage, area, level, bosses, time), `area_reached`, `boss_beaten`, `sign_in`, `purchase`, `shop_open`, `scores_open`. They are not linked to the account. Players can turn it off with STATS ON/OFF on the title screen.

Read the numbers on the server:

```bash
php bin/console app:stats --days=14
```

That prints installs, players, runs, daily runs, median stage, the share of runs that left the first area, and day 1, 7 and 30 retention per install day. The same numbers come from `GET /api/stats?days=14` with header `X-Stats-Key: <STATS_KEY>` (404 without it). Good soft-launch targets: 35% back on day 1, 10% on day 7.

Events are kept until you delete them, e.g. `DELETE FROM play_event WHERE at < now() - interval '180 days'` in a monthly cron job.

## Website: mailing list and visit counts

**Mailing list.** `/list` has a sign-up form (email only); any page can show it with `{% include 'list/_signup.html.twig' %}`. Signing up sends a confirm link (double opt-in), and only confirmed addresses are on the list. Unconfirmed sign-ups are deleted after a week; unsubscribing deletes the address. Confirm and unsubscribe links open a page with a button, so mail scanners that open links can't act on them. Export the list for your mail tool:

```bash
php bin/console app:mailing-list:export -o list.csv   # email, confirmed_at, unsubscribe_url
```

Put each address's `unsubscribe_url` in the mail as a link, and in the `List-Unsubscribe` header with `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (the link accepts that one-click POST).

**Visits and store clicks.** The landing page (`/`) counts its visits, and store buttons go through `/go/google-play`, `/go/app-store` and `/go/steam`, which count the click and redirect to the `STORE_*_URL`. In Twig: `{% if store_live('steam') %}<a href="{{ store_link('steam') }}">...</a>{% endif %}`; `store_link()` carries the visit's referring site and UTM tags into the click. Only daily counters are stored per referring site and `utm_source`, `utm_medium`, `utm_campaign`: no cookies, IP addresses or anything else about the visitor. Bots are skipped, and one address counts at most 30 times an hour. `app:stats` prints them under the game numbers, with the mailing list size. Tag links you post, e.g. `https://retracoon.com/?utm_source=reddit&utm_campaign=launch`.

## Connecting the game

The game reads the address at build time from `VITE_API_URL`:

- **Local build:** `VITE_API_URL=https://api.retracoon.com npm run build` (or put it in a `.env.local` file next to `package.json`).
- **GitHub builds** (Android and iOS workflows): add a repository **variable** `API_URL` under Settings > Secrets and variables > Actions > Variables.

## Running it locally

```bash
cd server
docker compose up -d database          # PostgreSQL on localhost:5432 (user/password/db: app)
composer install
php bin/console doctrine:migrations:migrate -n
php -S 127.0.0.1:8000 -t public        # the API on http://127.0.0.1:8000
php bin/phpunit                        # tests (SQLite, no database needed)
```

Then run the game with `VITE_API_URL=http://127.0.0.1:8000 npm run dev`.

## API

All responses are JSON; errors use `application/problem+json` with a `detail` message. Calls marked 🔒 need `Authorization: Bearer <token>`.

| Call | What it does |
|---|---|
| `POST /api/auth` `{provider, credential, code?, name?, skin?}` | Signs in with `google`/`apple` (ID token) or `steam` (Web API ticket). Makes the player the first time, with a free NAME#tag. Returns `{token, created, player}`; 201 when new. 20 per IP address per hour. |
| `GET /api/me` 🔒 | Your player, including friend code, gems, No Ads, gem unlocks, world rank, today's daily run and this season (`daily`, `season`: stage and rank, or null) and prizes won but not shown yet (`prizes`). |
| `PATCH /api/me` `{name?, skin?}` 🔒 | Changes name (3-16 letters, digits, spaces; gets a new free tag) or shown skin. |
| `POST /api/me/spend` `{gems, item}` 🔒 | Spends gems on a skin. The same item twice only charges once; 409 when short. |
| `DELETE /api/me` 🔒 | Deletes your player, scores, friendships, purchases and sign-ins, and revokes Sign in with Apple. |
| `POST /api/me/runs` `{stage, level, distance?, skin?, mode?, day?, timeMs?}` 🔒 | Records a finished run. Bests only go up. `mode`: `normal` (world board and season, the default), `daily` (that `day`'s daily board, ranked by stage then `timeMs`) or `best` (an old best from before signing in: world board only). Returns `counted: false` for a daily run whose day has closed. |
| `POST /api/me/prizes/seen` 🔒 | The game showed the prizes in `GET /api/me`'s `prizes`; don't list them again. |
| `GET /api/me/friends` 🔒 | You and your friends, ranked. |
| `POST /api/me/friends` `{code}` 🔒 | Adds a friend by code; both of you see each other. 30 tries per hour. |
| `DELETE /api/me/friends/{id}` 🔒 | Removes a friend (both directions). |
| `GET /api/leaderboard?limit=50&offset=0` | The world board, best stage first, then distance. Public, cacheable for 30 s. |
| `GET /api/daily?day=&limit=50&offset=0` | A day's daily board (today by default): `{day, endsAt, prize, total, players, lastWinner}`. Rows add `stage, level, distance, timeMs`. Public, 30 s cache. |
| `GET /api/season?season=&limit=50&offset=0` | This season's board (`YYYY-MM`), with last season's winner. Public, 30 s cache. |
| `POST /api/events` `{device, platform, version, events: [{name, at, props}]}` | Gameplay tracking, guests included; at most 50 events per call. 204. |
| `GET /api/stats?days=14` | Soft-launch numbers; needs `X-Stats-Key`. |
| `GET /api/players/{id}` | One player's public profile and rank. |
| `GET /api/health` | `{"ok":true}` |
| `POST /api/webhooks/revenuecat` | RevenueCat purchase events; checks the shared secret. Grants and refunds gems and No Ads. |
| `GET /account/delete` | Web page explaining how to delete an account (Google Play requires one). |

A player row looks like `{id, name, tag, skin, bestStage, bestLevel, bestDistance, rank}`. Friend codes, gems, unlocks and tokens are never in public responses; tokens are stored only as SHA-256 hashes.

Players registered before accounts existed stay on the board as `legacy` players; nobody can sign in to them.

## Cheating

Scores are sent by the game, so a determined player could send a fake one. The API caps values and rate-limits, which stops casual tampering but not someone who reads the code. If that becomes a problem, the next steps are removing obvious outliers from the board and having the game send a run log the server can check.
