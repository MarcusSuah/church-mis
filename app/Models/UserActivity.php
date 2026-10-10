<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserActivity extends Model
{
    use MassPrunable;

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id', 'user_name', 'email', 'event', 'description', 'method', 'url', 'route_name',
        'ip_address', 'user_agent', 'device', 'browser', 'platform', 'country', 'region', 'city', 'is_suspicious',
    ];

    protected function casts(): array
    {
        return ['is_suspicious' => 'boolean', 'created_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Keep 180 days (php artisan model:prune — scheduled daily). */
    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subDays((int) config('church.activity_retention_days', 180)));
    }
}
