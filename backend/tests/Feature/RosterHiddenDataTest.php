<?php

use App\Models\Faction;
use App\Models\FactionRecordDatabase;
use App\Models\Role;
use App\Models\Roster;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

beforeEach(function () {
    // Create leader and normal user
    $this->leader = User::factory()->create();
    $this->user = User::factory()->create();

    // Create a faction
    $this->faction = Faction::factory()->create([
        'faction_leader' => $this->leader->id,
        'created_by' => $this->leader->id,
        'shortname' => 'lssd',
        'visibility' => 'public',
        'access' => 'invite-only',
    ]);

    // Attach user to faction
    $this->faction->users()->attach($this->user->id);

    // Give default User role to $this->user (User role gets view_faction_roster = YES, but lacks any custom roster permission)
    $this->userRole = $this->faction->roles()->create([
        'name' => 'User',
        'weight' => 1,
        'color' => '#d1d5db',
        'type' => 'primary',
    ]);
    $this->userRole->permissions()->create(['permission_key' => 'view_faction_roster', 'value' => 'YES']);
    $this->user->roles()->attach($this->userRole->id);

    // Create a roster with columns (including a hidden one)
    $this->roster = Roster::create([
        'faction_id' => $this->faction->id,
        'name' => 'Main Roster',
        'shortname' => 'ROST',
        'color' => '#123456',
        'order' => 0,
        'columns' => [
            ['id' => 'name', 'name' => 'Name', 'type' => 'text'],
            ['id' => 'secret_info', 'name' => 'Secret Info', 'type' => 'hidden_text'],
        ],
        'created_by' => $this->leader->id,
    ]);

    // Create a section
    $this->section = $this->roster->sections()->create([
        'name' => 'Main Section',
        'shortname' => 'MAIN',
        'type' => 'master',
        'order' => 0,
        'created_by' => $this->leader->id,
    ]);

    // Create a content row
    $this->content = $this->section->contents()->create([
        'type' => 'predefined',
        'content' => [
            'name' => 'John Doe',
            'secret_info' => 'This is a secret',
        ],
        'created_by' => $this->leader->id,
    ]);

    // Create a record database
    $this->recordDb = FactionRecordDatabase::create([
        'faction_id' => $this->faction->id,
        'name' => 'Incidents',
        'description' => 'Incident database',
        'record_shortcode' => 'INC',
        'data_overview_display' => 'table',
        'data_entry_display' => 'detailed',
        'is_published' => true,
        'database_structure' => [
            ['id' => 'name_field', 'name' => 'Name', 'type' => 'text', 'required' => true],
        ],
        'detail_customization' => [
            'roster_integration' => [
                'enabled' => true,
            ],
        ],
        'created_by' => $this->leader->id,
    ]);

    // Create public database permissions
    $this->recordDb->databasePermissions()->create([
        'permissions' => ['view_database'],
    ]);

    // Create an entry
    $this->entry = $this->recordDb->entries()->create([
        'database_id' => $this->recordDb->id,
        'entry_id' => 1,
        'data' => [
            'name_field' => 'John Doe',
        ],
        'is_active' => true,
        'created_by' => $this->leader->id,
    ]);
});

test('FactionController show masks hidden columns for unauthorized users', function () {
    // 1. Leader (authorized) should see the real secret info
    Auth::guard('sanctum')->forgetUser();
    $response = $this->actingAs($this->leader)->getJson('/api/factions/lssd');
    $response->assertStatus(200);
    $data = $response->json();

    // Find the roster content
    $rosters = $data['rosters'];
    expect($rosters[0]['root_sections'][0]['contents'][0]['content']['secret_info'])->toBe('This is a secret');

    // 2. Normal user (unauthorized for hidden data) should see masked value ????
    Auth::guard('sanctum')->forgetUser();
    $response = $this->actingAs($this->user)->getJson('/api/factions/lssd');
    $response->assertStatus(200);
    $data = $response->json();

    $rosters = $data['rosters'];
    expect($rosters[0]['root_sections'][0]['contents'][0]['content']['secret_info'])->toBe('????');
});

test('faction payload does not leak rosters relation', function () {
    Auth::guard('sanctum')->forgetUser();
    $response = $this->actingAs($this->user)->getJson('/api/factions/lssd');
    $response->assertStatus(200);
    $data = $response->json();

    // The main faction object should not have a rosters relation
    expect(isset($data['faction']['rosters']))->toBeFalse();
});

test('RosterContentController update preserves hidden data for unauthorized users', function () {
    // 1. Grant public permission to edit defined fields
    $this->roster->rosterPermissions()->create([
        'permissions' => ['view_roster', 'edit_defined_fields'],
    ]);

    // 2. Normal user tries to update the row name, but does not provide secret_info
    Auth::guard('sanctum')->forgetUser();
    $response = $this->actingAs($this->user)->putJson("/api/contents/{$this->content->id}", [
        'content' => [
            'name' => 'Jane Doe',
        ],
    ]);

    $response->assertStatus(200);

    // Check that the name was updated, but the secret_info was preserved!
    $this->content->refresh();
    expect($this->content->content['name'])->toBe('Jane Doe');
    expect($this->content->content['secret_info'])->toBe('This is a secret');
});

test('RosterContentController update overwrites unauthorized modification attempt with existing hidden data', function () {
    // 1. Grant public permission to edit defined fields
    $this->roster->rosterPermissions()->create([
        'permissions' => ['view_roster', 'edit_defined_fields'],
    ]);

    // 2. Normal user tries to update, including changing the secret_info
    Auth::guard('sanctum')->forgetUser();
    $response = $this->actingAs($this->user)->putJson("/api/contents/{$this->content->id}", [
        'content' => [
            'name' => 'Jane Doe',
            'secret_info' => 'Modified secret', // unauthorized attempt
        ],
    ]);

    $response->assertStatus(200);

    // Check that the secret_info was restored to 'This is a secret'
    $this->content->refresh();
    expect($this->content->content['secret_info'])->toBe('This is a secret');
});

test('RosterContentController batchUpdate preserves hidden data for unauthorized users', function () {
    // 1. Grant public permission to edit defined fields
    $this->roster->rosterPermissions()->create([
        'permissions' => ['view_roster', 'edit_defined_fields'],
    ]);

    // 2. Normal user tries to batch update the row, including changing the secret_info
    Auth::guard('sanctum')->forgetUser();
    $response = $this->actingAs($this->user)->putJson("/api/sections/{$this->section->id}/contents/batch", [
        'contents' => [
            [
                'id' => $this->content->id,
                'content' => [
                    'name' => 'Jane Doe',
                    'secret_info' => 'Modified secret', // unauthorized attempt
                ],
            ],
        ],
    ]);

    $response->assertStatus(200);

    // Check that the secret_info was restored to 'This is a secret'
    $this->content->refresh();
    expect($this->content->content['secret_info'])->toBe('This is a secret');
});

test('FactionRecordEntryController show masks hidden columns in roster integrations for unauthorized users', function () {
    // 1. Grant public permission to view roster (but not hidden data)
    $this->roster->rosterPermissions()->create([
        'permissions' => ['view_roster'],
    ]);

    // 2. Add linked_database_id to name column
    $cols = $this->roster->columns;
    $cols[0]['linked_database_id'] = $this->recordDb->id;
    $cols[0]['database_field_id'] = 'name_field';
    $this->roster->update(['columns' => $cols]);

    // 3. Leader (authorized) should see unmasked secret_info in roster integrations
    Auth::guard('sanctum')->forgetUser();
    $response = $this->actingAs($this->leader)->getJson("/api/factions/lssd/records/{$this->recordDb->id}/entries/{$this->entry->id}");
    $response->assertStatus(200);
    $data = $response->json();

    expect($data['roster_integrations'][0]['contents'][0]['content']['secret_info'])->toBe('This is a secret');

    // 4. Normal user (unauthorized for hidden data) should see masked value ????
    Auth::guard('sanctum')->forgetUser();
    $response = $this->actingAs($this->user)->getJson("/api/factions/lssd/records/{$this->recordDb->id}/entries/{$this->entry->id}");
    $response->assertStatus(200);
    $data = $response->json();

    expect($data['roster_integrations'][0]['contents'][0]['content']['secret_info'])->toBe('????');
});

test('FactionController show masks hidden columns based on section-specific overrides', function () {
    $this->roster->rosterPermissions()->create([
        'permissions' => ['view_roster'],
    ]);

    $this->section->update([
        'columns' => [
            ['id' => 'name', 'name' => 'Name', 'type' => 'text'],
            ['id' => 'secret_info', 'name' => 'Secret Info', 'type' => 'text'], // NOT hidden in section!
            ['id' => 'another_secret', 'name' => 'Another Secret', 'type' => 'hidden_text'], // Hidden in section!
        ],
    ]);

    $this->content->update([
        'content' => [
            'name' => 'John Doe',
            'secret_info' => 'Not a secret anymore',
            'another_secret' => 'This is the new secret',
        ],
    ]);

    // 1. Leader should see both unmasked
    Auth::guard('sanctum')->forgetUser();
    $response = $this->actingAs($this->leader)->getJson('/api/factions/lssd');
    $response->assertStatus(200);
    $data = $response->json();

    $c = $data['rosters'][0]['root_sections'][0]['contents'][0]['content'];
    expect($c['secret_info'])->toBe('Not a secret anymore');
    expect($c['another_secret'])->toBe('This is the new secret');

    // 2. Normal user should see 'secret_info' unmasked (since type is text in section)
    // but 'another_secret' masked (since type is hidden_text in section)
    Auth::guard('sanctum')->forgetUser();
    $response = $this->actingAs($this->user)->getJson('/api/factions/lssd');
    $response->assertStatus(200);
    $data = $response->json();

    $c = $data['rosters'][0]['root_sections'][0]['contents'][0]['content'];
    expect($c['secret_info'])->toBe('Not a secret anymore');
    expect($c['another_secret'])->toBe('????');
});
