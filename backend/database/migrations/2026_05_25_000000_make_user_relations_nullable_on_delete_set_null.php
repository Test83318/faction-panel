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
        // 1. factions
        Schema::table('factions', function (Blueprint $table) {
            $table->dropForeign(['faction_leader']);
            $table->dropForeign(['created_by']);
        });
        Schema::table('factions', function (Blueprint $table) {
            $table->foreignId('faction_leader')->nullable()->change();
            $table->foreignId('created_by')->nullable()->change();
        });
        Schema::table('factions', function (Blueprint $table) {
            $table->foreign('faction_leader')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // 2. rosters
        Schema::table('rosters', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('rosters', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // 3. roster_sections
        Schema::table('roster_sections', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('roster_sections', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->change();
        });
        Schema::table('roster_sections', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // 4. roster_contents
        Schema::table('roster_contents', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('roster_contents', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->change();
        });
        Schema::table('roster_contents', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // 5. groups
        Schema::table('groups', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('groups', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->change();
        });
        Schema::table('groups', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // 6. roster_flags
        Schema::table('roster_flags', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('roster_flags', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->change();
        });
        Schema::table('roster_flags', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // 7. faction_record_databases
        Schema::table('faction_record_databases', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('faction_record_databases', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // 8. faction_record_entries
        Schema::table('faction_record_entries', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('faction_record_entries', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->change();
        });
        Schema::table('faction_record_entries', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // 9. statistics_models
        Schema::table('statistics_models', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('statistics_models', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });

        // 10. help_articles
        Schema::table('help_articles', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('help_articles', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->change();
        });
        Schema::table('help_articles', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverse changes: drop the new foreign keys and re-apply standard restricted or cascade foreign keys.
        // For local testing and general robustness, we can implement this or keep it simple.
        // Let's implement it for completeness.

        // 10. help_articles
        Schema::table('help_articles', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('help_articles', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable(false)->change();
        });
        Schema::table('help_articles', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users');
        });

        // 9. statistics_models
        Schema::table('statistics_models', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('statistics_models', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
        });

        // 8. faction_record_entries
        Schema::table('faction_record_entries', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('faction_record_entries', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable(false)->change();
        });
        Schema::table('faction_record_entries', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });

        // 7. faction_record_databases
        Schema::table('faction_record_databases', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('faction_record_databases', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
        });

        // 6. roster_flags
        Schema::table('roster_flags', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('roster_flags', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable(false)->change();
        });
        Schema::table('roster_flags', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users');
        });

        // 5. groups
        Schema::table('groups', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('groups', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable(false)->change();
        });
        Schema::table('groups', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users');
        });

        // 4. roster_contents
        Schema::table('roster_contents', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('roster_contents', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable(false)->change();
        });
        Schema::table('roster_contents', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users');
        });

        // 3. roster_sections
        Schema::table('roster_sections', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('roster_sections', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable(false)->change();
        });
        Schema::table('roster_sections', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users');
        });

        // 2. rosters
        Schema::table('rosters', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
        });
        Schema::table('rosters', function (Blueprint $table) {
            $table->foreign('created_by')->references('id')->on('users');
        });

        // 1. factions
        Schema::table('factions', function (Blueprint $table) {
            $table->dropForeign(['faction_leader']);
            $table->dropForeign(['created_by']);
        });
        Schema::table('factions', function (Blueprint $table) {
            $table->foreignId('faction_leader')->nullable(false)->change();
            $table->foreignId('created_by')->nullable(false)->change();
        });
        Schema::table('factions', function (Blueprint $table) {
            $table->foreign('faction_leader')->references('id')->on('users');
            $table->foreign('created_by')->references('id')->on('users');
        });
    }
};
