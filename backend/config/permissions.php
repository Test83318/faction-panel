<?php

return [
    'categories' => [
        'rosters' => [
            'name' => 'Rosters',
            'permissions' => [
                'view_faction_roster' => [
                    'name' => 'View Faction Roster',
                    'description' => 'Allows the user to see the entire faction roster.',
                    'type' => 'VIEW',
                ],
            ],
        ],
        'administration' => [
            'name' => 'Administration',
            'permissions' => [
                'view_admin_page' => [
                    'name' => 'View Administration Page',
                    'description' => 'Allows access to the administration dashboard.',
                    'type' => 'VIEW',
                ],
                'view_faction_details' => [
                    'name' => 'View Faction Details',
                    'description' => 'Allows viewing the basic faction information tab.',
                    'type' => 'VIEW',
                ],
                'modify_faction_details' => [
                    'name' => 'Modify Faction Details',
                    'description' => 'Allows editing faction details (name, color, etc.).',
                    'type' => 'MODIFY',
                ],
                'view_permissions' => [
                    'name' => 'View Permissions',
                    'description' => 'Allows viewing of role permissions.',
                    'type' => 'VIEW',
                ],
                'modify_permissions' => [
                    'name' => 'Modify Permissions',
                    'description' => 'Allows changing permissions for any role.',
                    'type' => 'MODIFY',
                ],
                'view_users' => [
                    'name' => 'View Users',
                    'description' => 'Allows viewing the faction member list in administration.',
                    'type' => 'VIEW',
                ],
                'remove_users' => [
                    'name' => 'Remove Users',
                    'description' => 'Allows removing members from the faction.',
                    'type' => 'DELETE',
                ],
                'change_ranks' => [
                    'name' => 'Change Ranks',
                    'description' => 'Allows changing a member\'s rank/role.',
                    'type' => 'MODIFY',
                ],
                'create_ranks' => [
                    'name' => 'Create Ranks',
                    'description' => 'Allows creation of new faction ranks/roles.',
                    'type' => 'CREATE',
                ],
                'delete_ranks' => [
                    'name' => 'Delete Ranks',
                    'description' => 'Allows deletion of faction ranks/roles.',
                    'type' => 'DELETE',
                ],
                'modify_ranks' => [
                    'name' => 'Modify Ranks',
                    'description' => 'Allows editing of rank names and properties.',
                    'type' => 'MODIFY',
                ],
                'manage_invites' => [
                    'name' => 'Manage Invites',
                    'description' => 'Allows creating and deleting faction invite links.',
                    'type' => 'MODIFY',
                ],
            ],
        ],
    ],
];
