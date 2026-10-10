<?php

namespace App\Models;

use App\Enums\DeptActivityType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepartmentActivity extends Model
{
    use HasUuids;

    const UPDATED_AT = null;
public const TYPES = ['meeting', 'event', 'training', 'outreach', 'fundraising', 'retreat', 'workshop', 'service', 'volunteer', 'other'];
    protected $fillable = [
        'department_id', 'title', 'description', 'activity_type', 'activity_date',
        'location', 'attendees_count', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'activity_type' => DeptActivityType::class,
            'activity_date' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
