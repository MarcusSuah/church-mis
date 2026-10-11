<?php

namespace App\Support;

use App\Enums\Role as RoleEnum;
use App\Models\User;
use Illuminate\Contracts\Auth\Access\Authorizable;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\TransientToken;

/**
 * One place that decides every permission check (Phase 4).
 *
 * Order matters, so all three steps live in one Gate::before callback
 * (config('permission.register_permission_check_method') is false):
 *
 *  1. API token ceiling. A request made with a personal access token can
 *     only use the permissions written on that token, even for the
 *     Superadmin. Cookie (SPA) sessions and normal web pages are not
 *     limited, because they carry no token.
 *  2. Superadmin passes every check (with a token: every permission the
 *     token lists; policy questions still go to the policy).
 *  3. Spatie permission check (role and direct permissions).
 *
 * Returning null means "no decision here", so policies still run for
 * ability names that are not permissions (view, update, delete…). Policies
 * call $user->can('<permission>') themselves, which comes back through
 * step 1, so a token's ceiling also applies inside policies.
 */
class Authorization
{
    public static function register(): void
    {
        Gate::before(function (Authorizable $user, string $ability, array &$args = []) {
            if (self::isPermissionName($ability) && ! self::tokenAllows($user, $ability)) {
                return false;
            }

            if ($user instanceof User && $user->hasRole(RoleEnum::SUPERADMIN->value)) {
                // With a limited token, policy abilities (update, delete…) go to the
                // policy, whose permission checks then meet the token's ceiling.
                return self::isPermissionName($ability) || ! self::hasToken($user) ? true : null;
            }

            // Same as Spatie's own gate hook: an optional guard name as the first argument.
            if (is_string($args[0] ?? null) && ! class_exists($args[0])) {
                $guard = array_shift($args);
            }
            if (method_exists($user, 'checkPermissionTo')) {
                return $user->checkPermissionTo($ability, $guard ?? null) ?: null;
            }

            return null;
        });
    }

    /** Permission names are "module.action" (members.view); policy abilities have no dot. */
    public static function isPermissionName(string $ability): bool
    {
        return str_contains($ability, '.');
    }

    /** True when this request was authenticated with a personal access token. */
    public static function hasToken(Authorizable $user): bool
    {
        if (! method_exists($user, 'currentAccessToken')) {
            return false;
        }
        $token = $user->currentAccessToken();

        return $token && ! $token instanceof TransientToken;
    }

    /** True when the request is not token-based, or the token lists this ability. */
    public static function tokenAllows(Authorizable $user, string $ability): bool
    {
        if (! method_exists($user, 'currentAccessToken')) {
            return true;
        }

        $token = $user->currentAccessToken();
        if (! $token || $token instanceof TransientToken) {
            return true;
        }

        return $token->can($ability);
    }
}
