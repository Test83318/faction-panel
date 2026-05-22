<?php

use App\Models\Faction;
use App\Models\Form;
use App\Models\FormAutomation;
use App\Models\FormField;
use App\Models\FormSection;
use App\Models\FormStage;
use App\Models\FormStatus;
use App\Models\FormSubmission;
use App\Models\Group;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create(['is_superadmin' => true]);
    $this->faction = Faction::factory()->create();
    $this->user->factions()->attach($this->faction->id);
});

test('can manage form automations', function () {
    $form = Form::factory()->create(['faction_id' => $this->faction->id]);
    $group = Group::create([
        'faction_id' => $this->faction->id,
        'name' => 'Recruits',
        'color' => '#ffffff',
        'created_by' => $this->user->id,
    ]);

    // Create automation
    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/automations", [
            'name' => 'Assign Recruits',
            'trigger' => 'on_status_change',
            'condition_logic' => 'all',
            'conditions' => [
                [
                    'type' => 'status',
                    'operator' => 'equals',
                    'value' => '1',
                ],
            ],
            'action' => 'give_group',
            'action_group_id' => $group->id,
            'is_enabled' => true,
        ])
        ->assertStatus(201)
        ->assertJsonPath('name', 'Assign Recruits')
        ->assertJsonPath('action_group_id', $group->id);

    $automation = FormAutomation::where('form_id', $form->id)->first();
    expect($automation)->not->toBeNull();

    // Update automation
    $this->actingAs($this->user)
        ->putJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/automations/{$automation->id}", [
            'name' => 'Updated Name',
        ])
        ->assertStatus(200);

    expect($automation->fresh()->name)->toBe('Updated Name');

    // Delete automation
    $this->actingAs($this->user)
        ->deleteJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/automations/{$automation->id}")
        ->assertStatus(200);

    expect(FormAutomation::find($automation->id))->toBeNull();
});

test('evaluates points condition on submit', function () {
    $form = Form::factory()->create(['faction_id' => $this->faction->id, 'type' => 'quiz', 'is_enabled' => true]);
    $stage = FormStage::create(['form_id' => $form->id, 'name' => 'Quiz Stage', 'order' => 0]);
    $section = FormSection::create(['form_stage_id' => $stage->id, 'name' => 'Questions', 'order' => 0]);

    $field1 = FormField::create([
        'form_section_id' => $section->id,
        'type' => 'text',
        'label' => 'Q1',
        'name' => 'q1',
        'points' => 5,
        'is_automatic_scored' => true,
        'correct_answer' => 'A',
        'order' => 0,
        'has_grading' => true,
    ]);

    $field2 = FormField::create([
        'form_section_id' => $section->id,
        'type' => 'text',
        'label' => 'Q2',
        'name' => 'q2',
        'points' => 10,
        'is_automatic_scored' => true,
        'correct_answer' => 'B',
        'order' => 1,
        'has_grading' => true,
    ]);

    $passedStatus = FormStatus::create(['form_id' => $form->id, 'name' => 'Passed', 'is_passed' => true, 'order' => 1]);
    $closedStatus = FormStatus::create(['form_id' => $form->id, 'name' => 'Closed', 'is_closed' => true, 'order' => 2]);
    FormStatus::create(['form_id' => $form->id, 'name' => 'Submitted', 'order' => 0]);

    // Automation: if points >= 15, set status to Passed
    FormAutomation::create([
        'form_id' => $form->id,
        'name' => 'Pass Automation',
        'trigger' => 'on_submit',
        'condition_logic' => 'all',
        'conditions' => [
            [
                'type' => 'points',
                'operator' => 'gte',
                'value' => '15',
            ],
        ],
        'action' => 'set_status',
        'action_status_id' => $passedStatus->id,
        'is_enabled' => true,
        'order' => 0,
    ]);

    // Case 1: Partial correct (5 + 0 = 5 points) -> Status remains Submitted (not Passed)
    $res = $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/start");
    $submissionId = $res->json('id');

    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/{$submissionId}/submit", [
            'responses' => [
                $field1->id => 'A',
                $field2->id => 'Wrong',
            ],
        ])
        ->assertStatus(200);

    $submission = FormSubmission::find($submissionId);
    expect($submission->current_status_id)->not->toBe($passedStatus->id);

    // Update first submission status to Closed so it is no longer active
    $submission->update(['current_status_id' => $closedStatus->id]);

    // Case 2: Full correct (5 + 10 = 15 points) -> Status becomes Passed
    $res2 = $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/start");
    $submissionId2 = $res2->json('id');

    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/{$submissionId2}/submit", [
            'responses' => [
                $field1->id => 'A',
                $field2->id => 'B',
            ],
        ])
        ->assertStatus(200);

    $submission2 = FormSubmission::find($submissionId2);
    expect($submission2->current_status_id)->toBe($passedStatus->id);
});

test('assigns group on status change automation', function () {
    $form = Form::factory()->create(['faction_id' => $this->faction->id, 'is_enabled' => true]);
    $stage = FormStage::create(['form_id' => $form->id, 'name' => 'Stage 1', 'order' => 0]);
    $section = FormSection::create(['form_stage_id' => $stage->id, 'name' => 'Info', 'order' => 0]);
    $field = FormField::create([
        'form_section_id' => $section->id,
        'type' => 'text',
        'label' => 'Field',
        'name' => 'field',
        'order' => 0,
    ]);

    $submittedStatus = FormStatus::create(['form_id' => $form->id, 'name' => 'Submitted', 'order' => 0]);
    $passedStatus = FormStatus::create(['form_id' => $form->id, 'name' => 'Passed', 'is_passed' => true, 'order' => 1]);

    $group = Group::create([
        'faction_id' => $this->faction->id,
        'name' => 'Recruits',
        'color' => '#ffffff',
        'created_by' => $this->user->id,
    ]);

    // Automation: on status change to Passed, give group Recruits
    FormAutomation::create([
        'form_id' => $form->id,
        'name' => 'Give Group Automation',
        'trigger' => 'on_status_change',
        'trigger_status_id' => $passedStatus->id,
        'condition_logic' => 'all',
        'conditions' => [
            [
                'type' => 'status',
                'operator' => 'equals',
                'value' => (string) $passedStatus->id,
            ],
        ],
        'action' => 'give_group',
        'action_group_id' => $group->id,
        'is_enabled' => true,
        'order' => 0,
    ]);

    // Submit form first
    $res = $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/start");
    $submissionId = $res->json('id');

    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/{$submissionId}/submit", [
            'responses' => [
                $field->id => 'Hello',
            ],
        ]);

    $submission = FormSubmission::find($submissionId);
    expect($group->members()->where('user_id', $this->user->id)->exists())->toBeFalse();

    // Now update status to Passed
    $this->actingAs($this->user)
        ->putJson("/api/factions/{$this->faction->shortname}/forms/submissions/{$submissionId}/status", [
            'status_id' => $passedStatus->id,
        ])
        ->assertStatus(200);

    expect($group->members()->where('user_id', $this->user->id)->exists())->toBeTrue();
});

test('skips group assignment for guest submissions without user id', function () {
    $form = Form::factory()->create(['faction_id' => $this->faction->id, 'is_enabled' => true, 'is_public' => true, 'requires_gtaw_login' => false]);
    $stage = FormStage::create(['form_id' => $form->id, 'name' => 'Stage 1', 'order' => 0]);
    $section = FormSection::create(['form_stage_id' => $stage->id, 'name' => 'Info', 'order' => 0]);
    $field = FormField::create([
        'form_section_id' => $section->id,
        'type' => 'text',
        'label' => 'Field',
        'name' => 'field',
        'order' => 0,
    ]);

    $submittedStatus = FormStatus::create(['form_id' => $form->id, 'name' => 'Submitted', 'order' => 0]);
    $passedStatus = FormStatus::create(['form_id' => $form->id, 'name' => 'Passed', 'is_passed' => true, 'order' => 1]);

    $group = Group::create([
        'faction_id' => $this->faction->id,
        'name' => 'Recruits',
        'color' => '#ffffff',
        'created_by' => $this->user->id,
    ]);

    // Automation: on submit, give group Recruits
    FormAutomation::create([
        'form_id' => $form->id,
        'name' => 'Give Group Automation',
        'trigger' => 'on_submit',
        'condition_logic' => 'all',
        'conditions' => [],
        'action' => 'give_group',
        'action_group_id' => $group->id,
        'is_enabled' => true,
        'order' => 0,
    ]);

    // Start as a user to pass Sanctum authentication middleware
    $res = $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/start")
        ->assertStatus(200);
    $submissionId = $res->json('id');

    // Simulate guest submission by setting user_id to null
    $submission = FormSubmission::find($submissionId);
    $submission->update(['user_id' => null]);

    // Submit form (authenticated, simulating form submit execution)
    $this->actingAs($this->user)
        ->postJson("/api/factions/{$this->faction->shortname}/forms/{$form->id}/submissions/{$submissionId}/submit", [
            'responses' => [
                $field->id => 'Guest value',
            ],
        ])->assertStatus(200);

    // Make sure submission succeeded and database contains the submission, but group is not assigned and no crash occurred
    $submission = FormSubmission::find($submissionId);
    expect($submission->user_id)->toBeNull();
    expect($group->members()->count())->toBe(0);
});
