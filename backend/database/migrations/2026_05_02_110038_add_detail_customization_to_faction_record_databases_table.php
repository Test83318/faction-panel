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
            $table->json('detail_customization')->nullable()->after('database_structure');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('faction_record_databases', function (Blueprint $table) {
            $table->dropColumn('detail_customization');
        });
    }
};
