<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sermon extends Model
{
    use HasFactory, HasSlug, HasUuids;

    public const SERVICE_TYPES = [
        'Sunday Worship' => 'Sunday Worship',
        'Bible Study' => 'Bible Study',
        'Prayer Meeting' => 'Prayer Meeting',
        'Special Service' => 'Special Service',
        'Youth Service' => 'Youth Service',
    ];

    protected $fillable = [
        'title',
        'speaker_name',
        'speaker_photo',
        'series_name',
        'scripture_reference',
        'description',
        'sermon_date',
        'service_type',
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
            'sermon_date' => 'date:Y-m-d',
            'tags' => 'array',
            'is_published' => 'boolean',
            'duration_minutes' => 'integer',
            'view_count' => 'integer',
            'created_by' => 'integer', // Add this if using BIGINT
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Slug source: see HasSlug. */
    public function slugSource(): string
    {
        return trim((string) $this->title);
    }
}
