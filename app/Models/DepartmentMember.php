<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepartmentMember extends Model
{
    public $timestamps = false;

    protected $fillable = ['department_id', 'member_id', 'role', 'joined_at'];

    protected function casts(): array
    {
        return ['joined_at' => 'datetime'];
    }

    // Note: department.member_count is kept in sync by a MySQL trigger
    // (see database/migrations/..._create_pivot_member_count_triggers.php)
    // so it stays correct whether rows are written via create(), attach(),
    // detach(), or sync(). No model event is needed here.

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
