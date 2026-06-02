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
        Schema::create('notification_schemes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faction_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('trigger_type'); // database_entry_created, database_entry_updated, roster_row_created, roster_row_updated, faction_updated
            $table->unsignedBigInteger('target_id')->nullable(); // e.g. database_id or roster_id
            $table->json('conditions')->nullable(); // conditions structure
            $table->string('read_type')->default('user_bound'); // global, user_bound
            $table->text('text_template')->nullable(); // custom branding text
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('notification_scheme_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('notification_scheme_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('group_id')->nullable()->constrained()->cascadeOnDelete();
            $table->json('permissions'); // receive, read, manage
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faction_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('notification_scheme_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete(); // targeted system / user notification
            $table->string('type'); // system, user, faction
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable(); // e.g., target entity path parameters
            $table->boolean('is_read')->default(false); // for global/system/user notifications
            $table->timestamps();
        });

        Schema::create('notification_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('notification_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('read_at')->useCurrent();
            $table->timestamps();

            $table->unique(['notification_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_reads');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('notification_scheme_permissions');
        Schema::dropIfExists('notification_schemes');
    }
};
