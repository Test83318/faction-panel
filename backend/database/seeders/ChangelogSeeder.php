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
            'body' => null,
            'items' => [
                ['type' => 'Feature', 'content' => 'Relational Roster management with inline spreadsheet editing.'],
                ['type' => 'Feature', 'content' => 'Detailed audit logs for security and tracking.'],
                ['type' => 'Feature', 'content' => 'Resource-based role permissions (RBAC).'],
            ],
            'released_at' => now()->subDays(10),
            'order' => 0,
        ]);

        ChangelogEntry::create([
            'version' => 'v1.1.0',
            'title' => 'Form Builder & Custom Recruitment',
            'body' => null,
            'items' => [
                ['type' => 'Feature', 'content' => 'Design recruitment forms with stages, statuses, and custom questions.'],
                ['type' => 'Feature', 'content' => 'Auto-grade submissions and set custom points per field.'],
                ['type' => 'Feature', 'content' => 'Automate status updates on transition.'],
            ],
            'released_at' => now()->subDays(5),
            'order' => 1,
        ]);

        ChangelogEntry::create([
            'version' => 'v1.2.0',
            'title' => 'Audit Log Redesign',
            'body' => null,
            'items' => [
                ['type' => 'Modification', 'content' => 'Archived old logs into dedicated schema structures.'],
                ['type' => 'Backend', 'content' => 'Optimized manual controller action logging.'],
                ['type' => 'Modification', 'content' => 'Refreshed UI layout matching modern dark mode theme.'],
            ],
            'released_at' => now(),
            'order' => 2,
        ]);
    }
}
