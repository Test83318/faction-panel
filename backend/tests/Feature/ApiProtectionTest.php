<?php

use Illuminate\Support\Facades\Route;

beforeEach(function () {
    // Register a temporary test route within the API middleware group
    Route::get('/api/test-protection', function () {
        return response()->json(['message' => 'Passed API Protection!']);
    })->middleware('api');
});

test('when api protection is disabled, requests without key or headers pass through', function () {
    config(['api_protection.enabled' => false]);

    $response = $this->getJson('/api/test-protection');

    $response->assertStatus(200)
        ->assertJson(['message' => 'Passed API Protection!']);
});

test('when api protection is enabled, request without auth key is rejected', function () {
    config([
        'api_protection.enabled' => true,
        'api_protection.auth_key' => 'secret_key',
        'api_protection.allowed_domains' => ['localhost'],
        'api_protection.allowed_ips' => ['127.0.0.1'],
        'api_protection.strict_ip_check' => false,
    ]);

    $response = $this->getJson('/api/test-protection');

    $response->assertStatus(401)
        ->assertJsonPath('message', 'Unauthorized: Invalid or missing API authentication key.');
});

test('when api protection is enabled, request with wrong auth key is rejected', function () {
    config([
        'api_protection.enabled' => true,
        'api_protection.auth_key' => 'secret_key',
        'api_protection.allowed_domains' => ['localhost'],
        'api_protection.allowed_ips' => ['127.0.0.1'],
        'api_protection.strict_ip_check' => false,
    ]);

    $response = $this->withHeaders([
        'X-API-Auth-Key' => 'wrong_key',
    ])->getJson('/api/test-protection');

    $response->assertStatus(401)
        ->assertJsonPath('message', 'Unauthorized: Invalid or missing API authentication key.');
});

test('when api protection is enabled, request with missing Origin/Referer is rejected', function () {
    config([
        'api_protection.enabled' => true,
        'api_protection.auth_key' => 'secret_key',
        'api_protection.allowed_domains' => ['localhost'],
        'api_protection.allowed_ips' => ['127.0.0.1'],
        'api_protection.strict_ip_check' => false,
    ]);

    $response = $this->withHeaders([
        'X-API-Auth-Key' => 'secret_key',
    ])->getJson('/api/test-protection');

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Unauthorized: Request domain could not be verified (missing Origin/Referer).');
});

test('when api protection is enabled, request from non-whitelisted domain is rejected', function () {
    config([
        'api_protection.enabled' => true,
        'api_protection.auth_key' => 'secret_key',
        'api_protection.allowed_domains' => ['allowed.com'],
        'api_protection.allowed_ips' => ['127.0.0.1'],
        'api_protection.strict_ip_check' => false,
    ]);

    $response = $this->withHeaders([
        'X-API-Auth-Key' => 'secret_key',
        'Origin' => 'https://malicious.com',
    ])->getJson('/api/test-protection');

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Unauthorized: Domain malicious.com is not whitelisted.');
});

test('when api protection is enabled, request from whitelisted domain that fails IP check is rejected', function () {
    config([
        'api_protection.enabled' => true,
        'api_protection.auth_key' => 'secret_key',
        'api_protection.allowed_domains' => ['google.com'],
        'api_protection.allowed_ips' => ['127.0.0.1'], // google.com resolves to non-127.0.0.1 IP
        'api_protection.strict_ip_check' => false,
    ]);

    $response = $this->withHeaders([
        'X-API-Auth-Key' => 'secret_key',
        'Origin' => 'https://google.com',
    ])->getJson('/api/test-protection');

    $response->assertStatus(403);
    expect($response->json('message'))->toContain('is not whitelisted');
});

test('when api protection is enabled, request from whitelisted domain and IP passes', function () {
    config([
        'api_protection.enabled' => true,
        'api_protection.auth_key' => 'secret_key',
        'api_protection.allowed_domains' => ['localhost'],
        'api_protection.allowed_ips' => ['127.0.0.1'],
        'api_protection.strict_ip_check' => false,
    ]);

    $response = $this->withHeaders([
        'X-API-Auth-Key' => 'secret_key',
        'Origin' => 'http://localhost',
    ])->getJson('/api/test-protection');

    $response->assertStatus(200)
        ->assertJson(['message' => 'Passed API Protection!']);
});

test('when strict ip check is enabled, request from mismatching client IP is rejected', function () {
    config([
        'api_protection.enabled' => true,
        'api_protection.auth_key' => 'secret_key',
        'api_protection.allowed_domains' => ['localhost'],
        'api_protection.allowed_ips' => ['127.0.0.1'],
        'api_protection.strict_ip_check' => true,
    ]);

    $response = $this->withHeaders([
        'X-API-Auth-Key' => 'secret_key',
        'Origin' => 'http://localhost',
    ])->withServerVariables([
        'REMOTE_ADDR' => '192.168.1.50',
    ])->getJson('/api/test-protection');

    $response->assertStatus(403)
        ->assertJsonPath('message', 'Unauthorized: Client IP 192.168.1.50 does not match resolved domain IP 127.0.0.1.');
});
