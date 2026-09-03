FROM php:8.3-fpm-alpine AS deps

RUN apk add --no-cache \
    libpq \
    icu-dev \
    libzip-dev \
    $PHPIZE_DEPS \
    && docker-php-ext-install -j$(nproc) pdo_pgsql pgsql intl zip \
    && pecl install redis \
    && docker-php-ext-enable redis

RUN apk add --no-cache composer

WORKDIR /var/www/html

FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    libpq \
    icu-libs \
    libzip \
    nginx \
    supervisor \
    curl \
    netcat-openbsd

COPY --from=deps /usr/local/bin/composer /usr/local/bin/composer
COPY --from=deps /usr/local/etc/php /usr/local/etc/php
COPY --from=deps /usr/local/lib/php/extensions /usr/local/lib/php/extensions

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint"]