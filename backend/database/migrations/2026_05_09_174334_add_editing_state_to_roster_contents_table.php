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
            $table->foreignId('editing_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('editing_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roster_contents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('editing_by');
            $table->dropColumn('editing_at');
        });
    }
};
