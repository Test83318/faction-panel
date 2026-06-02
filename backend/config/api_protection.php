<?php

return [

    /*
    |--------------------------------------------------------------------------
    | API Protection Settings
    |--------------------------------------------------------------------------
    |
    | Here you can configure the API backend protection.
    |
    */

    'enabled' => env('API_PROTECTION_ENABLED', false),

    'auth_key' => env('API_AUTH_KEY'),

    'allowed_domains' => array_filter(explode(',', env('API_WHITELIST_DOMAINS', ''))),

    'allowed_ips' => array_filter(explode(',', env('API_WHITELIST_IPS', ''))),

    'strict_ip_check' => env('API_STRICT_IP_CHECK', true),

];
