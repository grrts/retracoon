# Retracoon API

Scoreboard and friends for the game, and later a website. Symfony 7.4 (LTS) with Doctrine and PostgreSQL.

Setup, deployment and the list of endpoints: [docs/ONLINE.md](../docs/ONLINE.md).

```bash
composer install
php bin/phpunit                    # tests run on SQLite
php -S 127.0.0.1:8000 -t public    # local API (needs DATABASE_URL, see docs)
```

| | |
|---|---|
| `src/Entity/` | `Player` (name, friend code, token hash, bests) and `Friendship` |
| `src/Controller/` | `PlayerController` (register, me, runs), `FriendController`, `BoardController` (public) |
| `src/Security/ApiTokenHandler.php` | Bearer token to player |
| `config/packages/rate_limiter.yaml` | Limits on sign-ups, runs and friend-code tries |
| `migrations/` | Database schema |
