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
        Schema::table('roster_sections', function (Blueprint $table) {
            $table->string('type')->change(); // Change from enum to string to allow 'content'
            $table->longText('content_html')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roster_sections', function (Blueprint $table) {
            $table->dropColumn('content_html');
            // Not going back to enum easily without raw SQL, but string is fine for down too.
        });
    }
};
