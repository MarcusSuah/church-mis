<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PastoralCare extends Model
{
    use HasUuids, HasFactory;

    protected $table = 'pastoral_care';

    protected $fillable = [
        'member_name', 'member_id', 'care_type', 'description', 'assigned_pastor', 'assigned_pastor_id',
        'status', 'priority', 'visit_date', 'follow_up_date', 'location', 'notes', 'outcome', 'is_confidential',
    ];

    protected function casts(): array
    {
        return [
            'visit_date' => 'date',
            'follow_up_date' => 'date',
            'is_confidential' => 'boolean',
        ];
    }
}
