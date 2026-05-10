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
        Schema::table('roster_contents', function (Blueprint $table) {
            $table->string('color')->nullable()->after('type');
        });

        Schema::table('roster_sections', function (Blueprint $table) {
            $table->boolean('use_roster_columns')->default(true)->after('columns');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roster_contents', function (Blueprint $table) {
            $table->dropColumn('color');
        });

        Schema::table('roster_sections', function (Blueprint $table) {
            $table->dropColumn('use_roster_columns');
        });
    }
};
