<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunionParticipant extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = ['communion_id', 'member_id', 'member_name', 'member_photo', 'participated_at'];

    protected function casts(): array
    {
        return ['participated_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::created(fn (CommunionParticipant $r) => $r->communion?->increment('attendance_count'));
        static::deleted(function (CommunionParticipant $r) {
            if ($r->communion) {
                $r->communion()->decrement('attendance_count');
            }
        });
    }

    public function communion(): BelongsTo
    {
        return $this->belongsTo(Communion::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
