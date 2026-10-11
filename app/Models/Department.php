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

class Department extends Model implements HasGroupMembers
{
    use HasFactory, HasSlug, HasUuids;

    public const CATEGORIES = ['Praise & Worship', 'Administration', 'Ministry', 'Education', 'Communications', 'Service', 'Youth', 'Young Adults', 'Children', 'Community & Outreach', 'Choir', 'Evangelism', 'Hospitality', 'Media', 'Missions', 'Men', 'Women', 'Seniors', 'Prayer', 'Technical Support', 'Ushering', 'General', 'Other'];

    public const ROLES = ['Member', 'Leader', 'Co-Leader', 'Secretary', 'Treasurer', 'Coordinator', 'Assistant', 'Volunteer', 'Advisor', 'Mentor', 'Facilitator', 'Organizer', 'Chairperson', 'Vice Chairperson', 'Board Member', 'Committee Member', 'Team Lead', 'Subcommittee Lead', 'Project Manager', 'Event Coordinator'];

    protected $fillable = [
        'name', 'description', 'category', 'leader_id', 'leader_name', 'leader_photo',
        'member_count', 'meeting_schedule', 'location', 'contact_email', 'contact_phone',
        'banner_url', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function leader(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'leader_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Member::class, 'department_members')
            ->withPivot('role', 'joined_at');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(DepartmentActivity::class);
    }

    public function memberships()
    {
        return $this->hasMany(DepartmentMember::class, 'department_id');
    }

    /** Slug source: see HasSlug. */
    public function slugSource(): string
    {
        return trim((string) $this->name);
    }

    /** Photo albums for this department (shown in the gallery and on its page). */
    public function galleryAlbums(): HasMany
    {
        return $this->hasMany(GalleryAlbum::class);
    }
}
