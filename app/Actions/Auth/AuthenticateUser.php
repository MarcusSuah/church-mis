<?php

namespace App\Actions\Auth;

use App\Models\BlockedIp;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * The sign-in rules, shared by the web login (Fortify) and the API login
 * (Phase 4), so both apply exactly the same checks:
 *
 *  - blocked IP addresses cannot sign in;
 *  - wrong email or password returns null (the caller shows one generic
 *    message, so nobody can tell which emails have accounts);
 *  - rejected sign-ups and blocked or deactivated accounts are refused;
 *  - member-only logins whose member record is suspended, inactive or
 *    rejected are refused (error key "account").
 */
class AuthenticateUser
{
    /** A bcrypt hash of a random string, checked when the email is unknown so both paths take the same time. */
    private const DUMMY_HASH = '$2y$12$VK.nvy4PsiCvSILXMUjpvOvXIqcz2iu2OdatePkh8cC6jYYO4nX9O';

    public function __invoke(Request $request, string $email, string $password): ?User
    {
        if (BlockedIp::isBlocked($request->ip())) {
            throw ValidationException::withMessages(['email' => 'Access from your network has been blocked. Please contact the church office.']);
        }

        $user = User::where('email', $email)->first();
        if (! $user) {
            Hash::check($password, self::DUMMY_HASH);

            return null;
        }
        if (! Hash::check($password, (string) $user->password)) {
            return null;
        }

        // Rejected sign-ups can't sign in (Phase 2, F02). Pending ones can,
        // but only reach the member portal until staff link and approve them.
        if ($user->isRejected()) {
            ActivityLogger::log($request, 'login_failed', 'Rejected account tried to sign in', $user, ['email' => $user->email]);
            throw ValidationException::withMessages(['email' => 'This account was not approved. Please contact the church office.']);
        }
        if ($user->blocked_at || ! $user->is_active) {
            ActivityLogger::log($request, 'login_failed', 'Blocked account tried to sign in', $user, ['email' => $user->email]);
            throw ValidationException::withMessages(['email' => 'Your account has been blocked. Please contact the church office.']);
        }
        // A member-only login follows its member record: suspended, inactive
        // and rejected members can't sign in. Shown as a notice on the sign-in page.
        if ($lockout = $user->memberLockoutMessage()) {
            ActivityLogger::log($request, 'login_failed', 'Member account not active tried to sign in', $user, ['email' => $user->email, 'member_status' => $user->member?->status]);
            throw ValidationException::withMessages(['account' => $lockout]);
        }

        return $user;
    }
}
