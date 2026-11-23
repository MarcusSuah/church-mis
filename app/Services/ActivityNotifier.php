<?php

namespace App\Services;

use App\Enums\NotificationType;
use App\Enums\Role;
use App\Models\Notification;
use App\Models\Permission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * Turns activity (a record created, edited, deleted ...) into in-app notifications
 * for the people who are allowed to act on that area.
 */
class ActivityNotifier
{
    /** @var array<string, bool> */
    private static array $permissionExists = [];

    /** Called by ActivityObserver for every tracked model. */
    public static function modelEvent(Model $model, string $action): void
    {
        $cfg = config('activity.models')[$model::class] ?? null;
        if (! $cfg || ! self::enabled()) {
            return;
        }

        $changed = [];
        if ($action === 'updated') {
            $ignore = [...config('activity.ignore_fields', []), ...($cfg['ignore'] ?? [])];
            $changed = array_values(array_diff(array_keys($model->getChanges()), $ignore));
            if ($changed === []) {
                return; // only counters / timestamps changed
            }
        }

        $label = $cfg['label'];
        $name = self::nameOf($model, $cfg);
        [$actor] = self::actor();

        $verb = match ($action) {
            'created' => 'added',
            'updated' => 'updated',
            'deleted' => 'deleted',
            'restored' => 'restored',
            default => $action,
        };

        $details = $cfg['details'] ?? [];
        if ($action === 'updated') {
            $parts = array_map(function (string $field) use ($model, $details) {
                $pretty = str_replace('_', ' ', $field);

                return in_array($field, $details, true)
                    ? "{$pretty}: ".self::show($model->getOriginal($field)).' → '.self::show($model->getAttribute($field))
                    : $pretty;
            }, $changed);
            $message = "{$actor} updated {$label} “{$name}”, changed: ".implode(', ', $parts).'.';
        } else {
            $extra = collect($details)
                ->map(fn ($f) => str_replace('_', ' ', $f).': '.self::show($model->getAttribute($f)))
                ->implode(', ');
            $message = "{$actor} {$verb} {$label} “{$name}”".($extra ? " ({$extra})" : '').'.';
        }

        self::dispatch(
            Str::ucfirst($label).' '.$verb,
            $message,
            $action === 'deleted' ? NotificationType::Warning : NotificationType::from($cfg['type'] ?? 'info'),
            $cfg['permission'] ?? null,
            $cfg['link'] ?? null,
        );
    }

    /**
     * For actions that are not a single model save (uploads, role changes, imports ...).
     * $what continues the sentence: "uploaded 3 photos to album “Easter”".
     */
    public static function custom(
        string $title,
        string $what,
        NotificationType $type = NotificationType::Info,
        ?string $permission = null,
        ?string $link = null,
    ): void {
        if (! self::enabled()) {
            return;
        }

        [$actor] = self::actor();
        self::dispatch($title, "{$actor} {$what}.", $type, $permission, $link);
    }

    private static function dispatch(string $title, string $message, NotificationType $type, ?string $permission, ?string $link): void
    {
        try {
            [, $actorId, $createdBy] = self::actor();
            [$recipientType, $recipientId] = self::recipient($permission);

            Notification::create([
                'title' => Str::limit($title, 190, ''),
                'message' => Str::limit($message, 1000),
                'notification_type' => $type,
                'recipient_type' => $recipientType,
                'recipient_id' => $recipientId,
                'link_url' => $link,
                'is_sent' => true,
                'sent_at' => now(),
                'created_by' => $createdBy,
                'actor_id' => $actorId,
            ]);
        } catch (\Throwable $e) {
            // An alert must never break the action it describes.
            report($e);
        }
    }

    private static function enabled(): bool
    {
        return (bool) config('activity.enabled')
            && (! app()->runningInConsole() || config('activity.in_console'));
    }

    /** @return array{0: string, 1: int|null, 2: string} display name, user id, created_by */
    private static function actor(): array
    {
        $user = Auth::user();

        if (! $user) {
            return app()->runningInConsole()
                ? ['The system', null, 'System']
                : ['A website visitor', null, 'Website visitor'];
        }

        $role = $user->getRoleNames()->first();

        return [$role ? "{$user->name} ({$role})" : $user->name, $user->id, $user->name];
    }

    /** @return array{0: string, 1: string} */
    private static function recipient(?string $permission): array
    {
        if ($permission) {
            self::$permissionExists[$permission] ??= Permission::where('name', $permission)->exists();
            if (self::$permissionExists[$permission]) {
                return ['permission', $permission];
            }
        }

        // Unknown permission: make sure somebody still sees it.
        return ['role', Role::SUPERADMIN->value];
    }

    private static function nameOf(Model $model, array $cfg): string
    {
        $name = collect($cfg['name'] ?? [])
            ->map(fn ($attr) => $model->getAttribute($attr))
            ->filter()
            ->implode(' ');

        return $name !== '' ? Str::limit($name, 80) : '#'.$model->getKey();
    }

    private static function show(mixed $value): string
    {
        return match (true) {
            $value === null || $value === '' => '—',
            is_bool($value) => $value ? 'yes' : 'no',
            is_array($value) => Str::limit(json_encode($value), 60),
            default => Str::limit((string) $value, 60),
        };
    }
}