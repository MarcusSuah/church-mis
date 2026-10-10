<?php

namespace App\Models;

use App\Enums\AttendanceStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    use HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'session_id',
        'member_id',
        'attendance_status',
        'present',
        'service_name',
        'service_date',
        'service_time',
        'check_in_time',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'attendance_status' => AttendanceStatus::class,
            'present' => 'boolean',
            'check_in_time' => 'datetime',
            'service_date' => 'date',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::created(fn (AttendanceRecord $r) => $r->session?->recalculateTotals());
        static::updated(fn (AttendanceRecord $r) => $r->session?->recalculateTotals());
        static::deleted(fn (AttendanceRecord $r) => $r->session?->recalculateTotals());
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'session_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}