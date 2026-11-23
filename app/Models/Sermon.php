<?php

namespace App\Models;

use App\Enums\ServiceSession;
use App\Enums\ServiceType;
use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sermon extends Model
{
    use HasFactory, HasSlug, HasUuids;

    protected $fillable = [
        'title',
        'speaker_name',
        'speaker_photo',
        'series_name',
        'scripture_reference',
        'description',
        'sermon_date',
        'service_type',
        'service_session',
        'audio_url',
        'video_url',
        'notes_url',
        'thumbnail_url',
        'duration_minutes',
        'tags',
        'is_published',
        'view_count',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'service_type' => ServiceType::class,
            'service_session' => ServiceSession::class,
            'sermon_date' => 'date:Y-m-d',
            'tags' => 'array',
            'is_published' => 'boolean',
            'duration_minutes' => 'integer',
            'view_count' => 'integer',
        ];
    }

    public function getServiceLabelAttribute(): string
    {
        $type = $this->service_type;

        if ($type === null) {
            return 'Service';
        }

        if ($type !== ServiceType::SundayWorship) {
            return $type->label();
        }

        return match ($this->service_session) {
            ServiceSession::FirstService => 'Sunday Worship — 1st Service',
            ServiceSession::SecondService => 'Sunday Worship — 2nd Service',
            default => 'Sunday Worship',
        };
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function slugSource(): string
    {
        return trim((string) $this->title);
    }

    public function galleryAlbums(): HasMany
    {
        return $this->hasMany(GalleryAlbum::class);
    }
}
