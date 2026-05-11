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
        Schema::table('roster_permissions', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('group_id')->constrained()->cascadeOnDelete();
        });

        Schema::table('faction_record_database_permissions', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('group_id')->constrained()->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roster_permissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });

        Schema::table('faction_record_database_permissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('role_id');
        });
    }
};
