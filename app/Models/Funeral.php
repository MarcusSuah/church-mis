<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Funeral extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'member_id', 'deceased_name', 'deceased_photo', 'date_of_death', 'funeral_date', 'funeral_time',
        'location', 'burial_location', 'officiant', 'eulogy_by', 'family_contact', 'family_phone',
        'banner_image', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_of_death' => 'date',
            'funeral_date' => 'date',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
