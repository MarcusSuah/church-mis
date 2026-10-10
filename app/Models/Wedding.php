<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wedding extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        'certificate_template', 'certificate_message',
        'groom_name', 'bride_name', 'groom_member_id', 'bride_member_id', 'wedding_date', 'wedding_time',
        'location', 'officiant', 'witnesses', 'reception_venue', 'certificate_number', 'certificate_issued',
        'certificate_date', 'banner_image', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'wedding_date' => 'date',
            'certificate_issued' => 'boolean',
            'certificate_date' => 'date',
        ];
    }

    public function groom(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'groom_member_id');
    }

    public function bride(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'bride_member_id');
    }
}
