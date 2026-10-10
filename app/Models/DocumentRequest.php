<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentRequest extends Model
{
    use HasUuids;

    public const TYPES = [
        'Membership Certificate', 'Baptism Certificate', 'Church Recommendation Letter', 'Annual Giving Statement',
        'Transfer Letter', 'Good Standing Letter', 'Pastoral Reference Letter',
    ];

    protected $fillable = [
        'template', 'custom_message', 'member_id', 'document_type', 'notes', 'status', 'file_path', 'staff_note'];

    protected $hidden = ['file_path'];

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
