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
        Schema::table('faction_user', function (Blueprint $table) {
            $table->foreignId('current_roster_id')->nullable()->constrained('rosters')->nullOnDelete();
            $table->timestamp('last_roster_activity')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('faction_user', function (Blueprint $table) {
            $table->dropConstrainedForeignId('current_roster_id');
            $table->dropColumn('last_roster_activity');
        });
    }
};
