<?php

namespace App\Models;

use App\Enums\AttendanceStatus;
use App\Enums\ServiceType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    use HasUuids;

    const UPDATED_AT = null;

    /** @var array<string, string> */
    public const TYPES = [
        'sunday_worship' => 'Sunday Worship',
        'bible_study' => 'Bible Study',
        'prayer_meeting' => 'Prayer Meeting',
        'revival' => 'Revival',
    ];

    protected $fillable = [
        'service_type',
        'service_date',
        'title',
        'sermon_topic',
        'preacher',
        'total_present',
        'total_absent',
        'total_late',
        'total_excused',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'service_type' => ServiceType::class,
            'service_date' => 'date',
            'created_at' => 'datetime',
            'session_date' => 'date:Y-m-d',
        ];
    }

    public function typeLabel(): string
    {
        $type = $this->service_type;

        if ($type instanceof ServiceType) {
            return $type->label();
        }

        return ServiceType::tryFrom((string) $type)?->label() ?? (string) $type;
    }

    public function records(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'session_id');
    }

    public function recalculateTotals(): void
    {
        $this->update([
            'total_present' => $this->records()
                ->where('attendance_status', AttendanceStatus::Present->value)
                ->count(),
            'total_absent' => $this->records()
                ->where('attendance_status', AttendanceStatus::Absent->value)
                ->count(),
            'total_late' => $this->records()
                ->where('attendance_status', AttendanceStatus::Late->value)
                ->count(),
            'total_excused' => $this->records()
                ->where('attendance_status', AttendanceStatus::Excused->value)
                ->count(),
        ]);
    }
}