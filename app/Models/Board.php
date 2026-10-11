<?php

namespace App\Models;

use App\Contracts\HasGroupMembers;
use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Board extends Model implements HasGroupMembers
{
    use HasFactory, HasSlug, HasUuids;

    public const TYPES = ['Trustees', 'Deacons', 'Deaconesses', 'Elders', 'Advisory', 'Pastoral', 'Finance', 'Other'];

    public const ROLES = ['Member', 'Chairperson', 'Vice-Chairperson', 'Secretary', 'Treasurer', 'Trustee'];

    protected $fillable = [
        'name', 'description', 'board_type', 'chairperson_id', 'chairperson_name', 'chairperson_photo',
        'member_count', 'meeting_schedule', 'location', 'contact_email', 'mandate', 'banner_url', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function chairperson(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'chairperson_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Member::class, 'board_members')
            ->withPivot('role', 'term_start', 'term_end', 'joined_at');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(BoardMember::class);
    }

    /** Slug source: see HasSlug. */
    public function slugSource(): string
    {
        return trim((string) $this->name);
    }
}
