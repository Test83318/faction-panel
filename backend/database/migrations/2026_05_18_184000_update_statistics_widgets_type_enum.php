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
        Schema::table('statistics_widgets', function (Blueprint $table) {
            $table->enum('type', ['pie', 'bar', 'line', 'table', 'stat', 'radar'])->default('pie')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('statistics_widgets', function (Blueprint $table) {
            $table->enum('type', ['pie', 'bar', 'line', 'table'])->default('pie')->change();
        });
    }
};
