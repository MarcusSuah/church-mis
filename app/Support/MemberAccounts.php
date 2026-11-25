<?php

namespace App\Support;

use App\Enums\Role as RoleEnum;
use App\Enums\UserStatus;
use App\Models\Member;
use App\Models\Role;
use App\Models\User;
use App\Notifications\MemberAccountInvitation;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Member logins.
 *
 * An approved member with an email address gets a login.
 *
 *  - Members who chose a password on the public registration form sign in
 *    with it as soon as staff approve them (no email needed).
 *  - Otherwise (e.g. members added by staff) the login is created with a long
 *    random password that nobody knows, and the member is emailed a one-time
 *    "set your password" link (Laravel's password-reset token, which expires
 *    after config('auth.passwords.users.expire') minutes). If the link
 *    expires, the member uses "Forgot password" on the sign-in page.
 *
 * Security rules (Phase 2 — F01, F05):
 *  - No shared/default password, ever.
 *  - Self-registrations (public form) get no login until staff approve them.
 *  - A member record is only ever linked to an existing login that is
 *    member-only (no staff role) and not deleted. Staff accounts are never
 *    linked automatically.
 */
class MemberAccounts
{
    /** Create (or safely link) the login for an approved member. */
    public static function ensureFor(Member $member, bool $sendInvite = true): ?User
    {
        if ($member->user_id) {
            return $member->user;
        }

        if (blank($member->email) || ! in_array($member->status, Member::ACCEPTED, true)) {
            return null;
        }

        try {
            $existing = User::withTrashed()->where('email', $member->email)->first();

            if ($existing) {
                if (! self::canLinkTo($existing)) {
                    Log::notice('Member not linked to an existing login: that login is a staff account, deleted, or already linked.', [
                        'member' => $member->id,
                        'user' => $existing->id,
                    ]);

                    return null;
                }

                // The existing login keeps its own password.
                $member->forceFill(['user_id' => $existing->id, 'pending_password' => null])->saveQuietly();
                self::ensureMemberRole($existing);

                return $existing;
            }

            $chosenPassword = $member->pending_password;

            $user = (new User)->forceFill([
                'name' => trim("{$member->first_name} {$member->last_name}"),
                'email' => $member->email,
                'phone' => $member->phone,
                // The (already hashed) password the member chose when registering. Without one,
                // a random password nobody knows: the member sets theirs through the invite link.
                'password' => $chosenPassword ?? Str::password(48),
                // Staff reviewed and approved this registration (a trusted admin action,
                // recorded by the User audit trail), so a member who chose a password can
                // sign in straight away without waiting for a verification email.
                'email_verified_at' => $chosenPassword ? now() : null,
                'status' => UserStatus::APPROVED,
                'is_active' => true,
                'must_change_credentials' => false,
            ]);
            $user->save();
            self::ensureMemberRole($user);

            // Link without firing model events again, and drop the copy of the password.
            $member->forceFill(['user_id' => $user->id, 'pending_password' => null])->saveQuietly();

            if ($sendInvite && ! $chosenPassword) {
                self::invite($user);
            }

            return $user;
        } catch (\Throwable $e) {
            // Never block saving a member because the login couldn't be made.
            Log::warning('Could not create a login for member', ['member' => $member->id, 'error' => $e->getMessage()]);

            return null;
        }
    }

    /** Email a one-time "set your password" link. Returns false when it could not be sent. */
    public static function invite(User $user): bool
    {
        try {
            $token = Password::broker()->createToken($user);
            $user->notify(new MemberAccountInvitation($token));

            return true;
        } catch (\Throwable $e) {
            Log::warning('Could not send member login invitation', ['user' => $user->id, 'error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * A member record may only be attached to a login that is not deleted,
     * holds no staff role, and is not already linked to another member.
     */
    public static function canLinkTo(User $user): bool
    {
        if ($user->trashed()) {
            return false;
        }

        $roles = $user->getRoleNames();
        if ($roles->isNotEmpty() && ! ($roles->count() === 1 && $roles->first() === RoleEnum::MEMBER->value)) {
            return false;
        }

        return ! Member::where('user_id', $user->id)->exists();
    }

    private static function ensureMemberRole(User $user): void
    {
        if (! $user->hasAnyRole(RoleEnum::values())
            && Role::where('name', RoleEnum::MEMBER->value)->where('guard_name', 'web')->exists()) {
            $user->assignRole(RoleEnum::MEMBER->value);
        }
    }
}
