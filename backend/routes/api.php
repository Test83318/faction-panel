<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FactionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\InviteController;
use App\Http\Controllers\RosterController;
use App\Http\Controllers\RosterSectionController;
use App\Http\Controllers\RosterContentController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\RosterPermissionController;
use App\Http\Controllers\DatasetController;
use App\Http\Controllers\RosterFlagController;
use App\Http\Controllers\FactionRecordController;
use App\Http\Controllers\FactionRecordPermissionController;
use App\Http\Controllers\FactionRecordEntryController;
use App\Http\Controllers\SuperadminController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\HelpController;
use App\Http\Controllers\HelpAdminController;
use App\Http\Controllers\FactionSnapshotController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\SetupController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/setup/status', [SetupController::class, 'status']);
Route::post('/setup', [SetupController::class, 'setup']);

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/auth/registration-status', [AuthController::class, 'registrationStatus']);
Route::get('/auth/gtaw/redirect', [AuthController::class, 'gtawRedirect']);
Route::post('/auth/gtaw/callback', [AuthController::class, 'gtawCallback']);
Route::get('/site-settings/public', [SuperadminController::class, 'getPublicSettings']);
Route::get('/credits', [\App\Http\Controllers\CreditController::class, 'index']);

Route::get('/invites/{code}', [InviteController::class, 'show']);

Route::get('/factions/all', [FactionController::class, 'getAllFactions']);
Route::get('/permissions/config', [RoleController::class, 'getGlobalConfig']);

// Public/Guest Faction Access
Route::get('/factions/{shortname}', [FactionController::class, 'show']);
Route::get('/factions/{shortname}/permissions', [FactionController::class, 'getPermissions']);
Route::get('/factions/{shortname}/rosters', [RosterController::class, 'index']);
Route::get('/factions/{shortname}/datasets', [DatasetController::class, 'index']);
Route::get('/factions/{shortname}/flags', [RosterFlagController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/user/unlink-gtaw', [AuthController::class, 'unlinkGtaw']);
    Route::post('/user/change-password', [AuthController::class, 'changePassword']);
    Route::put('/user/settings', [AuthController::class, 'updateSettings']);
    // Superadmin Routes
    Route::get('/superadmin/users', [SuperadminController::class, 'getUsers']);
    Route::post('/superadmin/users', [SuperadminController::class, 'storeUser']);
    Route::put('/superadmin/users/{user}', [SuperadminController::class, 'updateUser']);
    Route::delete('/superadmin/users/{user}', [SuperadminController::class, 'deleteUser']);
    Route::get('/superadmin/factions', [SuperadminController::class, 'getFactions']);
    Route::put('/superadmin/factions/{faction}', [SuperadminController::class, 'updateFaction']);
    Route::delete('/superadmin/factions/{faction}', [SuperadminController::class, 'deleteFaction']);
    Route::post('/superadmin/impersonate/{user}', [SuperadminController::class, 'impersonate']);

    // Site Settings
    Route::get('/superadmin/settings', [SuperadminController::class, 'getSettings']);
    Route::put('/superadmin/settings', [SuperadminController::class, 'updateSettings']);

    // Membership Tier Routes
    Route::get('/superadmin/membership-tiers', [SuperadminController::class, 'getMembershipTiers']);
    Route::post('/superadmin/membership-tiers', [SuperadminController::class, 'storeMembershipTier']);
    Route::put('/superadmin/membership-tiers/{tier}', [SuperadminController::class, 'updateMembershipTier']);
    Route::delete('/superadmin/membership-tiers/{tier}', [SuperadminController::class, 'deleteMembershipTier']);

    // Credits Management Routes
    Route::post('/superadmin/credits', [\App\Http\Controllers\CreditController::class, 'store']);
    Route::put('/superadmin/credits/{credit}', [\App\Http\Controllers\CreditController::class, 'update']);
    Route::delete('/superadmin/credits/{credit}', [\App\Http\Controllers\CreditController::class, 'destroy']);
    Route::put('/superadmin/credits/reorder', [\App\Http\Controllers\CreditController::class, 'reorder']);

    Route::post('/invites/{code}/join', [InviteController::class, 'join']);

    // Invite Management
    Route::get('/factions/{shortname}/invites', [InviteController::class, 'index']);
    Route::post('/factions/{shortname}/invites', [InviteController::class, 'store']);
    Route::delete('/invites/{id}', [InviteController::class, 'destroy']);

    // Faction routes (Authenticated)
    Route::get('/factions', [FactionController::class, 'index']);
    Route::post('/factions', [FactionController::class, 'store']);
    Route::put('/factions/{faction}', [FactionController::class, 'update']);
    Route::post('/factions/{shortname}/upload-branding', [UploadController::class, 'uploadBranding']);

    Route::delete('/factions/{faction}', [FactionController::class, 'destroy']);
    Route::post('/factions/join', [FactionController::class, 'join']);
    Route::post('/factions/{faction}/leave', [FactionController::class, 'leave']);

    // User Management within Factions
    Route::get('/factions/{shortname}/users', [FactionController::class, 'getMembers']);
    Route::delete('/factions/{faction}/users/{user}', [FactionController::class, 'removeMember']);
    Route::put('/factions/{faction}/users/{user}/roles', [FactionController::class, 'updateMemberRoles']);

    // Role & Permission Management
    Route::get('/factions/{shortname}/roles', [RoleController::class, 'index']);
    Route::post('/factions/{shortname}/roles', [RoleController::class, 'store']);
    Route::put('/roles/{role}', [RoleController::class, 'update']);
    Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
    Route::put('/roles/{role}/permissions', [RoleController::class, 'updatePermissions']);

    // Roster Management
    Route::post('/factions/{shortname}/rosters', [RosterController::class, 'store']);
    Route::put('/rosters/{roster}', [RosterController::class, 'update']);
    Route::delete('/rosters/{roster}', [RosterController::class, 'destroy']);
    Route::put('/factions/{shortname}/rosters/reorder', [RosterController::class, 'reorder']);

    // Roster Section Management
    Route::post('/rosters/{roster}/sections', [RosterSectionController::class, 'store']);
    Route::put('/sections/{section}', [RosterSectionController::class, 'update']);
    Route::delete('/sections/{section}', [RosterSectionController::class, 'destroy']);
    Route::put('/rosters/{roster}/sections/reorder', [RosterSectionController::class, 'reorder']);

    // Roster Content Management
    Route::post('/sections/{section}/contents', [RosterContentController::class, 'store']);
    Route::put('/contents/{content}', [RosterContentController::class, 'update']);
    Route::post('/contents/{content}/lock', [RosterContentController::class, 'lock']);
    Route::post('/contents/{content}/unlock', [RosterContentController::class, 'unlock']);
    Route::delete('/contents/{content}', [RosterContentController::class, 'destroy']);
    Route::put('/sections/{section}/contents/reorder', [RosterContentController::class, 'reorder']);
    Route::put('/sections/{section}/contents/batch', [RosterContentController::class, 'batchUpdate']);

    // Group Management
    Route::get('/factions/{shortname}/groups', [GroupController::class, 'index']);
    Route::post('/factions/{shortname}/groups', [GroupController::class, 'store']);
    Route::put('/groups/{group}', [GroupController::class, 'update']);
    Route::delete('/groups/{group}', [GroupController::class, 'destroy']);
    Route::post('/groups/{group}/members', [GroupController::class, 'addMember']);
    Route::delete('/groups/{group}/members/{user}', [GroupController::class, 'removeMember']);
    Route::put('/groups/{group}/members/{user}/toggle-leader', [GroupController::class, 'toggleLeader']);

    // Roster Permission Management
    Route::get('/rosters/{roster}/permissions', [RosterPermissionController::class, 'index']);
    Route::put('/rosters/{roster}/permissions', [RosterPermissionController::class, 'update']);
    Route::delete('/rosters/{roster}/permissions/{permissionId}', [RosterPermissionController::class, 'destroy']);

    // Roster Dataset Management
    Route::post('/factions/{shortname}/datasets', [DatasetController::class, 'store']);
    Route::put('/datasets/{dataset}', [DatasetController::class, 'update']);
    Route::delete('/datasets/{dataset}', [DatasetController::class, 'destroy']);

    // Roster Flag Management
    Route::post('/factions/{shortname}/flags', [RosterFlagController::class, 'store']);
    Route::put('/flags/{flag}', [RosterFlagController::class, 'update']);
    Route::delete('/flags/{flag}', [RosterFlagController::class, 'destroy']);

    // Faction Record Management
    Route::get('/factions/{shortname}/records', [FactionRecordController::class, 'index']);
    Route::post('/factions/{shortname}/records', [FactionRecordController::class, 'store']);
    Route::get('/factions/{shortname}/records/{database}', [FactionRecordController::class, 'show']);
    Route::put('/factions/{shortname}/records/{database}', [FactionRecordController::class, 'update']);
    Route::delete('/factions/{shortname}/records/{database}', [FactionRecordController::class, 'destroy']);

    // Faction Record Permissions
    Route::get('/factions/{shortname}/records/{database}/permissions', [FactionRecordPermissionController::class, 'index']);
    Route::put('/factions/{shortname}/records/{database}/permissions', [FactionRecordPermissionController::class, 'update']);
    Route::delete('/factions/{shortname}/records/{database}/permissions/{permission}', [FactionRecordPermissionController::class, 'destroy']);

    // Faction Record Entries
    Route::get('/factions/{shortname}/records/{database}/entries', [FactionRecordEntryController::class, 'index']);
    Route::post('/factions/{shortname}/records/{database}/entries', [FactionRecordEntryController::class, 'store']);
    Route::get('/factions/{shortname}/records/{database}/entries/{entry}', [FactionRecordEntryController::class, 'show']);
    Route::put('/factions/{shortname}/records/{database}/entries/{entry}', [FactionRecordEntryController::class, 'update']);
    Route::delete('/factions/{shortname}/records/{database}/entries/{entry}', [FactionRecordEntryController::class, 'destroy']);

    // Audit Logs
    Route::get('/factions/{shortname}/audit-logs', [AuditLogController::class, 'index']);

    // Faction Snapshots
    Route::get('/factions/{shortname}/snapshots', [FactionSnapshotController::class, 'index']);
    Route::post('/factions/{shortname}/snapshots', [FactionSnapshotController::class, 'store']);
    Route::post('/factions/{shortname}/snapshots/upload', [FactionSnapshotController::class, 'upload']);
    Route::get('/snapshots/{snapshot}/download', [FactionSnapshotController::class, 'download']);
    Route::post('/snapshots/{snapshot}/restore', [FactionSnapshotController::class, 'restore']);
    Route::delete('/snapshots/{snapshot}', [FactionSnapshotController::class, 'destroy']);
    Route::get('/factions/{shortname}/audit-logs/{auditLog}', [AuditLogController::class, 'show']);

    // Quick Search
    Route::put('/factions/{shortname}/quick-search/settings', [\App\Http\Controllers\QuickSearchController::class, 'updateSettings']);
    Route::get('/factions/{shortname}/quick-search', [\App\Http\Controllers\QuickSearchController::class, 'search']);

    // GTA:W Integration
    Route::get('/factions/{shortname}/integrations/gtaw/available', [IntegrationController::class, 'getAvailableFactions']);
    Route::post('/factions/{shortname}/integrations/gtaw/setup', [IntegrationController::class, 'setupGtaw']);
    Route::post('/factions/{shortname}/integrations/gtaw/sync', [IntegrationController::class, 'syncGtaw']);
    Route::post('/factions/{shortname}/integrations/gtaw/prune', [IntegrationController::class, 'pruneGtaw']);

    // Help Center Public Routes
    Route::get('/help/categories', [HelpController::class, 'getCategories']);
    Route::get('/help/categories/{category}/articles', [HelpController::class, 'getCategoryArticles']);
    Route::get('/help/articles/search', [HelpController::class, 'search']);
    Route::get('/help/articles/{slug}', [HelpController::class, 'getArticle']);

    // Help Center Admin Routes
    Route::prefix('help/admin')->group(function () {
        Route::get('/categories', [HelpAdminController::class, 'getCategories']);
        Route::post('/categories', [HelpAdminController::class, 'storeCategory']);
        Route::put('/categories/{category}', [HelpAdminController::class, 'updateCategory']);
        Route::delete('/categories/{category}', [HelpAdminController::class, 'deleteCategory']);

        Route::get('/articles', [HelpAdminController::class, 'getArticles']);
        Route::post('/articles', [HelpAdminController::class, 'storeArticle']);
        Route::put('/articles/{article}', [HelpAdminController::class, 'updateArticle']);
        Route::delete('/articles/{article}', [HelpAdminController::class, 'deleteArticle']);
    });
});
