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
        Schema::table('form_statuses', function (Blueprint $table) {
            $table->foreignId('form_stage_id')->nullable()->after('form_id')->constrained('form_stages')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_statuses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('form_stage_id');
        });
    }
};
