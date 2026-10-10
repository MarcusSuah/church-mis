<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class BoardMember extends Model
{
    use HasUuids;
    public $timestamps = false;

    protected $fillable = ['board_id', 'member_id', 'role', 'term_start', 'term_end', 'joined_at'];

    protected function casts(): array
    {
        return [
            'term_start' => 'date',
            'term_end' => 'date',
            'joined_at' => 'datetime',
        ];
    }

    // Note: board.member_count is kept in sync by a MySQL trigger
    // (see database/migrations/..._create_pivot_member_count_triggers.php).

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
    
}
