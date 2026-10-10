<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Communion extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'service_date', 'service_name', 'officiant', 'location', 'attendance_count',
        'elements_used', 'scripture_reference', 'notes', 'banner_image',
    ];

    protected function casts(): array
    {
        return ['service_date' => 'date'];
    }

    public function participants(): HasMany
    {
        return $this->hasMany(CommunionParticipant::class);
    }
}
