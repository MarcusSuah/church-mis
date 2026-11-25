<?php

namespace App\Support;

use App\Models\Member;
use App\Notifications\MemberRegistrationReceived;
use App\Notifications\MembershipApproved;
use Illuminate\Notifications\Notification as BaseNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Emails to members about their registration. Sent to the member record's
 * email address (a registrant has no login yet). A failed send is logged and
 * never stops the registration or approval from being saved.
 */
class MemberEmails
{
    public static function registrationReceived(Member $member, bool $choseSignInPassword = false): void
    {
        self::send($member, new MemberRegistrationReceived(
            (string) $member->first_name,
            (string) $member->reg_ref,
            $choseSignInPassword,
        ));
    }

    /** @param  MembershipApproved::SIGN_IN_*|null  $signIn */
    public static function approved(Member $member, ?string $signIn): void
    {
        self::send($member, new MembershipApproved((string) $member->first_name, $member->member_id, $signIn));
    }

    private static function send(Member $member, BaseNotification $notification): void
    {
        if (blank($member->email)) {
            return;
        }

        try {
            Notification::route('mail', [$member->email => $member->full_name])->notify($notification);
        } catch (\Throwable $e) {
            Log::warning('Member email could not be sent', [
                'member' => $member->id,
                'email_type' => class_basename($notification),
                'error' => $e->getMessage(),
            ]);
        }
    }
}
