<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('statistics_models', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faction_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['pie', 'bar', 'line', 'table'])->default('pie');
            $table->json('configuration')->nullable();
            $table->json('cache_result')->nullable();
            $table->timestamp('last_calculated_at')->nullable();
            $table->boolean('is_intensive')->default(false);
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('statistics_models');
    }
};
