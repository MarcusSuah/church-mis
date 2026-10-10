<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Baptism extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'certificate_template', 'certificate_message',
        'member_id', 'candidate_name', 'candidate_photo', 'baptism_date', 'baptism_type', 'officiant',
        'location', 'witnesses', 'certificate_number', 'certificate_issued', 'certificate_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'baptism_date' => 'date',
            'certificate_issued' => 'boolean',
            'certificate_date' => 'date',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
