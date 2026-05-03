<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuditMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only audit if user is authenticated
        if (Auth::check()) {
            if ($request->isMethod('GET')) {
                $this->auditVisit($request);
            } else {
                $this->auditAction($request);
            }
        }

        return $response;
    }

    protected function auditAction(Request $request): void
    {
        $route = $request->route();
        $factionParam = $route?->parameter('faction') ?? $route?->parameter('shortname');
        $factionId = null;
        
        if ($factionParam) {
            $factionId = $factionParam instanceof \App\Models\Faction ? $factionParam->id : $factionParam;
            if (!is_numeric($factionId)) {
                $factionId = \App\Models\Faction::where('shortname', $factionId)->first()?->id;
            }
        }

        // Avoid logging the audit log itself
        if ($request->is('api/factions/*/audit-logs*')) {
            return;
        }

        AuditLog::create([
            'faction_id' => $factionId,
            'user_id' => Auth::id(),
            'event' => strtolower($request->method()) . '_request',
            'url' => $request->fullUrl(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'method' => $request->method(),
            'new_values' => $request->except(['password', 'password_confirmation']),
        ]);
    }

    protected function auditVisit(Request $request): void
    {
        $route = $request->route();
        $routeName = $route?->getName();
        
        // Define routes that should be audited for "visits"
        $auditableRoutes = [
            'factions.rosters.index',
            'factions.rosters.show',
            'factions.records.index',
            'factions.records.show',
            'factions.records.entries.index',
            'factions.records.entries.show',
        ];

        if (in_array($routeName, $auditableRoutes)) {
            $factionParam = $route->parameter('faction') ?? $route->parameter('shortname');
            $factionId = $factionParam instanceof \App\Models\Faction ? $factionParam->id : $factionParam;
            
            if (!is_numeric($factionId)) {
                $factionId = \App\Models\Faction::where('shortname', $factionId)->first()?->id;
            }

            // Avoid duplicate visit logs in a short period (e.g., 5 minutes)
            $exists = AuditLog::where('user_id', Auth::id())
                ->where('event', 'visited')
                ->where('url', $request->fullUrl())
                ->where('created_at', '>=', now()->subMinutes(5))
                ->exists();

            if (!$exists) {
                AuditLog::create([
                    'faction_id' => $factionId,
                    'user_id' => Auth::id(),
                    'event' => 'visited',
                    'url' => $request->fullUrl(),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'method' => $request->method(),
                ]);
            }
        }
    }
}
