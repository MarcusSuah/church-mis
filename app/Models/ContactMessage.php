<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A message sent from the public website's contact form, and the church
 * office's reply to it.
 */
class ContactMessage extends Model
{
    public const STATUSES = ['new', 'read', 'replied', 'closed'];

    /** Visitors fill only these fields; status and replies are set by staff actions. */
    protected $fillable = ['name', 'email', 'phone', 'subject', 'message', 'ip_address'];

    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
        ];
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
