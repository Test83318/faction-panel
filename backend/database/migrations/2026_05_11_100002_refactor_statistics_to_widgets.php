<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Adjust statistics_models to be a container
        Schema::table('statistics_models', function (Blueprint $table) {
            $table->dropColumn(['type', 'configuration', 'cache_result', 'last_calculated_at', 'is_intensive']);
            $table->text('description')->nullable()->after('name');
        });

        // 2. Create statistics_widgets table
        Schema::create('statistics_widgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('statistics_model_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['pie', 'bar', 'line', 'table'])->default('pie');
            $table->json('configuration')->nullable();
            $table->json('cache_result')->nullable();
            $table->timestamp('last_calculated_at')->nullable();
            $table->boolean('is_intensive')->default(false);
            $table->integer('order')->default(0);
            $table->integer('width')->default(6); // 1-12 grid
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('statistics_widgets');
        Schema::table('statistics_models', function (Blueprint $table) {
            $table->enum('type', ['pie', 'bar', 'line', 'table'])->default('pie');
            $table->json('configuration')->nullable();
            $table->json('cache_result')->nullable();
            $table->timestamp('last_calculated_at')->nullable();
            $table->boolean('is_intensive')->default(false);
            $table->dropColumn('description');
        });
    }
};
