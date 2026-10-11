<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One reply from the church office to a website contact message. Replies
 * are a permanent record of the conversation: they are only ever created,
 * never edited or deleted from the app.
 */
class ContactMessageReply extends Model
{
    /** Set by ContactMessageController::reply, never from request input. */
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'email_sent' => 'boolean',
        ];
    }

    /** @return BelongsTo<ContactMessage, $this> */
    public function contactMessage(): BelongsTo
    {
        return $this->belongsTo(ContactMessage::class);
    }

    /** @return BelongsTo<User, $this> */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
