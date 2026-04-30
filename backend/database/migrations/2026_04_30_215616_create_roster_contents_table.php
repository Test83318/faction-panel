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
        Schema::create('roster_contents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('roster_sections')->cascadeOnDelete();
            $table->integer('order')->default(0);
            $table->string('type')->default('predefined'); // predefined, defined
            $table->json('content')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roster_contents');
    }
};
