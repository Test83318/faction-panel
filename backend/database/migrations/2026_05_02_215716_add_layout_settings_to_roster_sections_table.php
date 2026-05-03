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
            $table->json('layout_settings')->nullable()->after('columns');
            $table->integer('subsections_per_row')->default(1)->after('layout_settings');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roster_sections', function (Blueprint $table) {
            $table->dropColumn(['layout_settings', 'subsections_per_row']);
        });
    }
};
