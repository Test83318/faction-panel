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
            $table->boolean('is_published')->default(false)->after('is_api_database');
        });

        Schema::table('roster_datasets', function (Blueprint $table) {
            $table->foreignId('record_database_id')->nullable()->constrained('faction_record_databases')->nullOnDelete()->after('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('faction_record_databases', function (Blueprint $table) {
            $table->dropColumn('is_published');
        });

        Schema::table('roster_datasets', function (Blueprint $table) {
            $table->dropForeign(['record_database_id']);
            $table->dropColumn('record_database_id');
        });
    }
};
