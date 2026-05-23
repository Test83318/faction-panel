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
        Schema::table('form_automations', function (Blueprint $table) {
            $table->foreignId('trigger_stage_id')
                ->nullable()
                ->after('trigger_status_id')
                ->constrained('form_stages')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_automations', function (Blueprint $table) {
            $table->dropForeign(['trigger_stage_id']);
            $table->dropColumn('trigger_stage_id');
        });
    }
};
