<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    use HasFactory, HasSlug, HasUuids;

    protected $fillable = [
        'title', 'description', 'event_type', 'start_date', 'end_date', 'location', 'address',
        'banner_url', 'organizer_name', 'organizer_id', 'max_attendees', 'registered_count',
        'is_public', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'datetime',
            'end_date' => 'datetime',
            'is_public' => 'boolean',
        ];
    }

    /** Events that haven't started yet (or are running today), soonest first. */
    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('start_date', '>=', now()->startOfDay())
            ->whereNotIn('status', ['Cancelled', 'Completed'])
            ->orderBy('start_date');
    }

    /** Slug source: see HasSlug. */
    public function slugSource(): string
    {
        return trim((string) $this->title);
    }

    /** Photo albums for this event (shown in the gallery and on its page). */
    public function galleryAlbums(): HasMany
    {
        return $this->hasMany(GalleryAlbum::class);
    }
}
