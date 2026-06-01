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
        // 1. Rename existing table
        if (Schema::hasTable('audit_logs') && ! Schema::hasTable('audit_logs_old')) {
            Schema::table('audit_logs', function (Blueprint $blueprint) {
                $blueprint->dropIndex(['auditable_type', 'auditable_id']);
            });
            Schema::rename('audit_logs', 'audit_logs_old');
        }

        // 2. Create the new audit_logs table
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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');

        if (Schema::hasTable('audit_logs_old')) {
            Schema::rename('audit_logs_old', 'audit_logs');
        }
    }
};
