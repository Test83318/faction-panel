<?php

namespace Database\Factories;

use App\Models\Faction;
use App\Models\Form;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Form>
 */
class FormFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'faction_id' => Faction::factory(),
            'name' => $this->faker->sentence(3),
            'type' => 'standard',
            'description' => $this->faker->paragraph(),
            'is_public' => false,
            'requires_gtaw_login' => false,
            'cooldown_seconds' => 0,
            'is_enabled' => true,
            'created_by' => User::factory(),
        ];
    }
}
