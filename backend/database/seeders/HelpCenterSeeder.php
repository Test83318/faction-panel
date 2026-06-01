<?php

namespace Database\Seeders;

use App\Models\HelpArticle;
use App\Models\HelpCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class HelpCenterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure superadmin user exists for attribution
        $admin = User::updateOrCreate(
            ['username' => 'testuser'],
            [
                'password' => Hash::make('password'),
                'is_superadmin' => true,
            ]
        );

        // 1. General Panel Help
        $general = HelpCategory::create([
            'name' => 'General Panel Help',
            'icon' => 'information-circle',
            'order' => 0,
        ]);

        HelpArticle::create([
            'category_id' => $general->id,
            'title' => 'Getting Started with the Faction Panel',
            'slug' => 'getting-started-faction-panel',
            'content' => "Welcome to Antelope Faction Panel!\n\nThis platform serves as a replacement for old roster and record spreadsheets. Factions are now organized into unified database networks where data can be linked in real-time.\n\n### Key Concepts:\n1. **Factions**: Your organization. Includes ranks, members, groups, and logs.\n2. **Rosters**: Real-time spreadsheet layouts. Multiple rosters can be created per faction (e.g. Patrol Roster, SWAT Roster).\n3. **Record Databases**: Secure databases for warrants, incident reports, or disciplinary logs.\n4. **Forms**: Online applications for recruits or internally for promotions.",
            'order' => 0,
            'is_published' => true,
            'created_by' => $admin->id,
        ]);

        HelpArticle::create([
            'category_id' => $general->id,
            'title' => 'Linking your GTA World Account',
            'slug' => 'linking-gta-world-account',
            'content' => "Antelope integrates directly with GTA World APIs to automate character rosters and synchronize roles.\n\n### How to Link:\n1. Open your User Settings page (top-right menu dropdown -> User Settings).\n2. Click the 'Link GTA:W Account' button.\n3. Log in using the GTA:W OAuth gateway and authorize Antelope.\n4. Once linked, you will see your GTA:W Forum Username and connected UCP data under your profile.\n\n*Note: Faction Leaders can trigger automated synchronizations once their GTA:W faction key is linked.*",
            'order' => 1,
            'is_published' => true,
            'created_by' => $admin->id,
        ]);

        // 2. Roster Management
        $rosters = HelpCategory::create([
            'name' => 'Roster Management',
            'icon' => 'table-cells',
            'order' => 1,
        ]);

        HelpArticle::create([
            'category_id' => $rosters->id,
            'title' => 'Configuring Roster Columns',
            'slug' => 'configuring-roster-columns',
            'content' => "Roster columns define the spreadsheet format. Leaders can customize these columns to support various data types.\n\n### Column Types:\n- **Text**: Standard text cells (e.g. Callsign, Nickname).\n- **Dropdown**: Standard single-select options.\n- **Dataset**: Dynamically load options from a shared Roster Dataset (e.g. Rank List, Duty Status).\n- **Database Link**: Load options dynamically from a Faction Record Database (e.g. linking to an Officer Profile ID).\n- **Linked Roster Data**: Reference a cell value located on a completely different roster sheet.",
            'order' => 0,
            'is_published' => true,
            'created_by' => $admin->id,
        ]);

        // 3. Form Builder Help
        $forms = HelpCategory::create([
            'name' => 'Form Builder Help',
            'icon' => 'document-text',
            'order' => 2,
        ]);

        HelpArticle::create([
            'category_id' => $forms->id,
            'title' => 'Setting up Recruitment Form Automations',
            'slug' => 'recruitment-form-automations',
            'content' => "Automations allow you to trigger database updates, role changes, or notifications when form statuses transition.\n\n### Setting up an Automation:\n1. Open your Form in the Form Editor.\n2. Click on the 'Automations' tab.\n3. Add a new automation trigger (e.g., 'When Status is updated to Approved').\n4. Select the action (e.g., 'Assign Role: Recruit' or 'Add to Group: Academy Cadets').\n5. Save and enable the automation.",
            'order' => 0,
            'is_published' => true,
            'created_by' => $admin->id,
        ]);
    }
}
