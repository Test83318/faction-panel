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
        Schema::table('form_stages', function (Blueprint $table) {
            $table->foreignId('submit_status_id')->nullable()->after('name')->constrained('form_statuses')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_stages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('submit_status_id');
        });
    }
};
