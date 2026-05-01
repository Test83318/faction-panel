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
        Schema::create('roster_dataset_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('roster_dataset_id')->constrained()->cascadeOnDelete();
            $table->string('value');
            $table->string('color', 7)->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roster_dataset_options');
    }
};
