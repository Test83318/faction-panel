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
        Schema::table('form_comments', function (Blueprint $table) {
            $table->foreignId('form_section_id')->nullable()->constrained('form_sections')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_comments', function (Blueprint $table) {
            $table->dropForeign(['form_section_id']);
            $table->dropColumn('form_section_id');
        });
    }
};
