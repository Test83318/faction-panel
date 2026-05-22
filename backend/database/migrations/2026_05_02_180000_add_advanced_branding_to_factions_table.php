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
        Schema::table('factions', function (Blueprint $table) {
            $table->boolean('header_link_to_faction')->default(false);
            $table->boolean('hide_panel_header')->default(false);
            $table->string('custom_footer_text')->nullable();
            $table->string('header_bg_color')->nullable();
            $table->boolean('header_gradient_enabled')->default(false);
            $table->string('header_gradient_color')->nullable();
            $table->string('header_gradient_direction')->default('to-r');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('factions', function (Blueprint $table) {
            $table->dropColumn([
                'header_link_to_faction',
                'hide_panel_header',
                'custom_footer_text',
                'header_bg_color',
                'header_gradient_enabled',
                'header_gradient_color',
                'header_gradient_direction',
            ]);
        });
    }
};
