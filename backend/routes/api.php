<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FactionController;
use App\Http\Controllers\RoleController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Faction routes
    Route::get('/factions', [FactionController::class, 'index']);
    Route::get('/factions/all', [FactionController::class, 'getAllFactions']); // For joining
    Route::post('/factions', [FactionController::class, 'store']);
    Route::get('/factions/{shortname}', [FactionController::class, 'show']);
    Route::put('/factions/{faction}', [FactionController::class, 'update']);
    Route::delete('/factions/{faction}', [FactionController::class, 'destroy']);
    Route::post('/factions/join', [FactionController::class, 'join']);
    Route::post('/factions/{faction}/leave', [FactionController::class, 'leave']);

    // Role & Permission Management
    Route::get('/permissions/config', [RoleController::class, 'getGlobalConfig']);
    Route::get('/factions/{shortname}/roles', [RoleController::class, 'index']);
    Route::post('/factions/{shortname}/roles', [RoleController::class, 'store']);
    Route::put('/roles/{role}', [RoleController::class, 'update']);
    Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
    Route::put('/roles/{role}/permissions', [RoleController::class, 'updatePermissions']);
});
