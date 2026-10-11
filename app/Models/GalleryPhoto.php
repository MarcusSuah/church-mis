<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/** One photo in a gallery album, stored on the public disk. */
class GalleryPhoto extends Model
{
    protected $fillable = ['album_id', 'image_path', 'caption', 'sort_order'];

    protected $appends = ['url'];

    /** @return BelongsTo<GalleryAlbum, $this> */
    public function album(): BelongsTo
    {
        return $this->belongsTo(GalleryAlbum::class, 'album_id');
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->image_path);
    }

    protected static function booted(): void
    {
        // Remove the file when the photo record goes.
        static::deleted(fn (self $photo) => Storage::disk('public')->delete($photo->image_path));
    }
}
