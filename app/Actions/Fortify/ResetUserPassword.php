<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    use PasswordValidationRules;

    /**
     * Validate and reset the user's forgotten password.
     *
     * @param  array<string, string>  $input
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => $this->passwordRules(),
        ])->validate();

        $user->forceFill([
            'password' => $input['password'],
            // Following an emailed reset/invite link proves the person controls this mailbox.
            'email_verified_at' => $user->email_verified_at ?? now(),
            'must_change_credentials' => false,
        ])->save();

        // F09: a reset means the old password may be known to someone else,
        // so every existing session and API token is ended.
        \App\Support\UserSessions::endAll($user);
    }
}
