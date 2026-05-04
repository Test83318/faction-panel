#!/bin/sh
set -e

# Change ownership of storage and bootstrap/cache
chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# First-time setup if vendor is missing
if [ ! -d "vendor" ]; then
    composer install --no-interaction --no-plugins --no-scripts
fi

exec "$@"
