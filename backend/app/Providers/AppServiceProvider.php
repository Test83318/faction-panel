<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        if (class_exists(TelescopeApplicationServiceProvider::class)) {
            $this->app->register(TelescopeServiceProvider::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \App\Models\User::clearPermissionsCache();

        $this->app['events']->listen(\Illuminate\Routing\Events\RouteMatched::class, function () {
            \App\Models\User::clearPermissionsCache();
        });

        Gate::define('viewPulse', function ($user = null) {
            return $user && $user->is_superadmin;
        });
    }
}
