<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory, HasSlug, HasUuids;

    protected $fillable = [
        'title', 'content', 'category', 'priority', 'author_name', 'banner_url',
        'start_date', 'end_date', 'is_pinned', 'is_published', 'target_audience', 'is_urgent', 'published_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_pinned' => 'boolean',
            'is_published' => 'boolean',
            'is_urgent' => 'boolean',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /** Published and inside its start/end window (dates are optional). */
    public function scopeActive(Builder $query): Builder
    {
        $today = now()->toDateString();

        return $query->where('is_published', true)
            ->where(fn (Builder $q) => $q->whereNull('start_date')->orWhere('start_date', '<=', $today))
            ->where(fn (Builder $q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $today));
    }

    /** "Urgent"/"High" priority announcements are highlighted in the portal. */
    public function isUrgent(): bool
    {
        return in_array(strtolower((string) $this->priority), ['urgent', 'high'], true);
    }

    /** Slug source: see HasSlug. */
    public function slugSource(): string
    {
        return trim((string) $this->title);
    }
}
