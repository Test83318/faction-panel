<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['features.gtaw_oauth_enabled' => true]);
    config(['features.allow_registration' => true]);
    config(['features.gtaw_base_url' => 'https://ucp.gta.world']);
    config(['features.gtaw_client_id' => 'client_id']);
    config(['features.gtaw_client_secret' => 'client_secret']);
    config(['features.gtaw_redirect_uri' => 'http://localhost:3000/auth/gtaw/callback']);
});

test('user can login with username and password', function () {
    $password = 'password123';
    $user = User::factory()->create([
        'username' => 'testuser',
        'password' => Hash::make($password),
    ]);

    $response = $this->postJson('/api/login', [
        'username' => 'testuser',
        'password' => $password,
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'access_token',
            'token_type',
            'user' => ['id', 'username'],
        ]);
});

test('user cannot login with wrong credentials', function () {
    $user = User::factory()->create([
        'username' => 'testuser',
        'password' => Hash::make('correct_password'),
    ]);

    $response = $this->postJson('/api/login', [
        'username' => 'testuser',
        'password' => 'wrong_password',
    ]);

    $response->assertStatus(422);
});

test('authenticated user can get their profile', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/user');

    $response->assertStatus(200)
        ->assertJsonPath('username', $user->username);
});

test('user can logout', function () {
    $user = User::factory()->create();
    $token = $user->createToken('test')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer $token")
        ->postJson('/api/logout');

    $response->assertStatus(200);
    expect($user->tokens()->count())->toBe(0);
});

test('gtaw callback creates new user when username is unique', function () {
    Http::fake([
        'https://ucp.gta.world/oauth/token' => Http::response(['access_token' => 'mock_token'], 200),
        'https://ucp.gta.world/api/user' => Http::response([
            'id' => 12345,
            'username' => 'UniqueGTAWUser',
        ], 200),
    ]);

    $response = $this->postJson('/api/auth/gtaw/callback', ['code' => 'valid_code']);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'access_token',
            'token_type',
            'user' => ['id', 'username'],
        ]);

    $this->assertDatabaseHas('users', [
        'username' => 'UniqueGTAWUser',
        'gtaw_id' => '12345',
        'gtaw_username' => 'UniqueGTAWUser',
    ]);
});

test('gtaw callback creates new user with random digits appended when username collision exists', function () {
    // Create an existing user with the same username
    User::factory()->create([
        'username' => 'CollidingUser',
    ]);

    Http::fake([
        'https://ucp.gta.world/oauth/token' => Http::response(['access_token' => 'mock_token'], 200),
        'https://ucp.gta.world/api/user' => Http::response([
            'id' => 67890,
            'username' => 'CollidingUser',
        ], 200),
    ]);

    $response = $this->postJson('/api/auth/gtaw/callback', ['code' => 'valid_code']);

    $response->assertStatus(200);

    $createdUser = User::where('gtaw_id', '67890')->first();
    expect($createdUser)->not->toBeNull();
    expect($createdUser->gtaw_username)->toBe('CollidingUser');
    // Username should be 'CollidingUser' plus 4 digits
    expect($createdUser->username)->toStartWith('CollidingUser');
    expect(strlen($createdUser->username))->toBe(strlen('CollidingUser') + 4);
    expect(substr($createdUser->username, -4))->toMatch('/^\d{4}$/');
});

test('gtaw callback links to authenticated user', function () {
    $existingUser = User::factory()->create([
        'username' => 'ExistingWebUser',
        'gtaw_id' => null,
    ]);

    Http::fake([
        'https://ucp.gta.world/oauth/token' => Http::response(['access_token' => 'mock_token'], 200),
        'https://ucp.gta.world/api/user' => Http::response([
            'id' => 54321,
            'username' => 'GtawAccount',
        ], 200),
    ]);

    $response = $this->actingAs($existingUser)
        ->postJson('/api/auth/gtaw/callback', ['code' => 'valid_code']);

    $response->assertStatus(200);

    $existingUser->refresh();
    expect($existingUser->gtaw_id)->toBe('54321');
    expect($existingUser->gtaw_username)->toBe('GtawAccount');
    expect($existingUser->username)->toBe('ExistingWebUser'); // Username should NOT be changed when linking
});

test('gtaw callback fails linking if gtaw_id is already linked to another user', function () {
    $otherUser = User::factory()->create([
        'username' => 'OtherUser',
        'gtaw_id' => '54321',
        'gtaw_username' => 'GtawAccount',
    ]);

    $currentUser = User::factory()->create([
        'username' => 'CurrentUser',
        'gtaw_id' => null,
    ]);

    Http::fake([
        'https://ucp.gta.world/oauth/token' => Http::response(['access_token' => 'mock_token'], 200),
        'https://ucp.gta.world/api/user' => Http::response([
            'id' => 54321,
            'username' => 'GtawAccount',
        ], 200),
    ]);

    $response = $this->actingAs($currentUser)
        ->postJson('/api/auth/gtaw/callback', ['code' => 'valid_code']);

    $response->assertStatus(400)
        ->assertJsonPath('message', 'This GTA:W account is already linked to another user.');

    $currentUser->refresh();
    expect($currentUser->gtaw_id)->toBeNull();
});
