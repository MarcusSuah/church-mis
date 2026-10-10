<?php

namespace App\Models;

use App\Enums\LeadershipRole;
use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChurchLeadership extends Model
{
    use HasFactory, HasSlug, HasUuids;

    protected $table = 'church_leadership';

    protected $fillable = [
        'member_id', 'first_name', 'last_name', 'title', 'leadership_role', 'bio', 'photo_url',
        'email', 'phone', 'office_location', 'ordination_date', 'start_date', 'display_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'leadership_role' => LeadershipRole::class,
            'ordination_date' => 'date',
            'start_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /** Slug source: see HasSlug. */
    public function slugSource(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
