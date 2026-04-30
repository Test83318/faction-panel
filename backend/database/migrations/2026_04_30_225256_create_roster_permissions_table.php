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
        Schema::create('roster_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('roster_id')->constrained()->cascadeOnDelete();
            $table->foreignId('group_id')->nullable()->constrained()->cascadeOnDelete(); // NULL for Public/Everyone
            $table->json('permissions');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roster_permissions');
    }
};
