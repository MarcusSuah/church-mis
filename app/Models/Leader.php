<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Leader extends Model
{
    use HasSlug, HasUuids;

    protected $table = 'church_leadership';

    // public const ROLES = ['pastor', 'associate_pastor', 'deacon', 'deaconess', 'elder', 'trustee', 'minister', 'director', 'coordinator', 'other', ];

    protected $fillable = [
        'member_id', 'first_name', 'last_name', 'title', 'leadership_role', 'bio', 'photo_url', 'email',
        'phone', 'office_location', 'ordination_date', 'start_date', 'display_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'ordination_date' => 'date:Y-m-d',
            'start_date' => 'date:Y-m-d',
            'display_order' => 'integer',
            'is_active' => 'boolean',
        ];
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
