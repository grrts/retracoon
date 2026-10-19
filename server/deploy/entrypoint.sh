#!/bin/sh
# Before the web server starts, bring the database up to date and warm the cache.
set -e
case "$1" in
  -*|frankenphp)
    php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
    php bin/console cache:warmup --no-interaction
    ;;
esac
exec docker-php-entrypoint "$@"
