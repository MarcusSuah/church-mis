<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * "We received your membership registration" email, sent when someone
 * registers (public form or member portal). Sent to the member's email
 * address directly, since a public registrant has no login yet.
 */
class MemberRegistrationReceived extends Notification
{
    use Queueable;

    public function __construct(
        public string $firstName,
        public string $reference,
        public bool $choseSignInPassword,
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
            ->subject("We received your {$church} membership registration")
            ->greeting("Hello {$this->firstName},")
            ->line("Thank you for registering with {$church}. We have received your membership application.")
            ->line("Your reference number is **{$this->reference}**. Please keep it for any enquiries.")
            ->line('Our church office will review your application within 3–5 days, and we will email you as soon as it is approved.');

        if ($this->choseSignInPassword) {
            $message->line('Once approved, you can sign in to the member portal with this email address and the password you chose.');
        }

        return $message->line('If you did not register, please contact the church office.');
    }
}
