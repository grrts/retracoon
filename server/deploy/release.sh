#!/usr/bin/env bash
# Runs on the server, called by .github/workflows/deploy-server.yml after it unpacked a
# release into $ROOT/releases/<name>. Links the shared config and data, migrates the
# database, warms the cache and then switches $ROOT/current to the new release.
#
#   $ROOT/current -> releases/<name>   point the web server at $ROOT/current/public
#   $ROOT/shared/.env.local            the server's settings (docs/ONLINE.md)
#   $ROOT/shared/var/{log,share}       kept across releases
set -euo pipefail

ROOT=$1
NAME=$2
KEEP=${KEEP_RELEASES:-5}
RELEASE="$ROOT/releases/$NAME"
SHARED="$ROOT/shared"

if [ ! -f "$SHARED/.env.local" ]; then
  echo "Missing $SHARED/.env.local: create it on the server or set the SERVER_ENV secret." >&2
  exit 1
fi

mkdir -p "$SHARED/var/log" "$SHARED/var/share" "$RELEASE/var"
ln -sfn "$SHARED/.env.local" "$RELEASE/.env.local"
ln -sfn "$SHARED/var/log" "$RELEASE/var/log"
ln -sfn "$SHARED/var/share" "$RELEASE/var/share"

cd "$RELEASE"
export APP_ENV=prod APP_DEBUG=0
php bin/console assets:install public --no-interaction
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
php bin/console cache:clear --no-interaction
php bin/console cache:warmup --no-interaction

# Swap atomically, so requests see either the old release or the new one.
ln -sfn "releases/$NAME" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
echo "Live: $RELEASE"

if [ -n "${RELOAD_CMD:-}" ]; then
  echo "Running: $RELOAD_CMD"
  bash -c "$RELOAD_CMD"
fi

# Keep the newest few releases for a quick rollback (point current back at one).
cd "$ROOT/releases"
ls -1t | tail -n +"$((KEEP + 1))" | while read -r old; do
  [ "$old" = "$NAME" ] || rm -rf -- "$old"
done
