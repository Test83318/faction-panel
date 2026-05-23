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
            $table->foreignId('action_group_id')->nullable()->constrained('groups')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_automations', function (Blueprint $table) {
            $table->dropForeign(['action_group_id']);
            $table->dropColumn('action_group_id');
        });
    }
};
