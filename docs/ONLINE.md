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
| `DELETE /api/me` 🔒 | Deletes your player, scores, run logs, friendships, purchases and sign-ins, and revokes Sign in with Apple. |
| `POST /api/me/runs` `{stage, level, distance?, skin?, mode?, day?, timeMs?, log?}` 🔒 | Records a finished run. Bests only go up. `mode`: `normal` (world board and season, the default), `daily` (that `day`'s daily board, ranked by stage then `timeMs`) or `best` (an old best from before signing in: world board only). Returns `counted: false` for a daily run whose day has closed, and for a run that fails the [fair-score checks](#fair-scores). `log` is the run's ledger. |
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

## Fair scores

The game runs on the player's device, so the server can't watch a run. Instead the game keeps a **ledger** of each run and sends it with the score. It is not a full log of the run, only how the score was earned: the raccoon it started with (level, stats, points), one short entry per fight (start and end time, won or lost, turns, meters walked) and per gain (XP, stat points from road stops, stat changes from events, meters), and the raccoon it ended with. See `src/game/ledger.ts`. A 30-fight run is about 1.2 KB.

`RunAudit` (`server/src/Service/RunAudit.php`) adds the ledger up and checks it lands exactly on the score:

| Check | Catches |
|---|---|
| Won fights = stage; meters add up to the distance | an edited stage or distance |
| XP, turned into levels the way the game does (10 + 7 per level), lands on the level sent | an edited level, or XP from nowhere |
| Stats and points at the end = at the start + 3 per level + road-stop gains | stats edited mid-run |
| At least 1 s between fights and 0.2 s a turn; at least 1 s a fight overall, even without a ledger | runs faster than the game can play |
| Nothing after a lost fight; times in order | a made-up or spliced ledger |
| A daily run starts as a fresh level 1 raccoon, and gains at most 5 + 2 levels a fight | an edited daily run |
| A best over 3x the player's last best (past stage 30) | flagged, still counts |

Every change to level, XP, stats, stat points or distance in the game has to write a ledger entry (`note()` in `src/game/ledger.ts`, already called from `gainXp`, TRAIN and event stat changes). A new way to gain any of these without an entry would make honest runs fail the check.

Each run gets a verdict: `ok`, `unlogged` (older game versions, and bests made while signed out), `suspect` (counts, flagged) or `rejected` (counts nowhere; the game sees `counted: false` and moves on). Runs that set a best, and every suspect or rejected run, are kept with their ledger in `run_log`; other runs are not, so the table stays small.

```sh
php bin/console app:runs                 # newest suspect and rejected runs
php bin/console app:runs --player ID     # one player's kept runs
php bin/console app:runs --hide ID       # off every public board and out of prizes
php bin/console app:runs --unhide ID
```

A hidden player still sees their own scores and rank, so nothing tells them.

The game also counts a normal run that never ended (the app was closed mid-run) as a death the next time PLAY is pressed, so closing the app in a losing fight no longer keeps the banked raccoon.

### What this doesn't stop yet

These checks prove a ledger adds up, not that the fights in it went that way. Someone who studies the code can still write a ledger that passes. Planned next, in order:

1. **Run tickets.** `POST /api/me/runs/start` hands out a run id, a seed and the starting raccoon from the server's own record of the banked raccoon, so editing local storage gains nothing. One result per ticket; a ticket that never comes back counts as a death. Only ticketed runs rank; guests still play offline. Cost: one small row per run start, same server.
2. **Replay.** Seed every normal run from its ticket (the daily run already is), and record every decision: skill and target each turn, stat points, picks, road stops, shop buys, retreat. A verifier reruns those decisions through the game's own engine in `src/game/` (as `npm run sim` already does, headless) and checks it ends at the same score. This needs the run flow that lives in `RunScene`/`StopScenes` moved into `src/game/` first, and every logic roll on `rand()`, not `Math.random()`. Replay is a few milliseconds of CPU a run, but it needs Node, which plain PHP hosting doesn't have. To keep hosting free, only board-relevant runs (top 100, and every prize winner before it's paid) get replayed, by a scheduled GitHub Actions job that reads unverified runs from an admin endpoint and writes back verdicts. On a VPS the same verifier can run next to Symfony instead.
3. **Platform attestation** (Play Integrity, App Attest) on ticket requests, if bots show up.

