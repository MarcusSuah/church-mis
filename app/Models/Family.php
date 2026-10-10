<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Family extends Model
{
    use HasUuids;

    public const STATUSES = ['Active', 'Inactive'];

    protected $fillable = ['family_name', 'address', 'city', 'state', 'country', 'phone', 'email', 'status', 'notes'];

    public function members(): HasMany
    {
        return $this->hasMany(FamilyMember::class);
    }

    public function head(): HasOne
    {
        return $this->hasOne(FamilyMember::class)->where('role', FamilyMember::HEAD);
    }
}
