<?php

namespace Database\Factories;

use App\Models\Faction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Faction>
 */
class FactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $user = User::factory()->create();

        return [
            'name' => $this->faker->company(),
            'shortname' => $this->faker->unique()->slug(1),
            'color' => $this->faker->hexColor(),
            'faction_leader' => $user->id,
            'created_by' => $user->id,
        ];
    }
}
