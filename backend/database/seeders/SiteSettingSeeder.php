<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class SiteSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        SiteSetting::updateOrCreate(['key' => 'site_name'], ['value' => 'Antelope Faction Suite']);
        SiteSetting::updateOrCreate(['key' => 'registrations_enabled'], ['value' => 'true']);
        SiteSetting::updateOrCreate(['key' => 'gtaw_auth_enabled'], ['value' => 'true']);
    }
}
