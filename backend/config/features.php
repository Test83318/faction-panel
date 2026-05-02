<?php

return [
    'allow_registration' => env('ALLOW_REGISTRATION', true),
    'gtaw_oauth_enabled' => env('GTAW_OAUTH_ENABLED', false),
    'gtaw_base_url' => env('GTAW_BASE_URL', 'https://ucp.gta.world'),
    'gtaw_client_id' => env('GTAW_CLIENT_ID'),
    'gtaw_client_secret' => env('GTAW_CLIENT_SECRET'),
    'gtaw_redirect_uri' => env('GTAW_REDIRECT_URI'),
];
