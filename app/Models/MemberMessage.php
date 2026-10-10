<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberMessage extends Model
{
    protected $fillable = ['member_id', 'member_name', 'occasion', 'subject', 'message', 'channels', 'email_status', 'sent_by'];

    protected function casts(): array
    {
        return ['channels' => 'array'];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
