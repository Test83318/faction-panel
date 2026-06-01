<?php

namespace Database\Seeders;

use App\Models\ChangelogEntry;
use Illuminate\Database\Seeder;

class ChangelogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ChangelogEntry::create([
            'version' => 'v1.0.0',
            'title' => 'Initial Release',
            'body' => "Welcome to the Antelope Faction Suite!\n\nFeatures in this release:\n- Relational Roster management with inline spreadsheet editing.\n- Detailed audit logs for security and tracking.\n- Resource-based role permissions (RBAC).",
            'released_at' => now()->subDays(10),
            'order' => 0,
        ]);

        ChangelogEntry::create([
            'version' => 'v1.1.0',
            'title' => 'Form Builder & Custom Recruitment',
            'body' => "We are excited to release the custom Form Builder:\n- Design recruitment forms with stages, statuses, and custom questions.\n- Auto-grade submissions and set custom points per field.\n- Automate status updates on transition.",
            'released_at' => now()->subDays(5),
            'order' => 1,
        ]);

        ChangelogEntry::create([
            'version' => 'v1.2.0',
            'title' => 'Audit Log Redesign',
            'body' => "Audit logs have been overhauled for performance and compliance:\n- Archived old logs into dedicated schema structures.\n- Optimized manual controller action logging.\n- Refreshed UI layout matching modern dark mode theme.",
            'released_at' => now(),
            'order' => 2,
        ]);
    }
}
