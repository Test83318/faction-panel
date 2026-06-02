<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Delete matching logs from the current audit_logs table before renaming
        if (Schema::hasTable('audit_logs')) {
            DB::table('audit_logs')
                ->where('event', 'snapshot.auto_create_skip')
                ->orWhere('description', 'like', 'Skipped automatic snapshot%')
                ->delete();

            // 2. Drop the composite index on the old table to avoid name collision with the new table
            Schema::table('audit_logs', function (Blueprint $blueprint) {
                try {
                    $blueprint->dropIndex(['auditable_type', 'auditable_id']);
                } catch (Exception $e) {
                    // Ignore if index doesn't exist
                }
            });

            // 3. Rename the current audit_logs table to _old2
            if (! Schema::hasTable('_old2')) {
                Schema::rename('audit_logs', '_old2');
            }
        }

        // 4. Create the new clean audit_logs table
        Schema::create('audit_logs', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->foreignId('faction_id')->nullable()->constrained()->onDelete('cascade');
            $blueprint->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $blueprint->string('event');
            $blueprint->text('description')->nullable();
            $blueprint->string('auditable_type')->nullable();
            $blueprint->unsignedBigInteger('auditable_id')->nullable();
            $blueprint->json('old_values')->nullable();
            $blueprint->json('new_values')->nullable();
            $blueprint->string('url')->nullable();
            $blueprint->string('ip_address')->nullable();
            $blueprint->string('user_agent')->nullable();
            $blueprint->string('method')->nullable();
            $blueprint->timestamps();

            $blueprint->index(['auditable_type', 'auditable_id']);
        });

        // 5. Drop the old audit log tables completely as requested
        Schema::dropIfExists('audit_logs_old');
        Schema::dropIfExists('_old2');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the new audit_logs table
        Schema::dropIfExists('audit_logs');

        // Restore _old2 back to audit_logs and recreate index
        if (Schema::hasTable('_old2')) {
            Schema::rename('_old2', 'audit_logs');
            Schema::table('audit_logs', function (Blueprint $blueprint) {
                $blueprint->index(['auditable_type', 'auditable_id']);
            });
        }
    }
};
