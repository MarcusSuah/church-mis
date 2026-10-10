<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyMember extends Model
{
    use HasUuids;

    public const HEAD = 'Head of Household';

    public const ROLES = [self::HEAD, 'Spouse', 'Child', 'Dependent', 'Relative'];

    /** Display order inside a household. */
    public const ROLE_ORDER = [self::HEAD => 0, 'Spouse' => 1, 'Child' => 2, 'Dependent' => 3, 'Relative' => 4];

    protected $fillable = ['family_id', 'member_id', 'name', 'role', 'date_of_birth', 'phone', 'email'];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date:Y-m-d'];
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /** Linked member's details win over the free-text fields. */
    public function displayName(): string
    {
        return $this->member?->full_name ?: (string) $this->name;
    }
}
