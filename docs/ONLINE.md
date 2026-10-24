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
# Fair scores: a long random key for the replay job, and on to rank only replayed runs
REPLAY_KEY=...
RUN_REPLAY=on
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

### Deploying with GitHub Actions

The easy way: `.github/workflows/deploy-server.yml` puts the whole server on any Linux machine you can SSH into, with Docker. The image from `server/Dockerfile` serves the API and website over HTTPS by itself (FrankenPHP, with a free Let's Encrypt certificate for your domain), and `server/deploy/compose.yaml` runs it next to PostgreSQL and the `app:prizes` job. Each deploy builds the image on GitHub, uploads it, migrates the database and restarts. Nothing is compiled on the server, so the smallest VPS is enough. Docker is installed the first time if it's missing. Pull requests touching `server/` build the image and check it answers `/api/health`.

Start it under Actions > Deploy server > Run workflow; to deploy every merge to `main` that touches `server/`, also set the variable `AUTO_DEPLOY` to `true`.

What the machine needs: SSH access as root (or a user with sudo), ports 80 and 443 open, and your domain's DNS (an `A` record, e.g. `api.retracoon.com`) pointing at it.

Set these under Settings > Secrets and variables > Actions, in the `production` environment or the repository:

| Name | Kind | |
|---|---|---|
| `DEPLOY_HOST` | secret | The server's address. Without it the workflow does nothing |
| `DEPLOY_USER` | secret | The SSH user, `root` by default |
| `DEPLOY_SSH_KEY` | secret | A private key made for deploys only (`ssh-keygen -t ed25519 -f deploy -N ""`); its `.pub` goes in that user's `~/.ssh/authorized_keys` |
| `DEPLOY_KNOWN_HOSTS` | secret | The output of `ssh-keyscan <host>`, so the workflow only talks to your server. Optional, but without it the key is trusted as offered |
| `SERVER_ENV` | secret | The server's settings, written to `<DEPLOY_PATH>/.env` on each deploy: the `.env.local` above without `DATABASE_URL`, plus `DOMAIN` and `POSTGRES_PASSWORD` (below) |
| `DEPLOY_PATH` | variable | Optional deploy folder, `/opt/retracoon` by default |
| `DEPLOY_PORT` | variable | Optional SSH port, 22 by default |
| `API_URL` | variable | Already used by the app builds; the deploy checks `<API_URL>/api/health` afterwards |

```dotenv
# SERVER_ENV: the settings from the .env.local above, and
DOMAIN=api.retracoon.com          # the certificate is made for this name
POSTGRES_PASSWORD=<long random string>
APP_ENV=prod
APP_SECRET=...
# ...
```

The database lives in the Docker volume `retracoon_database_data` and survives deploys; back it up with `docker compose -f /opt/retracoon/compose.yaml exec database pg_dump -U app app > backup.sql`. Logs: `docker compose -f /opt/retracoon/compose.yaml logs app`.

Add one cron job so daily and season prizes are paid even on a quiet day (the API also pays them by itself whenever a board or profile is read):

```cron
*/15 * * * * cd /path/to/server && php bin/console app:prizes
```

## Website

The same Symfony app serves the website, server-rendered with Twig (no JavaScript framework):

| Page | What it is |
|---|---|
| `/` | Landing page: the glow-up clip and pitch, the trailer (once there is one), the mailing list form, today's daily top 5 (once someone has run today), three features with clips, a random rare item from the wiki, quotes (once there are some) |
| `/wiki` | The content wiki (see `server/README.md`) |
| `/privacy` | The privacy policy (`server/templates/site/privacy.html.twig`); use this URL in the stores |
| `/press` | Press kit: pitch, fact sheet and downloads from `server/public/downloads/` |
| `/account/delete` | Account deletion steps for Google Play |

Store buttons appear once their `STORE_*_URL` is set (see the `.env.local` above) and go through the click counter described under "Website: mailing list and visit counts"; until none is set, the page says the game is coming. The landing page also carries the mailing list form.

The clips, screenshots and press downloads in `server/public/site/` and `server/public/downloads/` come from the marketing kit, compressed for the web by `tools/site-media.sh /path/to/marketing` (needs ffmpeg). Rerun it when the kit changes. To add the trailer, put it in the kit as `video/trailer.mp4` and rerun the script: the landing page shows it under the hero, with a "Watch the trailer" button, only while `server/public/site/trailer.mp4` exists. Headings use the game's own pixel font, turned into `server/public/site/retracoon-px.woff2` by `python3 tools/site-font.py` (needs `pip install fonttools brotli`); rerun it if `src/gfx/font.ts` changes. The design direction is in the page CSS, `server/templates/site/_site.css.twig`; the wiki shares its palette, font and shapes in `server/templates/wiki/_style.css.twig`.

Press or player quotes go in `site.press_quotes` in `server/config/services.yaml` (quote, source and an optional link each). The landing page shows them above the closing call to action, and hides the section while the list is empty.

## Daily run, seasons and prizes

- **Daily run.** Everyone plays the same seed each UTC day (the game makes it from the date). The board ranks the furthest stage, and the fastest time breaks ties. Players can try as often as they like; their best run counts. When the day closes, #1 gets **10 gems**.
- **Season.** A season is a UTC calendar month. Every normal run of a signed-in player counts; the board ranks like the world board. When the month closes, #1 gets **300 gems** (`Prizes::SEASON_GEMS`).
- Results from an offline phone still count for 30 minutes after a day or season closes, then the winner is paid. Each board is paid once (a lock plus a unique row per board and place). Only signed-in players are on these boards, so only they can win.
- The game shows a "YOU WON!" popup on the title screen and then marks the prize seen. On Steam, which has no gem shop, the game turns a prize into Bottle Caps (10 per gem).

## Shared runs

**SHARE** on the game-over screen draws a 1200x630 card: the raccoon in its final gear in the area it reached, what ended the run (or "retreated in time"), the stage, and the site address (`VITE_SITE_URL`, default `https://retracoon.com`). Phones open the native share sheet, browsers with the Web Share API use it, and Steam and other desktops save the image and copy the line to the clipboard. Daily runs share a Wordle-style line, like `Retracoon daily 16 Oct · stage 23 · beaten by the Swamp King`.

Signed-in players also get a page for the run: the game sends `POST /api/runs` with the card and the few facts the page shows, and gets back `/r/{id}` on the API's host. That page shows the card, the stage, area, level and loadout (linked into `/wiki`), and the site's store buttons (`STORE_*_URL`, counted through `/go/{store}`; empty ones are hidden). Its Open Graph and Twitter tags point at `/r/{id}.png`, so a shared link previews as the card. Players without an account share the card with a link to the site. Shared runs are deleted with the account; each player can share 30 runs an hour.

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
| `DELETE /api/me` 🔒 | Deletes your player, scores, run logs, friendships, purchases and sign-ins, and revokes Sign in with Apple. |
| `POST /api/me/runs/start` `{mode, day?, kept?}` 🔒 | Starts a run: `{ticket: {id, seed, day, kept}}`, the run's seed and the banked raccoon it starts from (see [run tickets](#run-tickets)). An open normal ticket counts as a death. |
| `POST /api/me/runs` `{stage, level, distance?, skin?, mode?, day?, timeMs?, log?, ticket?, replay?}` 🔒 | Records a finished run. Bests only go up. `mode`: `normal` (world board and season, the default), `daily` (that `day`'s daily board, ranked by stage then `timeMs`) or `best` (an old best from before signing in: world board only). Returns `counted: false` for a daily run whose day has closed, and for a run that fails the [fair-score checks](#fair-scores). `log` is the run's ledger, `ticket` the run's ticket id and `replay` its choices. With `RUN_REPLAY=on` a ticketed run returns `pending: true` and counts once its replay passes. |
| `POST /api/me/prizes/seen` 🔒 | The game showed the prizes in `GET /api/me`'s `prizes`; don't list them again. |
| `GET /api/me/friends` 🔒 | You and your friends, ranked. |
| `POST /api/me/friends` `{code}` 🔒 | Adds a friend by code; both of you see each other. 30 tries per hour. |
| `DELETE /api/me/friends/{id}` 🔒 | Removes a friend (both directions). |
| `GET /api/leaderboard?limit=50&offset=0` | The world board, best stage first, then distance. Public, cacheable for 30 s. |
| `GET /api/daily?day=&limit=50&offset=0` | A day's daily board (today by default): `{day, endsAt, prize, total, players, lastWinner}`. Rows add `stage, level, distance, timeMs`. Public, 30 s cache. |
| `GET /api/season?season=&limit=50&offset=0` | This season's board (`YYYY-MM`), with last season's winner. Public, 30 s cache. |
| `POST /api/events` `{device, platform, version, events: [{name, at, props}]}` | Gameplay tracking, guests included; at most 50 events per call. 204. |
| `GET /api/stats?days=14` | Soft-launch numbers; needs `X-Stats-Key`. |
| `GET /api/admin/replays?limit=100`, `POST /api/admin/replays` `{results}` | Runs waiting for a replay, and the replay job's results; need `X-Replay-Key` (see [replay](#replay)). |
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

### Run tickets

A ledger proves the numbers add up, not that the fights went that way. So a signed-in run starts with a ticket: `POST /api/me/runs/start` (`{mode, day, kept}`) returns `{ticket: {id, seed, day, kept}}`. The seed decides every roll of the run (daily runs keep the day's seed), and `kept` is the banked raccoon from the server's own record, not the phone's. The first time an account asks, the phone's banked raccoon is adopted once if it is plausible; after that, editing local storage gains nothing.

- One result per ticket. Starting a new normal run while one is still open counts the open one as a death, so the banked raccoon is lost, the same as on the phone.
- The result must name its ticket, its ledger must start from the ticket's raccoon, and its time can't be more than 60 s longer than the server saw pass since the ticket. The daily board ranks on the longer of the claimed time and the server's time minus 60 s.
- Tickets expire after 2 days. A run played offline, or while signed out, is unranked and doesn't change the account's banked raccoon.

### Replay

A ticketed result also carries every choice of the run (`src/game/replay.ts`): one entry per arrive, skill and target, end turn, retreat, road, reward, shop buy, camp, event option, stat point, card and FORGET, each with the time since the last one. The run's rules live in `src/game/flow.ts` (`RunFlow`), which the scenes only drive, so the same code replays a run without Phaser. `npx tsx tools/replay-check.ts` (in CI) plays bot runs of every kind, replays them, and checks that forged logs fail.

A replay passes when the choices are legal, it ends where the result says (died or retreated, stage, level, distance), its clock fits the claimed time, and no choice comes faster than the game allows. Runs are replayed by `tools/replay-worker.ts`, on a checkout of the exact game build they were played on (`BUILD`, the commit sha baked in by `vite.config.ts`):

- `.github/workflows/replay.yml` runs it every 10 minutes. It needs the `API_URL` repository variable and the `REPLAY_KEY` secret.
- It reads waiting runs from `GET /api/admin/replays` and posts results to `POST /api/admin/replays`, both with the `X-Replay-Key` header. Without `REPLAY_KEY` on the server the endpoints don't exist.
- A run whose build isn't a commit in the repository (a dev build, one with local changes, a pull request's merge commit) can't be replayed and is treated as failed. **Release builds must be built from a commit on `main` or a tag**, as the release workflows do.

With `RUN_REPLAY=on` on the server, a ticketed run only counts once its replay passes (the game is told `pending: true`), unticketed runs count nowhere, and prizes wait up to 3 days for a board's pending replays. Without it, runs count right away and replays only mark cheaters: a failed replay still takes the run off the boards. Either way a failed replay also wipes the banked raccoon it left and fails every run started from it.

```sh
# server .env.local
RUN_REPLAY=on
REPLAY_KEY=<long random string, same as the GitHub secret>
```

`app:runs` shows each run's replay state. A passed replay is kept only for runs that set a best.

### What this doesn't stop yet

A modified game that plays real, legal choices for the player (a bot) still passes, because a replay only proves the run could be played. **Platform attestation** (Play Integrity, App Attest) on ticket requests is the next step if bots show up.
