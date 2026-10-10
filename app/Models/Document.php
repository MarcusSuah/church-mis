<?php

namespace App\Models;

use App\Enums\DocumentCategory;
use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory, HasSlug, HasUuids;

    protected $fillable = [
        'title', 'description', 'category', 'file_url', 'file_name', 'file_size_kb', 'file_type',
        'thumbnail_url', 'version', 'author_name', 'department', 'is_public', 'is_archived',
        'tags', 'download_count',
    ];

    protected function casts(): array
    {
        return [
            'category' => DocumentCategory::class,
            'is_public' => 'boolean',
            'is_archived' => 'boolean',
            'tags' => 'array',
        ];
    }

    /** Slug source: see HasSlug. */
    public function slugSource(): string
    {
        return trim((string) $this->title);
    }
}
