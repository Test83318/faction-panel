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
        Schema::table('faction_record_databases', function (Blueprint $table) {
            $table->dropColumn('is_enabled');
            $table->boolean('allow_details_view')->default(true)->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('faction_record_databases', function (Blueprint $table) {
            $table->boolean('is_enabled')->default(true)->after('description');
            $table->dropColumn('allow_details_view');
        });
    }
};
