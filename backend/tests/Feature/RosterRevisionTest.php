<?php

use App\Models\Faction;
use App\Models\Roster;
use App\Models\RosterContent;
use App\Models\RosterRevision;
use App\Models\RosterSection;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create(['is_superadmin' => true]);
    $this->faction = Faction::factory()->create();
    $this->user->factions()->attach($this->faction->id);

    $this->roster = Roster::create([
        'faction_id' => $this->faction->id,
        'name' => 'Patrol',
        'shortname' => 'PATROL',
        'color' => '#3b82f6',
        'order' => 0,
        'created_by' => $this->user->id,
        'columns' => [
            ['id' => 'name', 'name' => 'Name', 'type' => 'text'],
        ],
    ]);

    $this->section = RosterSection::create([
        'roster_id' => $this->roster->id,
        'name' => 'First Platoon',
        'shortname' => 'PLT1',
        'type' => 'section',
        'order' => 0,
        'created_by' => $this->user->id,
    ]);

    RosterRevision::clearCaptured();
});

test('modifying roster content triggers a revision snapshot', function () {
    // Clear any revisions generated during initial setup
    RosterRevision::truncate();

    // Create a row
    $response = $this->actingAs($this->user)
        ->postJson("/api/sections/{$this->section->id}/contents", [
            'type' => 'predefined',
            'content' => ['name' => 'Officer Smith'],
        ]);

    $response->assertStatus(201);

    // Verify revision was created
    $revisions = RosterRevision::all();
    expect($revisions)->toHaveCount(1);
    expect($revisions->first()->description)->toContain('Created row in section');

    // Verify snapshot has sections and contents
    $snapshot = $revisions->first()->snapshot;
    expect($snapshot)->toHaveKey('roster');
    expect($snapshot)->toHaveKey('sections');
    expect($snapshot['sections'])->toHaveCount(1);
    expect($snapshot['sections'][0]['contents'])->toHaveCount(1);
    expect($snapshot['sections'][0]['contents'][0]['content']['name'])->toBe('Officer Smith');
});

test('can retrieve revisions list without snapshot field', function () {
    // Create a revision
    RosterRevision::create([
        'roster_id' => $this->roster->id,
        'user_id' => $this->user->id,
        'description' => 'Test edit',
        'snapshot' => ['dummy' => 'data'],
    ]);

    $response = $this->actingAs($this->user)
        ->getJson("/api/rosters/{$this->roster->id}/revisions");

    $response->assertStatus(200)
        ->assertJsonCount(1);

    $data = $response->json()[0];
    expect($data)->not->toHaveKey('snapshot');
    expect($data['description'])->toBe('Test edit');
    expect($data['user']['username'])->toBe($this->user->username);
});

test('can show specific revision with snapshot details', function () {
    $revision = RosterRevision::create([
        'roster_id' => $this->roster->id,
        'user_id' => $this->user->id,
        'description' => 'Test edit',
        'snapshot' => ['roster' => ['name' => 'Patrol']],
    ]);

    $response = $this->actingAs($this->user)
        ->getJson("/api/rosters/{$this->roster->id}/revisions/{$revision->id}");

    $response->assertStatus(200)
        ->assertJsonPath('description', 'Test edit')
        ->assertJsonPath('snapshot.roster.name', 'Patrol');
});

test('can restore a revision', function () {
    // 1. Create a snapshot state
    $snapshot = [
        'roster' => [
            'name' => 'Patrol Old',
            'shortname' => 'PATOLD',
            'color' => '#ff0000',
            'order' => 0,
            'columns' => [['id' => 'name', 'name' => 'Name', 'type' => 'text']],
        ],
        'permissions' => [],
        'sections' => [
            [
                'old_id' => 999,
                'section' => [
                    'name' => 'Old Platoon',
                    'shortname' => 'OLDPLT',
                    'type' => 'section',
                    'order' => 0,
                ],
                'contents' => [
                    [
                        'type' => 'predefined',
                        'content' => ['name' => 'Old Officer'],
                        'order' => 0,
                    ],
                ],
                'children' => [],
            ],
        ],
    ];

    $revision = RosterRevision::create([
        'roster_id' => $this->roster->id,
        'user_id' => $this->user->id,
        'description' => 'Old state',
        'snapshot' => $snapshot,
    ]);

    // 2. Modify current roster state (e.g. add new content)
    RosterContent::create([
        'section_id' => $this->section->id,
        'type' => 'predefined',
        'content' => ['name' => 'New Officer'],
        'order' => 0,
        'created_by' => $this->user->id,
    ]);

    // Verify new state is in database
    $this->assertDatabaseHas('roster_contents', ['content->name' => 'New Officer']);

    // 3. Restore to old state
    $response = $this->actingAs($this->user)
        ->postJson("/api/rosters/{$this->roster->id}/revisions/{$revision->id}/restore");

    $response->assertStatus(200);

    // 4. Verify DB was reverted
    $this->roster->refresh();
    expect($this->roster->name)->toBe('Patrol Old');
    expect($this->roster->shortname)->toBe('PATOLD');
    expect($this->roster->color)->toBe('#ff0000');

    // New officer should be wiped out
    $this->assertDatabaseMissing('roster_contents', ['content->name' => 'New Officer']);

    // Old officer should be created
    $this->assertDatabaseHas('roster_contents', ['content->name' => 'Old Officer']);
    $this->assertDatabaseHas('roster_sections', ['name' => 'Old Platoon']);
});

test('non-permitted user cannot access revisions', function () {
    $nonMember = User::factory()->create();

    // Attach permissions to make the roster restricted, so fallback to view_roster applies or custom perms
    // Let's create an explicit roster permission entry for a group or role to enforce permissions.
    // Actually, by default hasRosterPermission returns false for users who aren't superadmin, faction leader, creator or have explicit permission.
    // Let's test with a regular user who is attached to the faction but has no roster permissions.
    $regularUser = User::factory()->create();
    $regularUser->factions()->attach($this->faction->id);

    // Initially they have no permissions, so they should be Forbidden
    $this->actingAs($regularUser)
        ->getJson("/api/rosters/{$this->roster->id}/revisions")
        ->assertStatus(403);
});
