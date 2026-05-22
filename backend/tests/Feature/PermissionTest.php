<?php

use App\Models\Faction;
use App\Models\Role;
use App\Models\User;

test('superadmin has all permissions', function () {
    $user = User::factory()->create(['is_superadmin' => true]);

    expect($user->hasPermission('any_perm', 1))->toBeTrue();
});

test('faction leader has all local permissions', function () {
    $user = User::factory()->create();
    $faction = Faction::factory()->create(['faction_leader' => $user->id]);

    expect($user->hasPermission('admin_perm', $faction->id))->toBeTrue();
});

test('permissions respect YES, NO, and NEVER values', function () {
    $user = User::factory()->create();
    $faction = Faction::factory()->create();

    $role1 = Role::create(['faction_id' => $faction->id, 'name' => 'Role 1']);
    $role2 = Role::create(['faction_id' => $faction->id, 'name' => 'Role 2']);

    $user->roles()->attach([$role1->id, $role2->id]);

    // Scenario 1: YES + NO = YES
    $role1->permissions()->create(['permission_key' => 'perm1', 'value' => 'YES']);
    $role2->permissions()->create(['permission_key' => 'perm1', 'value' => 'NO']);
    expect($user->hasPermission('perm1', $faction->id))->toBeTrue();

    // Scenario 2: YES + NEVER = FALSE
    $role1->permissions()->create(['permission_key' => 'perm2', 'value' => 'YES']);
    $role2->permissions()->create(['permission_key' => 'perm2', 'value' => 'NEVER']);
    expect($user->hasPermission('perm2', $faction->id))->toBeFalse();

    // Scenario 3: NO + NO = FALSE
    $role1->permissions()->create(['permission_key' => 'perm3', 'value' => 'NO']);
    expect($user->hasPermission('perm3', $faction->id))->toBeFalse();
});

test('non-admin user cannot view roles list', function () {
    $user = User::factory()->create();
    $faction = Faction::factory()->create(['shortname' => 'lssd']);
    $faction->users()->attach($user->id);

    // User role created by default has view_permissions = NO
    $userRole = $faction->roles()->create(['name' => 'User']);
    $userRole->permissions()->create(['permission_key' => 'view_permissions', 'value' => 'NO']);
    $user->roles()->attach($userRole->id);

    $response = $this->actingAs($user)->getJson('/api/factions/lssd/roles');

    $response->assertStatus(403);
});
