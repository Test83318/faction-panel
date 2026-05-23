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
        Schema::table('forms', function (Blueprint $table) {
            if (Schema::hasColumn('forms', 'pass_points')) {
                $table->dropColumn('pass_points');
            }
        });

        Schema::table('form_stages', function (Blueprint $table) {
            $table->integer('required_points')->default(0)->after('submit_status_id');
        });

        // Migrate existing automations
        DB::table('form_automations')
            ->where('trigger', 'on_submit')
            ->update(['trigger' => 'on_final_submit']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_stages', function (Blueprint $table) {
            $table->dropColumn('required_points');
        });

        Schema::table('forms', function (Blueprint $table) {
            $table->integer('pass_points')->default(0)->after('type');
        });

        // Revert automations
        DB::table('form_automations')
            ->where('trigger', 'on_final_submit')
            ->update(['trigger' => 'on_submit']);
    }
};
