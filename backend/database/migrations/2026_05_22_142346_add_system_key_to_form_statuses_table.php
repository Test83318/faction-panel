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
        Schema::table('form_statuses', function (Blueprint $table) {
            $table->string('system_key')->nullable()->after('form_id');
            $table->unique(['form_id', 'system_key']);
        });

        // Set system_key for existing Submitted statuses
        DB::table('form_statuses')->where('name', 'Submitted')->update(['system_key' => 'submitted']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_statuses', function (Blueprint $table) {
            $table->dropUnique(['form_id', 'system_key']);
            $table->dropColumn('system_key');
        });
    }
};
