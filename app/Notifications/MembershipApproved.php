<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * "Your membership is approved" email, sent when staff approve a
 * registration. How to sign in depends on the member's login:
 *
 *  - SIGN_IN_READY: they already know their password (chosen at
 *    registration, or an existing portal account);
 *  - SIGN_IN_SETUP: a login was just made for them and a separate
 *    "set your password" email is on its way;
 *  - null: no login could be made (the church office will help).
 */
class MembershipApproved extends Notification
{
    use Queueable;

    public const SIGN_IN_READY = 'ready';

    public const SIGN_IN_SETUP = 'setup';

    public function __construct(
        public string $firstName,
        public ?string $memberId,
        public ?string $signIn,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $church = (string) config('church.name', config('app.name'));

        $message = (new MailMessage)
            ->subject("Your {$church} membership is approved")
            ->greeting("Welcome to the church family, {$this->firstName}!")
            ->line("Your membership with {$church} has been approved.");

        if ($this->memberId) {
            $message->line("Your Member ID is **{$this->memberId}**.");
        }

        if ($this->signIn === self::SIGN_IN_READY) {
            $message->line('You can now sign in to the member portal with your email address and password.')
                ->action('Sign in', route('login'));
        } elseif ($this->signIn === self::SIGN_IN_SETUP) {
            $message->line('We have sent you a separate email with a link to set your password for the member portal.')
                ->line('If that link has expired, use "Forgot password" on the sign-in page with this email address.');
        } else {
            $message->line('Please contact the church office if you would like access to the member portal.');
        }

        return $message->line('We look forward to worshipping with you.');
    }
}
