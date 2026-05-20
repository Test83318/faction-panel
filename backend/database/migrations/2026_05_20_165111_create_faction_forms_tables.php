<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('forms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faction_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('type')->default('standard'); // standard, quiz
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('is_public')->default(false);
            $table->integer('cooldown_seconds')->default(0);
            $table->boolean('cooldown_only_on_fail')->default(false);
            $table->boolean('is_enabled')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('form_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        Schema::create('form_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_stage_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        Schema::create('form_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_section_id')->constrained()->onDelete('cascade');
            $table->string('type');
            $table->string('label');
            $table->string('name');
            $table->json('options')->nullable();
            $table->json('validation_rules')->nullable();
            $table->integer('order')->default(0);
            $table->integer('points')->default(0);
            $table->boolean('is_required')->default(false);
            $table->boolean('is_automatic_scored')->default(false);
            $table->timestamps();
        });

        Schema::create('form_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->integer('order')->default(0);
            $table->boolean('is_hidden')->default(false);
            $table->boolean('is_locked')->default(false);
            $table->boolean('is_closed')->default(false);
            $table->boolean('is_failed')->default(false);
            $table->boolean('is_passed')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->timestamps();
        });

        Schema::create('form_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->onDelete('cascade');
            $table->foreignId('group_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('role_id')->nullable()->constrained()->onDelete('cascade');
            $table->json('permissions');
            $table->timestamps();
        });

        Schema::create('form_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('current_stage_id')->nullable()->constrained('form_stages')->onDelete('set null');
            $table->foreignId('current_status_id')->nullable()->constrained('form_statuses')->onDelete('set null');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('submitted_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('form_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_submission_id')->constrained()->onDelete('cascade');
            $table->foreignId('form_field_id')->constrained()->onDelete('cascade');
            $table->longText('value')->nullable();
            $table->integer('points_awarded')->nullable();
            $table->boolean('is_graded')->default(false);
            $table->text('reviewer_comment')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('form_responses');
        Schema::dropIfExists('form_submissions');
        Schema::dropIfExists('form_permissions');
        Schema::dropIfExists('form_statuses');
        Schema::dropIfExists('form_fields');
        Schema::dropIfExists('form_sections');
        Schema::dropIfExists('form_stages');
        Schema::dropIfExists('forms');
    }
};
