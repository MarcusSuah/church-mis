<?php

namespace App\Models;

use App\Contracts\HasGroupMembers;
use App\Enums\MinistryCategory;
use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ministry extends Model implements HasGroupMembers
{
    use HasFactory, HasSlug, HasUuids;

    public const CATEGORIES = ['worship', 'outreach', 'education', 'care', 'youth', 'men', 'women', 'seniors', 'missions', 'pastoral', 'finance', 'missions', 'prayer', 'deacon', 'leadership', 'other'];

    public const ROLES = ['Member', 'Leader', 'Co-Leader', 'Secretary', 'Coordinator', 'Treasurer', 'Event Organizer', 'Volunteer', 'Mentor', 'Advisor', 'Trainer', 'Support Staff', 'Committee Member', 'Board Member', 'Chairperson', 'Vice Chairperson', 'Team Leader', 'Assistant Leader'];

    protected $fillable = [
        'name', 'description', 'category', 'leader_id', 'leader_name', 'leader_photo',
        'member_count', 'meeting_schedule', 'location', 'contact_email', 'contact_phone',
        'banner_url', 'vision', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'category' => MinistryCategory::class,
            'is_active' => 'boolean',
        ];
    }

    public function leader(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'leader_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Member::class, 'ministry_members')
            ->withPivot('role', 'joined_at');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(MinistryMember::class, 'ministry_id');
    }

    /** Slug source: see HasSlug. */
    public function slugSource(): string
    {
        return trim((string) $this->name);
    }
}
