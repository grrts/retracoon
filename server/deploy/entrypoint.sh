#!/bin/sh
# Before the web server starts, bring the database up to date and warm the cache.
set -e
case "$1" in
  -*|frankenphp)
    php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
    php bin/console cache:warmup --no-interaction
    ;;
esac

# The test build of the game at /play/ (public/play): only behind a password, set with
# PLAY_PASSWORD (and PLAY_USER, default "tester"). Without one, /play/ is a 404.
{
  if [ -n "$PLAY_PASSWORD" ] && [ -d public/play ]; then
    printf '@play path /play /play/*\nbasic_auth @play {\n\t%s %s\n}\n' \
      "${PLAY_USER:-tester}" "$(frankenphp hash-password --plaintext "$PLAY_PASSWORD")"
    printf 'redir /play /play/ 308\nrewrite /play/ /play/index.html\n'
  else
    printf 'respond /play* 404\n'
  fi
} > /etc/frankenphp/play.caddyfile

exec docker-php-entrypoint "$@"
