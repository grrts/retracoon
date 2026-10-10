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
```

Then:

```bash
composer dump-env prod
php bin/console doctrine:migrations:migrate -n   # creates the tables
php bin/console cache:clear
```

Point the web server's document root at `server/public/` (Apache or nginx with PHP-FPM; see [Symfony's guide](https://symfony.com/doc/current/setup/web_server_configuration.html)). Check it with `curl https://api.retracoon.com/api/health`, which answers `{"ok":true}`.

Run the migrate command again after each update of the API.

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
| `GET /api/me` 🔒 | Your player, including friend code, gems, No Ads, gem unlocks and world rank. |
| `PATCH /api/me` `{name?, skin?}` 🔒 | Changes name (3-16 letters, digits, spaces; gets a new free tag) or shown skin. |
| `POST /api/me/spend` `{gems, item}` 🔒 | Spends gems on a skin. The same item twice only charges once; 409 when short. |
| `DELETE /api/me` 🔒 | Deletes your player, scores, friendships, purchases and sign-ins, and revokes Sign in with Apple. |
| `POST /api/me/runs` `{stage, level, distance?, skin?}` 🔒 | Records a finished run. Bests only go up. |
| `GET /api/me/friends` 🔒 | You and your friends, ranked. |
| `POST /api/me/friends` `{code}` 🔒 | Adds a friend by code; both of you see each other. 30 tries per hour. |
| `DELETE /api/me/friends/{id}` 🔒 | Removes a friend (both directions). |
| `GET /api/leaderboard?limit=50&offset=0` | The world board, best stage first, then distance. Public, cacheable for 30 s. |
| `GET /api/players/{id}` | One player's public profile and rank. |
| `GET /api/health` | `{"ok":true}` |
| `POST /api/webhooks/revenuecat` | RevenueCat purchase events; checks the shared secret. Grants and refunds gems and No Ads. |
| `GET /account/delete` | Web page explaining how to delete an account (Google Play requires one). |

A player row looks like `{id, name, tag, skin, bestStage, bestLevel, bestDistance, rank}`. Friend codes, gems, unlocks and tokens are never in public responses; tokens are stored only as SHA-256 hashes.

Players registered before accounts existed stay on the board as `legacy` players; nobody can sign in to them.

## Cheating

Scores are sent by the game, so a determined player could send a fake one. The API caps values and rate-limits, which stops casual tampering but not someone who reads the code. If that becomes a problem, the next steps are removing obvious outliers from the board and having the game send a run log the server can check.
