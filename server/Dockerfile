# The API and website in one image: FrankenPHP serves public/ and gets the HTTPS
# certificate for SERVER_NAME by itself. Run by deploy/compose.yaml (docs/ONLINE.md).
# The game itself is served at /play/ when public/play holds a browser build of it
# (deploy-server.yml puts one there).
FROM dunglas/frankenphp:1-php8.3

RUN install-php-extensions pdo_pgsql intl opcache zip
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV APP_ENV=prod APP_DEBUG=0 COMPOSER_ALLOW_SUPERUSER=1
WORKDIR /app

COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --no-progress

COPY . .
RUN composer dump-autoload --no-dev --classmap-authoritative \
 && php bin/console assets:install public --no-interaction \
 && rm -rf var/cache

COPY deploy/entrypoint.sh /usr/local/bin/retracoon-entrypoint
COPY deploy/play.caddyfile /etc/frankenphp/play.caddyfile
ENV CADDY_SERVER_EXTRA_DIRECTIVES="import /etc/frankenphp/play.caddyfile"
ENTRYPOINT ["retracoon-entrypoint"]
CMD ["--config", "/etc/frankenphp/Caddyfile", "--adapter", "caddyfile"]
