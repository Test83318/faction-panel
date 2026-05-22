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
        if (DB::getDriverName() === 'pgsql') {
            // PostgreSQL handles enums with CHECK constraints.
            DB::statement('ALTER TABLE statistics_widgets DROP CONSTRAINT IF EXISTS statistics_widgets_type_check');
            DB::statement("ALTER TABLE statistics_widgets ADD CONSTRAINT statistics_widgets_type_check CHECK (type::text IN ('pie', 'bar', 'line', 'table', 'stat', 'radar'))");
        } else {
            // For SQLite and others, we use standard change()
            Schema::table('statistics_widgets', function (Blueprint $table) {
                $table->string('type')->default('pie')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE statistics_widgets DROP CONSTRAINT IF EXISTS statistics_widgets_type_check');
            DB::statement("ALTER TABLE statistics_widgets ADD CONSTRAINT statistics_widgets_type_check CHECK (type::text IN ('pie', 'bar', 'line', 'table'))");
        } else {
            Schema::table('statistics_widgets', function (Blueprint $table) {
                $table->string('type')->default('pie')->change();
            });
        }
    }
};
