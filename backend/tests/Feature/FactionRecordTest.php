<?php

use App\Models\Faction;
use App\Models\FactionRecordDatabase;
use App\Models\FactionRecordEntry;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create(['is_superadmin' => true]);
    $this->faction = Faction::factory()->create();
    $this->user->factions()->attach($this->faction->id);
});

test('can create a faction record database', function () {
    $response = $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/records", [
            'name' => 'Arrests Database',
            'description' => 'Records of all arrests',
            'allow_details_view' => true,
            'data_overview_display' => 'table',
            'data_entry_display' => 'detailed',
            'record_shortcode' => 'ARR',
            'database_structure' => [
                ['id' => 'suspect', 'name' => 'Suspect Name', 'type' => 'text', 'required' => true],
                ['id' => 'charges', 'name' => 'Charges', 'type' => 'text', 'required' => true],
            ],
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('name', 'Arrests Database');

    $this->assertDatabaseHas('faction_record_databases', [
        'name' => 'Arrests Database',
        'faction_id' => $this->faction->id,
    ]);
});

test('can update a faction record database', function () {
    $database = FactionRecordDatabase::create([
        'faction_id' => $this->faction->id,
        'name' => 'Initial Database',
        'description' => 'Initial Description',
        'data_overview_display' => 'table',
        'data_entry_display' => 'detailed',
        'database_structure' => [],
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->putJson("/api/factions/{$this->faction->shortname}/records/{$database->id}", [
            'name' => 'Updated Database',
            'description' => 'Updated Description',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('name', 'Updated Database')
        ->assertJsonPath('description', 'Updated Description');

    $this->assertDatabaseHas('faction_record_databases', [
        'id' => $database->id,
        'name' => 'Updated Database',
        'description' => 'Updated Description',
    ]);
});

test('can delete a faction record database', function () {
    $database = FactionRecordDatabase::create([
        'faction_id' => $this->faction->id,
        'name' => 'To Delete',
        'data_overview_display' => 'table',
        'data_entry_display' => 'detailed',
        'database_structure' => [],
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->deleteJson("/api/factions/{$this->faction->shortname}/records/{$database->id}");

    $response->assertStatus(204);
    $this->assertSoftDeleted('faction_record_databases', ['id' => $database->id]);
});

test('can create a record entry', function () {
    $database = FactionRecordDatabase::create([
        'faction_id' => $this->faction->id,
        'name' => 'Arrests',
        'data_overview_display' => 'table',
        'data_entry_display' => 'detailed',
        'database_structure' => [
            ['id' => 'suspect', 'name' => 'Suspect Name', 'type' => 'text', 'required' => true],
        ],
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/records/{$database->id}/entries", [
            'data' => [
                'suspect' => 'John Doe',
            ],
        ]);

    $response->assertStatus(201);
    $this->assertDatabaseHas('faction_record_entries', [
        'database_id' => $database->id,
        'is_active' => true,
    ]);

    $entry = FactionRecordEntry::where('database_id', $database->id)->first();
    expect($entry->data['suspect'])->toBe('John Doe');
});

test('can update a record entry', function () {
    $database = FactionRecordDatabase::create([
        'faction_id' => $this->faction->id,
        'name' => 'Arrests',
        'data_overview_display' => 'table',
        'data_entry_display' => 'detailed',
        'database_structure' => [
            ['id' => 'suspect', 'name' => 'Suspect Name', 'type' => 'text', 'required' => true],
        ],
        'created_by' => $this->user->id,
    ]);

    $entry = FactionRecordEntry::create([
        'database_id' => $database->id,
        'entry_id' => 1,
        'data' => [
            'suspect' => 'John Doe',
        ],
        'is_active' => true,
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->putJson("/api/factions/{$this->faction->shortname}/records/{$database->id}/entries/{$entry->id}", [
            'data' => [
                'suspect' => 'Jane Smith',
            ],
        ]);

    $response->assertStatus(200);
    $entry->refresh();
    expect($entry->data['suspect'])->toBe('Jane Smith');
});

test('can delete a record entry', function () {
    $database = FactionRecordDatabase::create([
        'faction_id' => $this->faction->id,
        'name' => 'Arrests',
        'data_overview_display' => 'table',
        'data_entry_display' => 'detailed',
        'database_structure' => [],
        'created_by' => $this->user->id,
    ]);

    $entry = FactionRecordEntry::create([
        'database_id' => $database->id,
        'entry_id' => 1,
        'data' => [],
        'is_active' => true,
        'created_by' => $this->user->id,
    ]);

    $response = $this->actingAs($this->user)
        ->deleteJson("/api/factions/{$this->faction->shortname}/records/{$database->id}/entries/{$entry->id}");

    $response->assertStatus(204);
    $this->assertSoftDeleted('faction_record_entries', ['id' => $entry->id]);
});
