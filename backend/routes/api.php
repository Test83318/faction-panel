<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FactionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\InviteController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/auth/registration-status', [AuthController::class, 'registrationStatus']);

Route::get('/invites/{code}', [InviteController::class, 'show']);
Route::get('/factions/all', [FactionController::class, 'getAllFactions']);
Route::get('/permissions/config', [RoleController::class, 'getGlobalConfig']);

// Public/Guest Faction Access
Route::get('/factions/{shortname}', [FactionController::class, 'show']);
Route::get('/factions/{shortname}/permissions', [FactionController::class, 'getPermissions']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::post('/invites/{code}/join', [InviteController::class, 'join']);

    // Invite Management
    Route::get('/factions/{shortname}/invites', [InviteController::class, 'index']);
    Route::post('/factions/{shortname}/invites', [InviteController::class, 'store']);
    Route::delete('/invites/{id}', [InviteController::class, 'destroy']);

    // Faction routes (Authenticated)
    Route::get('/factions', [FactionController::class, 'index']);
    Route::post('/factions', [FactionController::class, 'store']);
    Route::put('/factions/{faction}', [FactionController::class, 'update']);
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
});
