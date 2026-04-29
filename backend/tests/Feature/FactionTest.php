<?php

use App\Models\User;
use App\Models\Faction;

test('authenticated user can create a faction', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/factions', [
        'name' => 'Test Faction',
        'shortname' => 'test-fac',
        'color' => '#FF0000',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('name', 'Test Faction')
        ->assertJsonPath('shortname', 'test-fac');

    $this->assertDatabaseHas('factions', ['shortname' => 'test-fac']);
    
    // Check default roles were created
    $faction = Faction::where('shortname', 'test-fac')->first();
    expect($faction->roles()->count())->toBe(3);
    expect($user->roles()->where('faction_id', $faction->id)->count())->toBe(1);
});

test('faction shortname must be unique', function () {
    $user = User::factory()->create();
    Faction::factory()->create(['shortname' => 'existing']);

    $response = $this->actingAs($user)->postJson('/api/factions', [
        'name' => 'New Name',
        'shortname' => 'existing',
        'color' => '#00FF00',
    ]);

    $response->assertStatus(422);
});

test('user can join a faction', function () {
    $user = User::factory()->create();
    $creator = User::factory()->create();
    $faction = Faction::factory()->create(['shortname' => 'join-me', 'faction_leader' => $creator->id, 'created_by' => $creator->id]);

    $response = $this->actingAs($user)->postJson('/api/factions/join', [
        'shortname' => 'join-me',
    ]);

    $response->assertStatus(200);
    expect($faction->users()->where('user_id', $user->id)->exists())->toBeTrue();
});

test('unauthorized user cannot view a faction they are not in', function () {
    $user = User::factory()->create();
    $faction = Faction::factory()->create(['shortname' => 'private']);

    $response = $this->actingAs($user)->getJson("/api/factions/private");

    $response->assertStatus(403);
});
