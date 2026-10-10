<?php

namespace App\Support;

use App\Models\Member;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;

/** Small helper for system-generated in-app notifications. */
class Notifier
{
    public static function staff(string $title, string $message, string $type = 'info', ?string $link = null): void
    {
        self::send(['recipient_type' => 'staff'], $title, $message, $type, $link);
    }

    public static function member(Member $member, string $title, string $message, string $type = 'info', ?string $link = null): void
    {
        self::send(['recipient_type' => 'member', 'recipient_id' => $member->id], $title, $message, $type, $link);
    }

    /** Everyone with a member login (Member Portal bell). */
    public static function members(string $title, string $message, string $type = 'info', ?string $link = null): void
    {
        self::send(['recipient_type' => 'members'], $title, $message, $type, $link);
    }

    /** Staff and members alike. */
    public static function everyone(string $title, string $message, string $type = 'info', ?string $link = null): void
    {
        self::send(['recipient_type' => 'all'], $title, $message, $type, $link);
    }

    /** Users holding one role, e.g. "Treasurer". */
    public static function role(string $role, string $title, string $message, string $type = 'info', ?string $link = null): void
    {
        self::send(['recipient_type' => 'role', 'recipient_id' => $role], $title, $message, $type, $link);
    }

    /** Only users holding $permission — for alerts that name people or carry sensitive detail. */
    public static function permission(string $permission, string $title, string $message, string $type = 'info', ?string $link = null): void
    {
        self::send(['recipient_type' => 'permission', 'recipient_id' => $permission], $title, $message, $type, $link);
    }

    private static function send(array $target, string $title, string $message, string $type, ?string $link): void
    {
        // 'urgent' is not a NotificationType, so urgent alerts (suspicious sign-ins,
        // urgent pastoral cases and announcements) used to fail silently. Map it to
        // the most prominent real type; anything else unknown becomes 'info'.
        $type = \App\Enums\NotificationType::tryFrom($type)?->value
            ?? ($type === 'urgent' ? \App\Enums\NotificationType::Error->value : \App\Enums\NotificationType::Info->value);

        try {
            Notification::create([
                ...$target,
                'title' => $title,
                'message' => $message,
                'notification_type' => $type,
                'is_sent' => true,
                'sent_at' => now(),
                'created_by' => 'System',
                'link_url' => $link,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Could not create notification', ['error' => $e->getMessage()]);
        }
    }
}
