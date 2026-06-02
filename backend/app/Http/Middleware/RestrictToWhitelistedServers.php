<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

class RestrictToWhitelistedServers
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Check if protection is enabled
        if (!config('api_protection.enabled', false)) {
            return $next($request);
        }

        // Allow preflight OPTIONS requests
        if ($request->isMethod('OPTIONS')) {
            return $next($request);
        }

        // 2. Ensure the authentication key matches
        $expectedKey = config('api_protection.auth_key');
        if ($expectedKey) {
            $providedKey = $request->header('X-API-Auth-Key');
            if (!$providedKey || $providedKey !== $expectedKey) {
                Log::warning('API Protection: Request rejected due to invalid API authentication key.');
                return response()->json([
                    'message' => 'Unauthorized: Invalid or missing API authentication key.'
                ], 401);
            }
        }

        // 3. Extract the domain where the call is coming from
        $origin = $request->header('Origin') ?: $request->header('Referer');
        if (!$origin) {
            Log::warning('API Protection: Request rejected due to missing Origin or Referer header.');
            return response()->json([
                'message' => 'Unauthorized: Request domain could not be verified (missing Origin/Referer).'
            ], 403);
        }

        // Parse host/domain from origin/referer
        $domain = parse_url($origin, PHP_URL_HOST);
        if (!$domain) {
            // Handle cases where Origin doesn't have scheme (e.g. "localhost:3000")
            $domain = preg_replace('/^https?:\/\//', '', $origin);
            $domain = explode(':', $domain)[0]; // Remove port if present
        }

        if (!$domain) {
            Log::warning('API Protection: Request rejected due to unparsable origin: ' . $origin);
            return response()->json([
                'message' => 'Unauthorized: Invalid request domain.'
            ], 403);
        }

        // Check if the domain is in the whitelisted domains
        $allowedDomains = config('api_protection.allowed_domains', []);
        
        $normalizedDomain = strtolower(trim($domain));
        $isDomainAllowed = false;
        
        foreach ($allowedDomains as $allowedDomain) {
            $allowedDomain = strtolower(trim($allowedDomain));
            // Exact match or subdomain match (e.g. api.example.com allowed if example.com is whitelisted)
            if ($normalizedDomain === $allowedDomain || 
                ($allowedDomain !== '' && str_ends_with($normalizedDomain, '.' . $allowedDomain))) {
                $isDomainAllowed = true;
                break;
            }
        }

        if (!$isDomainAllowed) {
            Log::warning('API Protection: Request domain "' . $domain . '" is not in whitelist.');
            return response()->json([
                'message' => 'Unauthorized: Domain ' . $domain . ' is not whitelisted.'
            ], 403);
        }

        // 4. Ensure the IP of the domain is whitelisted
        // Resolve the domain to its IP address
        $resolvedIp = gethostbyname($domain);
        if ($resolvedIp === $domain) {
            Log::warning('API Protection: Request rejected because domain "' . $domain . '" failed to resolve to an IP.');
            return response()->json([
                'message' => 'Unauthorized: Could not resolve IP for domain ' . $domain . '.'
            ], 403);
        }

        $allowedIps = config('api_protection.allowed_ips', []);
        $isResolvedIpAllowed = false;
        
        foreach ($allowedIps as $allowedIp) {
            $trimmedAllowedIp = trim($allowedIp);
            // Handle local IPv6 representations vs IPv4 if matching localhost
            if (($resolvedIp === '127.0.0.1' || $resolvedIp === '::1') && 
                ($trimmedAllowedIp === '127.0.0.1' || $trimmedAllowedIp === '::1')) {
                $isResolvedIpAllowed = true;
                break;
            }
            if ($resolvedIp === $trimmedAllowedIp) {
                $isResolvedIpAllowed = true;
                break;
            }
        }

        if (!$isResolvedIpAllowed) {
            Log::warning('API Protection: Resolved IP "' . $resolvedIp . '" for domain "' . $domain . '" is not in IP whitelist.');
            return response()->json([
                'message' => 'Unauthorized: The IP of the domain (' . $resolvedIp . ') is not whitelisted.'
            ], 403);
        }

        // 5. Optionally ensure the client IP matches the resolved IP of the domain (Strict check)
        if (config('api_protection.strict_ip_check', true)) {
            $clientIp = $request->ip();
            
            // Normalize IPv6 local loopback
            $normalizedClientIp = $clientIp === '::1' ? '127.0.0.1' : $clientIp;
            $normalizedResolvedIp = $resolvedIp === '::1' ? '127.0.0.1' : $resolvedIp;

            if ($normalizedClientIp !== $normalizedResolvedIp) {
                Log::warning('API Protection: Request rejected. Client IP (' . $normalizedClientIp . ') does not match resolved domain IP (' . $normalizedResolvedIp . ').');
                return response()->json([
                    'message' => 'Unauthorized: Client IP ' . $clientIp . ' does not match resolved domain IP ' . $resolvedIp . '.'
                ], 403);
            }
        }

        return $next($request);
    }
}
