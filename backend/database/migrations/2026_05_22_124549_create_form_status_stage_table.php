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
        Schema::create('form_status_stage', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_status_id')->constrained('form_statuses')->onDelete('cascade');
            $table->foreignId('form_stage_id')->constrained('form_stages')->onDelete('cascade');
            $table->unique(['form_status_id', 'form_stage_id']);
            $table->timestamps();
        });

        // Copy existing data if any exists
        $statuses = DB::table('form_statuses')->whereNotNull('form_stage_id')->get();
        foreach ($statuses as $status) {
            DB::table('form_status_stage')->insert([
                'form_status_id' => $status->id,
                'form_stage_id' => $status->form_stage_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::table('form_statuses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('form_stage_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_statuses', function (Blueprint $table) {
            $table->foreignId('form_stage_id')->nullable()->after('form_id')->constrained('form_stages')->onDelete('cascade');
        });

        // Restore data
        $bindings = DB::table('form_status_stage')->get();
        foreach ($bindings as $binding) {
            DB::table('form_statuses')
                ->where('id', $binding->form_status_id)
                ->update(['form_stage_id' => $binding->form_stage_id]);
        }

        Schema::dropIfExists('form_status_stage');
    }
};
