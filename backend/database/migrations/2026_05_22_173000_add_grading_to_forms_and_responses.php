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
        Schema::table('form_fields', function (Blueprint $table) {
            $table->boolean('has_grading')->default(false)->after('is_required');
        });

        Schema::table('form_responses', function (Blueprint $table) {
            $table->string('correctness')->nullable()->after('reviewer_comment');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_fields', function (Blueprint $table) {
            $table->dropColumn('has_grading');
        });

        Schema::table('form_responses', function (Blueprint $table) {
            $table->dropColumn('correctness');
        });
    }
};
