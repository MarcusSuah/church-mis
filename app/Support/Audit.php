<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;

/**
 * Writes an audit-log row for changes that fire no model events, such as
 * syncing a role's permissions or a user's roles (Phase 4, F08).
 * Rows appear on the Audit Logs page under the "Access Control" module.
 */
class Audit
{
    public const ACCESS_CONTROL = 'Access Control';

    public static function record(string $action, string $table, string $description, ?array $old = null, ?array $new = null, string $module = self::ACCESS_CONTROL): void
    {
        try {
            $user = auth()->user();
            $request = request();

            AuditLog::create([
                'action' => $action,
                'table_name' => $table,
                'record_id' => null,
                'old_values' => $old,
                'new_values' => $new,
                'performed_by' => $user?->email ?? 'system',
                'performed_by_name' => $user?->name ?? 'System',
                'performed_by_role' => $user?->getRoleNames()->first() ?? 'system',
                'ip_address' => $request?->ip(),
                'user_agent' => $request ? mb_substr((string) $request->userAgent(), 0, 255) : null,
                'module' => $module,
                'description' => mb_substr($description, 0, 500),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Audit log failed', ['error' => $e->getMessage()]);
        }
    }
}
