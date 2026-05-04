#!/bin/bash

# Install dependencies if vendor directory is missing
if [ ! -d "vendor" ]; then
    composer install --no-interaction --no-plugins --no-scripts
fi

# Ensure storage and cache permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Run migrations (optional, can be done manually)
# php artisan migrate --force

exec "$@"
