<?php

namespace App\Actions\Auth;

use App\Models\User;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

/**
 * Two-factor check for the API login (Phase 4). Same rules as Fortify's
 * web challenge: a code from the authenticator app, or a one-time
 * recovery code (which is used up).
 */
class VerifyTwoFactor
{
    public function required(User $user): bool
    {
        return Features::enabled(Features::twoFactorAuthentication())
            && filled($user->two_factor_secret)
            && filled($user->two_factor_confirmed_at);
    }

    public function passes(User $user, ?string $code, ?string $recoveryCode): bool
    {
        if (filled($code)) {
            return (bool) app(TwoFactorAuthenticationProvider::class)->verify(
                Fortify::currentEncrypter()->decrypt($user->two_factor_secret),
                (string) $code,
            );
        }

        if (filled($recoveryCode)) {
            $match = collect($user->recoveryCodes())->first(fn ($c) => hash_equals($c, (string) $recoveryCode));
            if ($match) {
                $user->replaceRecoveryCode($match);

                return true;
            }
        }

        return false;
    }
}
