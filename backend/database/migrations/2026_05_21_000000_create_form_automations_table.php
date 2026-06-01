<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_automations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained()->onDelete('cascade');
            $table->string('name')->nullable();
            $table->string('trigger'); // on_submit, on_status_change
            $table->foreignId('trigger_status_id')->nullable()->constrained('form_statuses')->onDelete('cascade');
            $table->string('condition_logic')->default('all'); // all, any
            $table->json('conditions')->nullable();
            $table->string('action'); // set_status, add_comment
            $table->foreignId('action_status_id')->nullable()->constrained('form_statuses')->onDelete('set null');
            $table->text('action_comment')->nullable();
            $table->boolean('action_comment_internal')->default(false);
            $table->boolean('is_enabled')->default(true);
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_automations');
    }
};
