<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommitteeMember extends Model
{
    public $timestamps = false;

    protected $fillable = ['committee_id', 'member_id', 'role', 'joined_at'];

    protected function casts(): array
    {
        return ['joined_at' => 'datetime'];
    }

    // Note: committee.member_count is kept in sync by a MySQL trigger
    // (see database/migrations/..._create_pivot_member_count_triggers.php).

    public function committee(): BelongsTo
    {
        return $this->belongsTo(Committee::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    
}
