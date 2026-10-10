# Scoreboard and friends

The online scoreboard is a small Symfony API in [`server/`](../server) with a PostgreSQL database. The game talks to it over HTTPS; a website can read the same API later.

Players never make an account. The first time the game goes online it registers, gets a secret token back and keeps it on the device. Every player gets a random name (changeable in the game) and a 6-letter **friend code** to share.

Until the game is built with an API address, the scoreboard screen says "not connected yet" and everything else works offline.

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
CORS_ALLOW_ORIGIN='^(https?://localhost(:[0-9]+)?|capacitor://localhost|https://(www\.)?retracoon\.com)$'
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
| `POST /api/players` `{name?, skin?}` | Registers a player. Returns `{token, player}`. The token is shown only this once. Limited to 20 per IP address per hour. |
| `GET /api/me` 🔒 | Your player, including your friend code and world rank. |
| `PATCH /api/me` `{name?, skin?}` 🔒 | Changes name (3-16 letters, digits, spaces) or shown skin. |
| `DELETE /api/me` 🔒 | Deletes your player, scores and friendships. |
| `POST /api/me/runs` `{stage, level, distance?, skin?}` 🔒 | Records a finished run. Bests only go up. |
| `GET /api/me/friends` 🔒 | You and your friends, ranked. |
| `POST /api/me/friends` `{code}` 🔒 | Adds a friend by code; both of you see each other. 30 tries per hour. |
| `DELETE /api/me/friends/{id}` 🔒 | Removes a friend (both directions). |
| `GET /api/leaderboard?limit=50&offset=0` | The world board, best stage first, then distance. Public, cacheable for 30 s. |
| `GET /api/players/{id}` | One player's public profile and rank. |
| `GET /api/health` | `{"ok":true}` |

A player row looks like `{id, name, skin, bestStage, bestLevel, bestDistance, rank}`. Friend codes and tokens are never in public responses; tokens are stored only as SHA-256 hashes.

## Cheating

Scores are sent by the game, so a determined player could send a fake one. The API caps values and rate-limits, which stops casual tampering but not someone who reads the code. If that becomes a problem, the next steps are removing obvious outliers from the board and having the game send a run log the server can check.
