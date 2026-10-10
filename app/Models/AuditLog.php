<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasUuids, HasFactory;

    const UPDATED_AT = null;

    protected $fillable = [
        'performed_by_name',
        'action', 'table_name', 'record_id', 'old_values', 'new_values', 'performed_by',
        'performed_by_role', 'ip_address', 'user_agent', 'module', 'description',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
