#!/usr/bin/env bash
# Runs on the server, called by .github/workflows/deploy-server.yml once it uploaded the
# new code to $ROOT/app.next. Installs Docker the first time, then rebuilds and restarts.
# A failed build leaves the running version as it is.
set -euo pipefail
ROOT=$1
cd "$ROOT"

SUDO=""
[ "$(id -u)" = 0 ] || SUDO="sudo"
if ! command -v docker >/dev/null; then
  echo "Installing Docker"
  curl -fsSL https://get.docker.com | $SUDO sh
fi
DOCKER="docker"
docker info >/dev/null 2>&1 || DOCKER="$SUDO docker"

if [ ! -f .env ]; then
  echo "Missing $ROOT/.env: set the SERVER_ENV secret." >&2
  exit 1
fi

rm -rf app.old
if [ -d app ]; then mv app app.old; fi
mv app.next app
cp app/deploy/compose.yaml compose.yaml

if ! $DOCKER compose build; then
  echo "Build failed, keeping the running version." >&2
  if [ -d app.old ]; then
    rm -rf app && mv app.old app && cp app/deploy/compose.yaml compose.yaml
  fi
  exit 1
fi
$DOCKER compose up -d --remove-orphans
$DOCKER image prune -f >/dev/null
$DOCKER compose ps
