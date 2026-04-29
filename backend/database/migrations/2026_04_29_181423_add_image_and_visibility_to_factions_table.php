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
        Schema::table('factions', function (Blueprint $table) {
            $table->string('image_url')->nullable()->after('color');
            $table->enum('visibility', ['public', 'hidden', 'joinable', 'invite-only', 'private'])->default('private')->after('image_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('factions', function (Blueprint $table) {
            $table->dropColumn(['image_url', 'visibility']);
        });
    }
};
