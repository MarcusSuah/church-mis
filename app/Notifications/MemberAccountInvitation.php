<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * "Your member portal is ready — set your password" email.
 *
 * Carries a one-time password-reset token, so the link works exactly like
 * "Forgot password" (Fortify's reset form) and expires on the same schedule.
 * Sent synchronously for now; Phase 6 moves all mail onto the queue.
 */
class MemberAccountInvitation extends Notification
{
    use Queueable;

    public function __construct(public string $token) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url(route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));

        $minutes = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);
        $church = (string) config('church.name', config('app.name'));

        return (new MailMessage)
            ->subject("Your {$church} member portal account")
            ->greeting("Hello {$notifiable->name},")
            ->line("An account has been created for you on the {$church} member portal.")
            ->line('Choose your own password to sign in. Nobody at the church knows it or can see it.')
            ->action('Set my password', $url)
            ->line("This link works once and expires in {$minutes} minutes. If it has expired, use \"Forgot password\" on the sign-in page with this email address.")
            ->line('If you did not expect this email, you can ignore it.');
    }
}
