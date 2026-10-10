<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contribution extends Model
{
    use HasUuids;

    protected $fillable = ['member_id', 'contributed_on', 'type', 'fund', 'method', 'amount', 'receipt_no'];

    protected function casts(): array
    {
        return ['contributed_on' => 'date:Y-m-d', 'amount' => 'decimal:2'];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
