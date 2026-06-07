<?php

use App\Models\Faction;
use App\Models\FactionInvite;
use App\Models\Group;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;

test('list active invites vs inactive invites', function () {
    $creator = User::factory()->create();
    $faction = Faction::factory()->create([
        'faction_leader' => $creator->id,
        'created_by' => $creator->id,
    ]);

    // Active invites
    $activeInvite1 = FactionInvite::create([
        'faction_id' => $faction->id,
        'code' => 'ACTIVE1',
        'expires_at' => Carbon::now()->addDay(),
        'max_uses' => 10,
        'uses' => 2,
        'created_by' => $creator->id,
    ]);

    $activeInvite2 = FactionInvite::create([
        'faction_id' => $faction->id,
        'code' => 'ACTIVE2',
        'expires_at' => null,
        'max_uses' => null,
        'uses' => 5,
        'created_by' => $creator->id,
    ]);

    // Inactive (expired)
    $inactiveExpired = FactionInvite::create([
        'faction_id' => $faction->id,
        'code' => 'EXPIRED',
        'expires_at' => Carbon::now()->subHour(),
        'max_uses' => null,
        'uses' => 0,
        'created_by' => $creator->id,
    ]);

    // Inactive (fully used)
    $inactiveFull = FactionInvite::create([
        'faction_id' => $faction->id,
        'code' => 'FULL',
        'expires_at' => Carbon::now()->addDay(),
        'max_uses' => 5,
        'uses' => 5,
        'created_by' => $creator->id,
    ]);

    // Check active invites endpoint
    $response = $this->actingAs($creator)->getJson("/api/factions/{$faction->shortname}/invites?status=active");
    $response->assertStatus(200);
    $data = $response->json();
    expect(count($data))->toBe(2);
    $codes = collect($data)->pluck('code')->toArray();
    expect($codes)->toContain('ACTIVE1');
    expect($codes)->toContain('ACTIVE2');
    expect($codes)->not->toContain('EXPIRED');
    expect($codes)->not->toContain('FULL');

    // Check inactive invites endpoint
    $response = $this->actingAs($creator)->getJson("/api/factions/{$faction->shortname}/invites?status=inactive");
    $response->assertStatus(200);
    $data = $response->json();
    expect(count($data))->toBe(2);
    $codes = collect($data)->pluck('code')->toArray();
    expect($codes)->toContain('EXPIRED');
    expect($codes)->toContain('FULL');
    expect($codes)->not->toContain('ACTIVE1');
    expect($codes)->not->toContain('ACTIVE2');
});

test('create invite with role validation rules', function () {
    $creator = User::factory()->create();
    $faction = Faction::factory()->create([
        'faction_leader' => $creator->id,
        'created_by' => $creator->id,
    ]);

    // Create roles with different weights
    $roleHigh = Role::create(['faction_id' => $faction->id, 'name' => 'High Rank', 'weight' => 80]);
    $roleMedium = Role::create(['faction_id' => $faction->id, 'name' => 'Medium Rank', 'weight' => 50]);
    $roleLow = Role::create(['faction_id' => $faction->id, 'name' => 'Low Rank', 'weight' => 20]);

    // Let's create a manager who is NOT the leader, but has roleMedium (weight 50)
    $manager = User::factory()->create();
    $faction->users()->attach($manager->id);
    $manager->roles()->attach($roleMedium->id);

    // Let's add permissions to roleMedium to manage invites
    $roleMedium->permissions()->create(['permission_key' => 'manage_invites', 'value' => 'YES']);

    // 1. Manager attempts to assign roleLow (weight 20 < 50) -> Should succeed
    $response = $this->actingAs($manager)->postJson("/api/factions/{$faction->shortname}/invites", [
        'duration' => '24h',
        'max_uses' => 0,
        'role_id' => $roleLow->id,
    ]);
    $response->assertStatus(201);
    expect($response->json('role_id'))->toBe($roleLow->id);

    // 2. Manager attempts to assign roleMedium (weight 50 == 50) -> Should fail 403
    $response = $this->actingAs($manager)->postJson("/api/factions/{$faction->shortname}/invites", [
        'duration' => '24h',
        'max_uses' => 0,
        'role_id' => $roleMedium->id,
    ]);
    $response->assertStatus(403);

    // 3. Manager attempts to assign roleHigh (weight 80 > 50) -> Should fail 403
    $response = $this->actingAs($manager)->postJson("/api/factions/{$faction->shortname}/invites", [
        'duration' => '24h',
        'max_uses' => 0,
        'role_id' => $roleHigh->id,
    ]);
    $response->assertStatus(403);

    // 4. Leader attempts to assign roleHigh (weight 80) -> Should succeed since leader has unlimited authority
    $response = $this->actingAs($creator)->postJson("/api/factions/{$faction->shortname}/invites", [
        'duration' => '24h',
        'max_uses' => 0,
        'role_id' => $roleHigh->id,
    ]);
    $response->assertStatus(201);
    expect($response->json('role_id'))->toBe($roleHigh->id);
});

test('join with invite and assign custom role or default user role', function () {
    $creator = User::factory()->create();
    $faction = Faction::factory()->create([
        'faction_leader' => $creator->id,
        'created_by' => $creator->id,
        'access' => 'invite-only', // requires invite code to join
    ]);

    // Setup roles
    $customRole = Role::create(['faction_id' => $faction->id, 'name' => 'Officer', 'weight' => 10]);
    $defaultUserRole = Role::create(['faction_id' => $faction->id, 'name' => 'User', 'weight' => 1]);

    // Create invite with custom role
    $inviteWithRole = FactionInvite::create([
        'faction_id' => $faction->id,
        'code' => 'OFFICERCODE',
        'expires_at' => null,
        'max_uses' => null,
        'uses' => 0,
        'role_id' => $customRole->id,
        'created_by' => $creator->id,
    ]);

    // Create invite with no role
    $inviteNoRole = FactionInvite::create([
        'faction_id' => $faction->id,
        'code' => 'USERCODE',
        'expires_at' => null,
        'max_uses' => null,
        'uses' => 0,
        'role_id' => null,
        'created_by' => $creator->id,
    ]);

    // 1. User joins using invite with role
    $joiningUser1 = User::factory()->create();
    $response = $this->actingAs($joiningUser1)->postJson("/api/invites/{$inviteWithRole->code}/join");
    $response->assertStatus(200);
    expect($faction->users()->where('user_id', $joiningUser1->id)->exists())->toBeTrue();
    expect($joiningUser1->roles()->where('role_id', $customRole->id)->exists())->toBeTrue();
    expect($joiningUser1->roles()->where('role_id', $defaultUserRole->id)->exists())->toBeFalse();

    // 2. User joins using invite without role
    $joiningUser2 = User::factory()->create();
    $response = $this->actingAs($joiningUser2)->postJson("/api/invites/{$inviteNoRole->code}/join");
    $response->assertStatus(200);
    expect($faction->users()->where('user_id', $joiningUser2->id)->exists())->toBeTrue();
    expect($joiningUser2->roles()->where('role_id', $defaultUserRole->id)->exists())->toBeTrue();
    expect($joiningUser2->roles()->where('role_id', $customRole->id)->exists())->toBeFalse();
});

test('join with invite and auto-add to groups', function () {
    $creator = User::factory()->create();
    $faction = Faction::factory()->create([
        'faction_leader' => $creator->id,
        'created_by' => $creator->id,
        'access' => 'invite-only',
    ]);

    // Create groups
    $group1 = Group::create(['faction_id' => $faction->id, 'name' => 'Group A', 'color' => '#111111', 'created_by' => $creator->id]);
    $group2 = Group::create(['faction_id' => $faction->id, 'name' => 'Group B', 'color' => '#222222', 'created_by' => $creator->id]);
    $group3 = Group::create(['faction_id' => $faction->id, 'name' => 'Group C', 'color' => '#333333', 'created_by' => $creator->id]);

    // Create invite with group1 and group2
    $response = $this->actingAs($creator)->postJson("/api/factions/{$faction->shortname}/invites", [
        'duration' => '24h',
        'max_uses' => 0,
        'role_id' => null,
        'group_ids' => [$group1->id, $group2->id],
    ]);
    $response->assertStatus(201);
    $inviteCode = $response->json('code');
    expect($response->json('groups'))->toHaveCount(2);

    // Join with invite
    $joiningUser = User::factory()->create();
    $joinResponse = $this->actingAs($joiningUser)->postJson("/api/invites/{$inviteCode}/join");
    $joinResponse->assertStatus(200);

    // Check user is in faction
    expect($faction->users()->where('user_id', $joiningUser->id)->exists())->toBeTrue();

    // Check user is added to group1 and group2, but not group3
    $userGroupIds = $joiningUser->groups()->pluck('groups.id')->toArray();
    expect($userGroupIds)->toContain($group1->id);
    expect($userGroupIds)->toContain($group2->id);
    expect($userGroupIds)->not->toContain($group3->id);
});
