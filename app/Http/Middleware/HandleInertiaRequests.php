<?php

namespace App\Http\Middleware;

use App\Enums\Role as RoleEnum;
use App\Http\Controllers\System\NotificationController;
use App\Models\ContactMessage;
use App\Models\DocumentRequest;
use App\Models\Member;
use App\Models\Notification;
use App\Models\Permission;
use App\Models\PrayerRequest;
use App\Support\Birthdays;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),

            'name' => config('app.name'),

            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar_url,
                    'roles' => $user->getRoleNames(),
                    // Super admin bypasses every check on the server (Gate::before),
                    // so give the UI the full list too — otherwise newly added
                    // permissions hide menu items from the super admin.
                    'permissions' => $user->hasRole(RoleEnum::SUPERADMIN->value)
                        ? Permission::pluck('name')
                        : $user->getAllPermissions()->pluck('name'),
                    'is_member_only' => $user->isMemberOnly(),
                    'must_change_password' => (bool) $user->must_change_credentials,
                ] : null,
            ],

            // Sidebar badge on Certificates: document requests waiting for approval.
            'pendingDocumentCount' => fn () => $user?->can('certificates.view')
                ? DocumentRequest::where('status', 'Pending')->count()
                : null,

            'church' => [
                'name' => config('church.name'),
                'short_name' => config('church.short_name'),
                'currency' => Money::base(),
                'secondary_currency' => Money::other(),
                'exchange_rate' => Money::rate(),
                'address' => config('church.address'),
                'email' => config('church.email'),
                'phone' => config('church.phone'),
                'logo_url' => config('church.logo_url'),
            ],

            // Topbar bell: latest notifications for this user + unread count.
            'notificationSummary' => fn () => $user ? [
                'unread' => Notification::visibleTo($user)->unreadBy($user)->count(),
                'items' => Notification::visibleTo($user)->withReadState($user)
                    ->latest('sent_at')->latest()->limit(8)->get()
                    ->map(fn (Notification $n) => NotificationController::present($n)),
            ] : null,

            // Real count for the sidebar badge (was hard-coded to 5).
            'pendingMembersCount' => fn () => $user?->can('members.view')
                ? Member::awaitingReview()->count()
                : null,

            // Sidebar badge on Prayer Requests (was hard-coded to 12).
            // Sidebar badge on Birthdays.
            'birthdaysTodayCount' => fn () => $user?->can('birthdays.view')
                ? Cache::remember('birthdays-today:'.now()->toDateString(), 600, fn () => Birthdays::upcoming(0)->count())
                : null,
            // Sidebar badge on Messages: website contact messages nobody has opened yet.
            'newMessagesCount' => fn () => $user?->can('messages.view')
                ? ContactMessage::where('status', 'new')->count()
                : null,
            'activePrayerCount' => fn () => $user?->can('prayer-requests.view')
                ? PrayerRequest::where('status', 'Active')->count()
                : null,

            'sidebarOpen' => ! $request->hasCookie('sidebar_state')
                || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
