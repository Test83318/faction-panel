<?php

use App\Models\User;
use App\Models\Faction;
use App\Models\Form;
use App\Models\FormStage;
use App\Models\FormSection;
use App\Models\FormField;
use App\Models\FormSubmission;
use App\Models\FormStatus;
use App\Services\GtawService;
use Illuminate\Support\Facades\Http;
use Mockery\MockInterface;

beforeEach(function () {
    $this->user = User::factory()->create(['is_superadmin' => true]);
    $this->faction = Faction::factory()->create();
    $this->user->factions()->attach($this->faction->id);
});

test('can create a form', function () {
    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms", [
            'name' => 'Recruitment Form',
            'type' => 'standard',
            'description' => 'Test Description',
            'is_public' => true,
            'requires_gtaw_login' => false,
            'cooldown_seconds' => 3600
        ])
        ->assertStatus(201)
        ->assertJsonPath('name', 'Recruitment Form');

    $this->assertDatabaseHas('forms', ['name' => 'Recruitment Form']);
});

test('can add stages, sections and fields', function () {
    $form = Form::factory()->create(['faction_id' => $this->faction->id]);

    // Add stage
    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/stages", [
            'name' => 'Stage 1'
        ])
        ->assertStatus(201);

    $stage = FormStage::where('form_id', $form->id)->first();

    // Add section
    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/stages/{$stage->id}/sections", [
            'name' => 'Personal Info',
            'description' => 'Section 1 description'
        ])
        ->assertStatus(201);

    $section = FormSection::where('form_stage_id', $stage->id)->first();

    // Add field
    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/sections/{$section->id}/fields", [
            'type' => 'text',
            'label' => 'Full Name',
            'name' => 'full_name',
            'is_required' => true,
            'points' => 0
        ])
        ->assertStatus(201);

    $this->assertDatabaseHas('form_fields', ['label' => 'Full Name', 'form_section_id' => $section->id]);
});

test('can start and submit a form', function () {
    $form = Form::factory()->create(['faction_id' => $this->faction->id, 'is_enabled' => true]);
    $stage = FormStage::create(['form_id' => $form->id, 'name' => 'Stage 1', 'order' => 0]);
    $section = FormSection::create(['form_stage_id' => $stage->id, 'name' => 'Info', 'order' => 0]);
    $field = FormField::create([
        'form_section_id' => $section->id,
        'type' => 'text',
        'label' => 'Test Field',
        'name' => 'test_field',
        'order' => 0
    ]);
    FormStatus::create(['form_id' => $form->id, 'name' => 'Submitted', 'order' => 0]);

    // Start submission
    $res = $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/start")
        ->assertStatus(200);

    $submissionId = $res->json('id');

    // Submit form
    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/{$submissionId}/submit", [
            'responses' => [
                $field->id => 'Test Response'
            ]
        ])
        ->assertStatus(200);

    $this->assertDatabaseHas('form_responses', [
        'form_submission_id' => $submissionId,
        'form_field_id' => $field->id,
        'value' => 'Test Response'
    ]);

    $submission = FormSubmission::find($submissionId);
    $this->assertNotNull($submission->submitted_at);
});

test('enforces gtaw login if required', function () {
    $form = Form::factory()->create([
        'faction_id' => $this->faction->id,
        'is_enabled' => true,
        'requires_gtaw_login' => true
    ]);

    // User not linked
    $this->user->update(['gtaw_access_token' => null]);

    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/start")
        ->assertStatus(401);

    // User linked
    $this->user->update(['gtaw_access_token' => 'fake_token']);
    $this->user->refresh();

    // Fake GTA:W API response
    Http::fake([
        '*api/factions' => Http::response([], 200),
    ]);

    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/start")
        ->assertStatus(200);
});

test('auto-grades quiz forms', function () {
    $form = Form::factory()->create([
        'faction_id' => $this->faction->id,
        'type' => 'quiz',
        'is_enabled' => true,
        'pass_points' => 10,
        'is_automatic_grading' => true
    ]);
    $stage = FormStage::create(['form_id' => $form->id, 'name' => 'Quiz Stage', 'order' => 0]);
    $section = FormSection::create(['form_stage_id' => $stage->id, 'name' => 'Questions', 'order' => 0]);
    
    $field = FormField::create([
        'form_section_id' => $section->id,
        'type' => 'text',
        'label' => 'Question 1',
        'name' => 'q1',
        'points' => 10,
        'is_automatic_scored' => true,
        'correct_answer' => 'Correct',
        'order' => 0
    ]);

    $passedStatus = FormStatus::create(['form_id' => $form->id, 'name' => 'Passed', 'is_passed' => true, 'order' => 1]);
    $failedStatus = FormStatus::create(['form_id' => $form->id, 'name' => 'Failed', 'is_failed' => true, 'order' => 2]);
    FormStatus::create(['form_id' => $form->id, 'name' => 'Submitted', 'order' => 0]);

    // 1. Correct answer
    $res = $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/start");
    $submissionId = $res->json('id');

    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/{$submissionId}/submit", [
            'responses' => [$field->id => 'Correct']
        ]);

    $submission = FormSubmission::find($submissionId);
    expect($submission->current_status_id)->toBe($passedStatus->id);

    // 2. Wrong answer
    $res = $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/start");
    $submissionId = $res->json('id');

    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/{$submissionId}/submit", [
            'responses' => [$field->id => 'Wrong']
        ]);

    $submission = FormSubmission::find($submissionId);
    expect($submission->current_status_id)->toBe($failedStatus->id);
});
