<?php

namespace App\Actions\Auth;

use App\Enums\Role as RoleEnum;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Creates a personal access token (Phase 4).
 *
 *  - Abilities are permission names and can only be ones the user has now.
 *    No "*" token is ever issued. With no list, the token gets the user's
 *    current permissions. Either way, a permission later removed from the
 *    user's role stops working at once, because every check also asks the
 *    role (App\Support\Authorization).
 *  - A token created by another token can't have more abilities than it.
 *  - Every token expires (default 30 days, never beyond
 *    config('sanctum.expiration')).
 *  - At most config('church.api_max_tokens') per user; the oldest go first.
 *  - Only a SHA-256 hash is stored. The plain token is returned once.
 */
class IssueApiToken
{
    /** @param  list<string>|null  $abilities */
    public function __invoke(User $user, string $name, ?array $abilities = null, ?int $days = null): NewAccessToken
    {
        if (! config('church.api_tokens_enabled', true)) {
            throw ValidationException::withMessages(['device_name' => 'API tokens are switched off for this church.']);
        }

        $held = $user->hasRole(RoleEnum::SUPERADMIN->value)
            ? Permission::where('guard_name', 'web')->pluck('name')->all()
            : $user->getAllPermissions()->pluck('name')->all();

        $current = $user->currentAccessToken();
        if ($current instanceof PersonalAccessToken) {
            $held = array_values(array_filter($held, fn (string $p) => $current->can($p)));
        }

        $granted = $abilities === null ? $held : array_values(array_intersect(array_unique($abilities), $held));
        if ($abilities !== null && count($granted) !== count(array_unique($abilities))) {
            throw ValidationException::withMessages(['abilities' => 'A token can only have permissions that you have yourself.']);
        }
        sort($granted);

        $maxDays = max(1, intdiv((int) config('sanctum.expiration', 43200), 1440));
        $days = min(max(1, $days ?? (int) config('church.api_token_days', 30)), $maxDays);

        $this->pruneOldest($user);

        return $user->createToken(Str::limit(trim($name), 100, ''), $granted, now()->addDays($days));
    }

    /** Keep room for one more token under the per-user limit. */
    private function pruneOldest(User $user): void
    {
        $max = max(1, (int) config('church.api_max_tokens', 10));
        $ids = $user->tokens()->orderByDesc('created_at')->orderByDesc('id')->pluck('id');
        if ($ids->count() >= $max) {
            $user->tokens()->whereIn('id', $ids->slice($max - 1)->all())->delete();
        }
    }
}
