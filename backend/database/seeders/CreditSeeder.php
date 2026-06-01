<?php

namespace Database\Seeders;

use App\Models\Credit;
use Illuminate\Database\Seeder;

class CreditSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Credit::create([
            'name' => 'Antigravity AI',
            'role' => 'Lead Developer',
            'description' => 'Architected and implemented the core faction panel features and APIs.',
            'order' => 0,
        ]);

        Credit::create([
            'name' => 'Google DeepMind Team',
            'role' => 'Creator & Designer',
            'description' => 'Provided advanced agentic coding systems and architectural guidance.',
            'order' => 1,
        ]);

        Credit::create([
            'name' => 'GTA World Development Team',
            'role' => 'API Partner',
            'description' => 'Maintained and provided GTA:W OAuth, API keys, and synchronization integrations.',
            'order' => 2,
        ]);
    }
}
