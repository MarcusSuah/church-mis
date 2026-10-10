<?php

namespace App\Http\Controllers\System;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Notifications page: everyone sees the notifications addressed to them;
 * staff with notifications.create can send, edit and delete notifications.
 */
class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $canManage = $user->can('notifications.create');

        $items = Notification::query()
            ->visibleTo($user)
            ->withReadState($user)
            ->latest('sent_at')->latest()
            ->limit(300)
            ->get()
            ->map(fn (Notification $n) => $this->present($n));

        return Inertia::render('notifications/index', [
            'notifications' => $items,
            'types' => array_map(fn ($c) => $c->value, NotificationType::cases()),
            'recipients' => [
                ['value' => 'all', 'label' => 'Everyone'],
                ['value' => 'staff', 'label' => 'All Staff'],
                ['value' => 'members', 'label' => 'All Members'],
                ...Role::orderBy('name')->pluck('name')->map(fn ($r) => ['value' => "role:{$r}", 'label' => $r])->all(),
            ],
            'can' => ['manage' => $canManage],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Notification::create([...$this->validated($request), 'is_sent' => true, 'sent_at' => now(), 'created_by' => $request->user()->name]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Notification sent.']);

        return back();
    }

    public function update(Request $request, Notification $notification): RedirectResponse
    {
        $notification->update($this->validated($request));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Notification updated.']);

        return back();
    }

    public function destroy(Notification $notification): RedirectResponse
    {
        $notification->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Notification deleted.']);

        return back();
    }

    /** Toggle read/unread for the current user. */
    public function toggleRead(Request $request, Notification $notification): RedirectResponse
    {
        $user = $request->user();
        abort_unless(Notification::visibleTo($user)->whereKey($notification->id)->exists(), 404);

        $exists = DB::table('notification_reads')->where(['notification_id' => $notification->id, 'user_id' => $user->id]);
        if ($exists->exists()) {
            $exists->delete();
        } else {
            DB::table('notification_reads')->insert(['notification_id' => $notification->id, 'user_id' => $user->id, 'read_at' => now()]);
        }

        return back();
    }

    /** Mark one as read (used when a notification is clicked) — never un-reads. */
    public function markRead(Request $request, Notification $notification): RedirectResponse
    {
        $user = $request->user();
        abort_unless(Notification::visibleTo($user)->whereKey($notification->id)->exists(), 404);
        DB::table('notification_reads')->insertOrIgnore(['notification_id' => $notification->id, 'user_id' => $user->id, 'read_at' => now()]);

        return back();
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $user = $request->user();
        $ids = Notification::visibleTo($user)->unreadBy($user)->pluck('id');
        DB::table('notification_reads')->insertOrIgnore(
            $ids->map(fn ($id) => ['notification_id' => $id, 'user_id' => $user->id, 'read_at' => now()])->all()
        );

        return back();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:2000'],
            'notification_type' => ['required', Rule::enum(NotificationType::class)],
            'recipient' => ['required', 'string', 'max:100'],
            'link_url' => ['nullable', 'string', 'max:500'],
        ]);

        [$type, $id] = str_contains($data['recipient'], ':') ? explode(':', $data['recipient'], 2) : [$data['recipient'], null];
        abort_unless(in_array($type, ['all', 'staff', 'members', 'role'], true), 422);
        if ($type === 'role') {
            abort_unless(Role::where('name', $id)->exists(), 422);
        }

        return [
            'title' => $data['title'],
            'message' => $data['message'],
            'notification_type' => $data['notification_type'],
            'recipient_type' => $type,
            'recipient_id' => $id,
            'link_url' => $data['link_url'] ?? null,
        ];
    }

    /** @return array<string, mixed> */
    public static function present(Notification $n): array
    {
        return [
            'id' => $n->id,
            'title' => $n->title,
            'message' => $n->message,
            'type' => $n->notification_type?->value ?? 'info',
            'recipient_type' => $n->recipient_type,
            'recipient' => $n->recipient_type === 'role' ? "role:{$n->recipient_id}" : $n->recipient_type,
            'recipient_label' => match ($n->recipient_type) {
                'all' => 'Everyone', 'staff' => 'Staff', 'members' => 'Members', 'member' => 'You',
                'role' => (string) $n->recipient_id, 'permission' => 'Staff with access', default => $n->recipient_type,
            },
            'link_url' => $n->link_url,
            'created_by' => $n->created_by ?: 'System',
            'sent_at' => ($n->sent_at ?? $n->created_at)?->toIso8601String(),
            'is_read' => (bool) ($n->is_read_by_me ?? false),
            // System alerts to one member or to a permission group are not editable.
            'editable' => in_array($n->recipient_type, ['all', 'staff', 'members', 'role'], true),
        ];
    }
}
