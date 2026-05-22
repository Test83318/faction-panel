<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

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
