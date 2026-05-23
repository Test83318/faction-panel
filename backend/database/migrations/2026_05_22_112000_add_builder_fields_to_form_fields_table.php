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
        Schema::table('form_fields', function (Blueprint $table) {
            $table->text('description')->nullable()->after('label');
            $table->text('default_value')->nullable()->after('prefill_type');
            $table->boolean('is_disabled')->default(false)->after('default_value');
            $table->string('placeholder')->nullable()->after('is_disabled');
            $table->boolean('is_multi')->default(false)->after('placeholder');
            $table->integer('width')->default(12)->after('is_multi');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('form_fields', function (Blueprint $table) {
            $table->dropColumn([
                'description',
                'default_value',
                'is_disabled',
                'placeholder',
                'is_multi',
                'width',
            ]);
        });
    }
};
