<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A message sent from the public website's contact form. Every reply from
 * the church office is kept in contact_message_replies (the whole
 * conversation, for the record); response / responded_* hold the latest one.
 * Deleting only hides a message from the inbox (soft delete).
 */
class ContactMessage extends Model
{
    use SoftDeletes;

    public const STATUSES = ['new', 'read', 'replied', 'closed'];

    /** Visitors fill only these fields; status and replies are set by staff actions. */
    protected $fillable = ['name', 'email', 'phone', 'subject', 'message', 'ip_address'];

    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
        ];
    }

    /** Every reply sent, oldest first. @return HasMany<ContactMessageReply, $this> */
    public function replies(): HasMany
    {
        return $this->hasMany(ContactMessageReply::class)->oldest()->orderBy('id');
    }

    /** @return BelongsTo<User, $this> */
    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }

    /** @param  Builder<self>  $query */
    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereIn('status', ['new', 'read']);
    }
}
