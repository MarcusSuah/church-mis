<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
class MinistryMember extends Model
{
    use HasUuids;
    public $timestamps = false;


    protected $fillable = ['ministry_id', 'member_id', 'role', 'joined_at'];

    protected function casts(): array
    {
        return ['joined_at' => 'datetime'];
    }

    // Note: ministry.member_count is kept in sync by a MySQL trigger
    // (see database/migrations/..._create_pivot_member_count_triggers.php).

    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
