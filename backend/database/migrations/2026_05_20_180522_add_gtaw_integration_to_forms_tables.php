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
        Schema::table('forms', function (Blueprint $table) {
            $table->boolean('requires_gtaw_login')->default(false)->after('is_public');
        });

        Schema::table('form_fields', function (Blueprint $table) {
            $table->string('prefill_type')->nullable()->after('correct_answer');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('forms', function (Blueprint $table) {
            $table->dropColumn('requires_gtaw_login');
        });

        Schema::table('form_fields', function (Blueprint $table) {
            $table->dropColumn('prefill_type');
        });
    }
};
