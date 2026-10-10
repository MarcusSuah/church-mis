<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** The church office's reply to a website contact message. */
class ContactReplyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ContactMessage $contactMessage, public string $reply, public string $staffName) {}

    public function envelope(): Envelope
    {
        $church = config('church');

        return new Envelope(
            subject: 'Re: '.$this->contactMessage->subject,
            replyTo: ! empty($church['email']) ? [new Address($church['email'], $church['name'] ?? null)] : [],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.contact-reply', with: ['church' => config('church')]);
    }
}
