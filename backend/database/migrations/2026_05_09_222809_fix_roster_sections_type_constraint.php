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
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            // Drop the check constraint created by the original enum definition
            DB::statement('ALTER TABLE roster_sections DROP CONSTRAINT IF EXISTS roster_sections_type_check');
        }

        // Redundantly ensure it's a string column just in case
        Schema::table('roster_sections', function (Blueprint $table) {
            $table->string('type')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Re-adding the constraint is complex and probably not desired if we want 'content' type.
        // We'll leave it as a string.
    }
};
