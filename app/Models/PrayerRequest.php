<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PrayerRequest extends Model
{
    use HasUuids;

    public const CATEGORIES = [
        'General', 'Health & Healing', 'Financial', 'Marriage & Family', 'Spiritual Growth',
        'Church & Ministry', 'Youth', 'Bereavement', 'Employment',
    ];

    public const STATUSES = ['Active', 'Answered', 'Closed'];

    protected $fillable = [
        'requester_member_id', 'requester_name', 'subject', 'category', 'request_details', 'is_private', 'is_anonymous', 'is_urgent',
        'status', 'prayer_count', 'assigned_to', 'assigned_pastor_id', 'response', 'notes', 'resolved_at', 'created_by',
    ];

    /** Internal notes never leave the staff screens. */
    protected $hidden = ['notes'];

    protected function casts(): array
    {
        return [
            'is_private' => 'boolean',
            'is_anonymous' => 'boolean',
            'is_urgent' => 'boolean',
            'prayer_count' => 'integer',
            'resolved_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (PrayerRequest $pr) {
            if ($pr->isDirty('status')) {
                $pr->resolved_at = $pr->status === 'Answered' ? ($pr->resolved_at ?? now()) : null;
            }
        });
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'requester_member_id');
    }

    /** Name to show, respecting anonymity. */
    public function displayName(): string
    {
        if ($this->is_anonymous) {
            return 'Anonymous';
        }

        return $this->requester_name ?: ($this->member?->full_name ?? 'Anonymous');
    }

    /** Portal requests have no subject — fall back to the start of the request. */
    public function displaySubject(): string
    {
        return $this->subject ?: Str::limit((string) $this->request_details, 60);
    }
}