#!/usr/bin/env bash
# Runs on the server, called by .github/workflows/deploy-server.yml after it uploaded
# compose.yaml and the image GitHub built (image.tar.gz) to $ROOT. Installs Docker the
# first time, loads the image and restarts. Nothing is compiled here, so a small server
# with little memory is fine.
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

if [ -f image.tar.gz ]; then
  gunzip -c image.tar.gz | $DOCKER load
  rm -f image.tar.gz
fi
# Code from earlier deploys, which built the image here.
rm -rf app app.old app.next

$DOCKER compose up -d --remove-orphans
$DOCKER image prune -f >/dev/null
$DOCKER compose ps
