<?php

use App\Http\Controllers\SuperadminAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/admin/login', [SuperadminAuthController::class, 'showLoginForm'])->name('admin.login');
Route::post('/admin/login', [SuperadminAuthController::class, 'login']);
Route::post('/admin/logout', [SuperadminAuthController::class, 'logout'])->name('logout');
