<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->string('color')->nullable()->after('weight');
        });

        // Update existing system roles with default colors
        DB::table('roles')->where('name', 'Administrator')->update(['color' => '#ef4444']);
        DB::table('roles')->whereIn('name', ['User', 'Public'])->update(['color' => '#d1d5db']);
        DB::table('roles')->whereNull('color')->update(['color' => '#3b82f6']); // Default blue for others
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
