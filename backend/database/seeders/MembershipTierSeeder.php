<?php

namespace Database\Seeders;

use App\Models\MembershipTier;
use Illuminate\Database\Seeder;

class MembershipTierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        MembershipTier::updateOrCreate(
            ['id' => 1],
            [
                'name' => 'Free',
                'max_factions' => 1,
                'allow_custom_branding' => false,
            ]
        );

        MembershipTier::updateOrCreate(
            ['id' => 2],
            [
                'name' => 'Premium',
                'max_factions' => 3,
                'allow_custom_branding' => true,
            ]
        );

        MembershipTier::updateOrCreate(
            ['id' => 3],
            [
                'name' => 'Enterprise',
                'max_factions' => 10,
                'allow_custom_branding' => true,
            ]
        );
    }
}
