<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // PostgreSQL handles enums with CHECK constraints. We need to drop the old one and add the new one.
        Schema::table('statistics_widgets', function (Blueprint $table) {
            DB::statement('ALTER TABLE statistics_widgets DROP CONSTRAINT IF EXISTS statistics_widgets_type_check');
            DB::statement("ALTER TABLE statistics_widgets ADD CONSTRAINT statistics_widgets_type_check CHECK (type::text IN ('pie', 'bar', 'line', 'table', 'stat', 'radar'))");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('statistics_widgets', function (Blueprint $table) {
            DB::statement('ALTER TABLE statistics_widgets DROP CONSTRAINT IF EXISTS statistics_widgets_type_check');
            DB::statement("ALTER TABLE statistics_widgets ADD CONSTRAINT statistics_widgets_type_check CHECK (type::text IN ('pie', 'bar', 'line', 'table'))");
        });
    }
};
