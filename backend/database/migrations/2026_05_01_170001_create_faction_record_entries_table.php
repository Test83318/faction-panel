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
        Schema::create('faction_record_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('database_id')->constrained('faction_record_databases')->onDelete('cascade');
            $table->unsignedBigInteger('entry_id');
            $table->json('data');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('faction_record_entries');
    }
};
