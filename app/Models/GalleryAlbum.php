<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A photo album for the public gallery. May belong to a sermon, an event
 * and/or a department. Holds at most MAX_PHOTOS photos.
 */
class GalleryAlbum extends Model
{
    use HasSlug;

    public const MAX_PHOTOS = 10;

    protected $fillable = ['title', 'description', 'event_date', 'department_id', 'sermon_id', 'event_id', 'tags', 'is_published'];

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
            'tags' => 'array',
            'is_published' => 'boolean',
        ];
    }

    public function slugSource(): string
    {
        return trim((string) $this->title);
    }

    /** @return HasMany<GalleryPhoto, $this> */
    public function photos(): HasMany
    {
        return $this->hasMany(GalleryPhoto::class, 'album_id')->orderBy('sort_order')->orderBy('id');
    }

    /** @return BelongsTo<Department, $this> */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /** @return BelongsTo<Sermon, $this> */
    public function sermon(): BelongsTo
    {
        return $this->belongsTo(Sermon::class);
    }

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @param  Builder<self>  $query */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }
}
