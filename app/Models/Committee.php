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

class Committee extends Model implements HasGroupMembers
{
    use HasFactory, HasSlug, HasUuids;

    public const TYPES = ['Standing', 'Ad Hoc', 'Special', 'Advisory', 'Task Force'];

    public const ROLES = ['Member', 'Chairperson', 'Vice-Chairperson', 'Secretary', 'Coordinator', 'Advisor'];

    protected $fillable = [
        'name', 'description', 'committee_type', 'chairperson_id', 'chairperson_name', 'chairperson_photo',
        'member_count', 'meeting_schedule', 'location', 'contact_email', 'objectives', 'banner_url', 'is_active',
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
        return $this->belongsToMany(Member::class, 'committee_members')
            ->withPivot('role', 'joined_at');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(CommitteeMember::class, 'committee_id');
    }

    /** Slug source: see HasSlug. */
    public function slugSource(): string
    {
        return trim((string) $this->name);
    }
}
