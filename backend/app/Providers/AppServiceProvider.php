<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Routing\Events\RouteMatched;
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
        User::clearPermissionsCache();

        $this->app['events']->listen(RouteMatched::class, function () {
            User::clearPermissionsCache();
        });

        Gate::define('viewPulse', function ($user = null) {
            return $user && $user->is_superadmin;
        });
    }
}
