<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\FormResponse;
use App\Models\User;
use App\Models\FormStatus;
use App\Models\FormStage;
use App\Models\Faction;
use App\Services\GtawService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class FormSubmissionController extends Controller
{
    protected $gtawService;

    public function __construct(GtawService $gtawService)
    {
        $this->gtawService = $gtawService;
    }

    public function globalIndex(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::user();

        if (!$user->is_superadmin && !User::hasFactionPermission($user, $faction, 'global_faction_form_moderation')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $submissions = FormSubmission::whereHas('form', function($query) use ($faction) {
                $query->where('faction_id', $faction->id);
            })
            ->with(['user:id,username', 'currentStatus', 'form:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($submissions);
    }

    public function mySubmissions(string $shortname)
    {
        $faction = Faction::where('shortname', $shortname)->firstOrFail();
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $submissions = FormSubmission::where('user_id', $user->id)
            ->whereHas('form', function($query) use ($faction) {
                $query->where('faction_id', $faction->id);
            })
            ->with(['currentStatus', 'form:id,name'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($submissions);
    }

    public function index(string $shortname, Form $form)
    {
        // Only return the user's own submissions unless they have moderation perms
        $user = Auth::user();
        
        if (User::hasFormPermission($user, $form, 'view_submissions')) {
            $submissions = $form->submissions()
                ->with(['user:id,username', 'currentStatus'])
                ->orderBy('created_at', 'desc')
                ->get();
        } else if ($user) {
            $submissions = $form->submissions()
                ->where('user_id', $user->id)
                ->with(['currentStatus'])
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        return response()->json($submissions);
    }

    public function start(string $shortname, Form $form)
    {
        $user = Auth::user();

        // 1. Permission check
        if (!User::hasFormPermission($user, $form, 'submit_form')) {
            return response()->json(['message' => 'You do not have permission to submit this form.'], 403);
        }

        // 2. GTA:W Login check
        if ($form->requires_gtaw_login) {
            if (!$user || !$user->gtaw_linked) {
                return response()->json(['message' => 'This form requires you to be logged in with your GTA:W account.'], 401);
            }
        }

        // 3. Check if enabled
        if (!$form->is_enabled) {
            return response()->json(['message' => 'This form is currently disabled.'], 422);
        }

        // 4. Cooldown check (only for logged in users)
        if ($user && $form->cooldown_seconds > 0) {
            $lastSubmission = FormSubmission::where('form_id', $form->id)
                ->where('user_id', $user->id)
                ->whereNotNull('submitted_at')
                ->latest()
                ->first();

            if ($lastSubmission) {
                // If cooldown only on fail, check the status
                $shouldApplyCooldown = true;
                if ($form->cooldown_only_on_fail) {
                    $shouldApplyCooldown = $lastSubmission->currentStatus?->is_failed ?? false;
                }

                if ($shouldApplyCooldown) {
                    $cooldownUntil = Carbon::parse($lastSubmission->submitted_at)->addSeconds($form->cooldown_seconds);
                    if (now()->lessThan($cooldownUntil)) {
                        return response()->json([
                            'message' => 'You are on cooldown.',
                            'cooldown_until' => $cooldownUntil->toDateTimeString(),
                            'remaining_seconds' => now()->diffInSeconds($cooldownUntil)
                        ], 429);
                    }
                }
            }
        }

        // 5. Create submission record
        $defaultStatus = $form->statuses()->where('name', 'Submitted')->first() ?? $form->statuses()->first();
        $firstStage = $form->stages()->first();

        $submission = $form->submissions()->create([
            'user_id' => $user?->id,
            'current_stage_id' => $firstStage?->id,
            'current_status_id' => $defaultStatus?->id,
            'started_at' => now(),
            'metadata' => [
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]
        ]);

        // 6. Pre-fill GTA:W data if required
        if ($form->requires_gtaw_login && $user?->gtaw_linked) {
            $factions = $this->gtawService->getFactions($user->gtaw_access_token);
            if ($factions) {
                $matchedFaction = null;
                $matchedCharId = null;
                
                foreach ($factions as $charId => $factionData) {
                    if ($factionData['faction'] == $form->faction->gtaw_faction_id) {
                        $matchedFaction = $factionData;
                        $matchedCharId = $charId;
                        break;
                    }
                }

                if ($matchedFaction) {
                    $fields = $form->stages()->with('sections.fields')->get()->pluck('sections')->flatten()->pluck('fields')->flatten();
                    
                    foreach ($fields as $field) {
                        if ($field->prefill_type) {
                            $value = null;
                            switch ($field->prefill_type) {
                                case 'character_id':
                                    $value = $matchedCharId;
                                    break;
                                case 'faction_name':
                                    $value = $matchedFaction['faction_name'];
                                    break;
                                case 'faction_rank':
                                    $value = $matchedFaction['faction_rank'];
                                    break;
                                case 'faction_rank_name':
                                    $value = $matchedFaction['faction_rank_name'];
                                    break;
                                case 'faction':
                                    $value = $matchedFaction['faction'];
                                    break;
                                case 'character_name':
                                    // Try to fetch more details if we need character name
                                    $charDetails = $this->gtawService->getCharacterDetails($user->gtaw_access_token, $matchedFaction['faction'], $matchedCharId);
                                    if ($charDetails && isset($charDetails['character_name'])) {
                                        $value = $charDetails['character_name'];
                                    }
                                    break;
                            }

                            if ($value !== null) {
                                FormResponse::updateOrCreate(
                                    [
                                        'form_submission_id' => $submission->id,
                                        'form_field_id' => $field->id
                                    ],
                                    [
                                        'value' => $value,
                                    ]
                                );
                            }
                        }
                    }
                }
            }
        }

        return response()->json($submission->load(['form', 'currentStage', 'currentStatus', 'responses']));
    }

    public function submit(Request $request, string $shortname, Form $form, FormSubmission $submission)
    {
        // 1. Ownership/Permission Check
        $user = Auth::user();
        if ($submission->user_id !== ($user?->id)) {
            if (!User::hasFormPermission($user, $submission->form, 'modify_submissions')) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        if ($submission->submitted_at) {
            return response()->json(['message' => 'This form has already been submitted.'], 422);
        }

        // 2. Validation
        $form = $submission->form;
        $fields = $form->stages()->with('sections.fields')->get()->pluck('sections')->flatten()->pluck('fields')->flatten();
        
        $rules = [];
        foreach ($fields as $field) {
            $fieldRules = [];
            if ($field->is_required) {
                $fieldRules[] = 'required';
            } else {
                $fieldRules[] = 'nullable';
            }

            // Add custom validation rules if any
            if ($field->validation_rules && is_array($field->validation_rules)) {
                $fieldRules = array_merge($fieldRules, $field->validation_rules);
            }

            $rules["responses.{$field->id}"] = $fieldRules;
        }

        $validated = $request->validate($rules);

        // 3. Save Responses & Auto-Grade
        $totalPoints = 0;
        foreach ($validated['responses'] as $fieldId => $value) {
            $field = $fields->firstWhere('id', $fieldId);
            $pointsAwarded = 0;
            $isGraded = false;

            if ($form->type === 'quiz' && $field->is_automatic_scored) {
                $isGraded = true;
                
                $normalizedValue = $value;
                if (is_bool($value)) {
                    $normalizedValue = $value ? 'true' : 'false';
                } elseif (is_array($value)) {
                    $normalizedValue = json_encode($value);
                } else {
                    $normalizedValue = strtolower(trim((string)$value));
                }

                $normalizedCorrect = strtolower(trim((string)$field->correct_answer));

                if ($normalizedValue === $normalizedCorrect) {
                    $pointsAwarded = $field->points;
                }
            }

            FormResponse::updateOrCreate(
                [
                    'form_submission_id' => $submission->id,
                    'form_field_id' => $fieldId
                ],
                [
                    'value' => is_array($value) ? json_encode($value) : $value,
                    'is_graded' => $isGraded,
                    'points_awarded' => $pointsAwarded
                ]
            );
        }

        // 4. Finalize Submission
        $updateData = [
            'submitted_at' => now(),
        ];

        if ($form->type === 'quiz' && $form->is_automatic_grading) {
            $totalPointsAwarded = $submission->responses()->sum('points_awarded');
            $statusName = $totalPointsAwarded >= $form->pass_points ? 'Passed' : 'Failed';
            
            // Try to find by name first, then by flags
            $status = $form->statuses()->where('name', $statusName)->first();
            if (!$status) {
                if ($statusName === 'Passed') {
                    $status = $form->statuses()->where('is_passed', true)->first();
                } else {
                    $status = $form->statuses()->where('is_failed', true)->first();
                }
            }

            if ($status) {
                $updateData['current_status_id'] = $status->id;
            }
        }

        $submission->update($updateData);

        return response()->json(['message' => 'Form submitted successfully!', 'submission' => $submission->load('currentStatus')]);
    }

    public function show(string $shortname, FormSubmission $submission)
    {
        $user = Auth::user();
        
        // Permission check
        if ($submission->user_id !== ($user?->id)) {
            if (!User::hasFormPermission($user, $submission->form, 'view_submissions')) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        $submission->load([
            'form.statuses', 
            'currentStatus', 
            'currentStage', 
            'responses.field', 
            'user:id,username',
            'comments.user:id,username'
        ]);

        // Filter internal comments if the user doesn't have moderation permission
        if (!User::hasFormPermission($user, $submission->form, 'modify_submission_status')) {
            $submission->setRelation('comments', $submission->comments->where('is_internal', false));
        }

        return response()->json($submission);
    }

    public function updateStatus(Request $request, string $shortname, FormSubmission $submission)
    {
        $user = Auth::user();
        $form = $submission->form;

        if (!User::hasFormPermission($user, $form, 'modify_submission_status')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'status_id' => 'required|exists:form_statuses,id',
            'stage_id' => 'nullable|exists:form_stages,id',
        ]);

        // Ensure status belongs to the form
        $status = FormStatus::where('id', $validated['status_id'])->where('form_id', $form->id)->firstOrFail();

        $updateData = [
            'current_status_id' => $status->id,
        ];

        if (isset($validated['stage_id'])) {
            $stage = FormStage::where('id', $validated['stage_id'])->where('form_id', $form->id)->firstOrFail();
            $updateData['current_stage_id'] = $stage->id;
        }

        $submission->update($updateData);

        return response()->json(['message' => 'Status updated successfully', 'submission' => $submission->load('currentStatus', 'currentStage')]);
    }

    public function addComment(Request $request, string $shortname, FormSubmission $submission)
    {
        $user = Auth::user();
        $form = $submission->form;

        $isReviewer = User::hasFormPermission($user, $form, 'modify_submission_status');
        $isOwner = $submission->user_id === $user->id;

        if (!$isReviewer && !$isOwner) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'comment' => 'required|string',
            'is_internal' => 'boolean',
        ]);

        if ($validated['is_internal'] && !$isReviewer) {
            return response()->json(['message' => 'You cannot post internal comments.'], 403);
        }

        $comment = $submission->comments()->create([
            'user_id' => $user->id,
            'comment' => $validated['comment'],
            'is_internal' => $validated['is_internal'] ?? false,
        ]);

        return response()->json($comment->load('user:id,username'));
    }

    public function gradeResponses(Request $request, string $shortname, FormSubmission $submission)
    {
        $user = Auth::user();
        $form = $submission->form;

        if (!User::hasFormPermission($user, $form, 'modify_submission_status')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'grades' => 'required|array',
            'grades.*.response_id' => 'required|exists:form_responses,id',
            'grades.*.points' => 'required|integer|min:0',
            'grades.*.comment' => 'nullable|string',
        ]);

        foreach ($validated['grades'] as $grade) {
            $response = FormResponse::where('id', $grade['response_id'])
                ->where('form_submission_id', $submission->id)
                ->firstOrFail();

            $response->update([
                'points_awarded' => $grade['points'],
                'reviewer_comment' => $grade['comment'],
                'is_graded' => true,
            ]);
        }

        return response()->json(['message' => 'Responses graded successfully']);
    }
}
