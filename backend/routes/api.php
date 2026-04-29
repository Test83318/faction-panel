<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FactionController;
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
});
