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
        Schema::table('rosters', function (Blueprint $table) {
            $table->json('counts')->nullable()->after('roster_options');
        });

        Schema::table('roster_sections', function (Blueprint $table) {
            $table->json('counts')->nullable()->after('layout_settings');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rosters', function (Blueprint $table) {
            $table->dropColumn('counts');
        });

        Schema::table('roster_sections', function (Blueprint $table) {
            $table->dropColumn('counts');
        });
    }
};
