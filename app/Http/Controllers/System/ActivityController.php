<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Models\BlockedIp;
use App\Models\User;
use App\Models\UserActivity;
use App\Services\ActivityLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Activity Log & access control: what users do, from which devices and
 * locations; block / unblock accounts and IP addresses; sign users out.
 */
class ActivityController extends Controller
{
    public const EVENTS = ['login', 'logout', 'login_failed', 'password_changed', 'page_view', 'create', 'update', 'delete', 'blocked'];

    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'event', 'device', 'user', 'suspicious', 'from', 'to']);

        $activities = $this->query($filters)->latest('created_at')->latest('id')
            ->paginate(25)->withQueryString()
            ->through(fn (UserActivity $a) => $this->presentActivity($a));

        $since = now()->subDay();
        $threshold = (int) config('church.suspicious_failed_logins', 5);

        return Inertia::render('activity-logs/index', [
            'activities' => $activities,
            'filters' => $filters,
            'tab' => $request->string('tab')->toString() ?: 'activity',
            'stats' => [
                'today' => UserActivity::where('created_at', '>=', now()->startOfDay())->count(),
                'active_users' => UserActivity::where('created_at', '>=', $since)->whereNotNull('user_id')->distinct('user_id')->count('user_id'),
                'failed_logins' => UserActivity::where('event', 'login_failed')->where('created_at', '>=', $since)->count(),
                'blocked' => User::whereNotNull('blocked_at')->count() + BlockedIp::active()->count(),
            ],
            'users' => $this->users(),
            'blockedIps' => BlockedIp::with('blocker:id,name')->latest()->get()->map(fn (BlockedIp $b) => [
                'id' => $b->id,
                'ip_address' => $b->ip_address,
                'reason' => $b->reason,
                'blocked_by' => $b->blocker?->name,
                'expires_at' => $b->expires_at?->toIso8601String(),
                'active' => ! $b->expires_at || $b->expires_at->isFuture(),
                'created_at' => $b->created_at?->toIso8601String(),
            ]),
            // IPs with repeated failed sign-ins in the last 24h.
            'suspicious' => UserActivity::where('event', 'login_failed')->where('created_at', '>=', $since)
                ->select('ip_address', DB::raw('count(*) as failures'), DB::raw('max(created_at) as last_attempt'),
                    DB::raw('count(distinct email) as emails'), DB::raw('max(country) as country'), DB::raw('max(city) as city'))
                ->groupBy('ip_address')->having('failures', '>=', $threshold)->orderByDesc('failures')->limit(50)->get()
                ->map(fn ($r) => [...$r->toArray(), 'blocked' => BlockedIp::isBlocked($r->ip_address)]),
            'events' => self::EVENTS,
            'can' => ['manage' => $request->user()->can('activity.manage')],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $rows = $this->query($request->only(['search', 'event', 'device', 'user', 'suspicious', 'from', 'to']))->latest('created_at')->limit(10000)->cursor();

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            \App\Support\Csv::put($out, ['Date', 'User', 'Email', 'Event', 'Description', 'IP', 'Device', 'Browser', 'Platform', 'Country', 'Region', 'City', 'Suspicious']);
            foreach ($rows as $a) {
                \App\Support\Csv::put($out, [$a->created_at, $a->user_name, $a->email, $a->event, $a->description, $a->ip_address, $a->device, $a->browser, $a->platform, $a->country, $a->region, $a->city, $a->is_suspicious ? 'yes' : '']);
            }
            fclose($out);
        }, 'activity-log-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    public function blockUser(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            throw \Illuminate\Validation\ValidationException::withMessages(['reason' => 'You cannot block your own account.']);
        }
        // F03: only someone who outranks the account may block it (Admins can't block Admins or the Superadmin).
        \Illuminate\Support\Facades\Gate::authorize('manageAccess', $user);

        $data = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);
        $user->forceFill(['blocked_at' => now(), 'blocked_reason' => $data['reason'] ?? null])->save();
        $this->endSessions($user);
        ActivityLogger::log($request, 'blocked', "Blocked user {$user->email}".(! empty($data['reason']) ? ": {$data['reason']}" : ''));

        \Inertia\Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} has been blocked and signed out."]);

        return back();
    }

    public function unblockUser(Request $request, User $user): RedirectResponse
    {
        \Illuminate\Support\Facades\Gate::authorize('manageAccess', $user);

        $user->forceFill(['blocked_at' => null, 'blocked_reason' => null, 'is_active' => true])->save();
        ActivityLogger::log($request, 'blocked', "Unblocked user {$user->email}");
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} can sign in again."]);

        return back();
    }

    /** Sign the user out on every device (database sessions). */
    public function signOut(Request $request, User $user): RedirectResponse
    {
        \Illuminate\Support\Facades\Gate::authorize('manageAccess', $user);

        $n = $this->endSessions($user);
        ActivityLogger::log($request, 'logout', "Signed {$user->email} out of all devices");
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$user->name} was signed out of {$n} session(s)."]);

        return back();
    }

    public function blockIp(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ip_address' => ['required', 'ip'],
            'reason' => ['nullable', 'string', 'max:500'],
            'hours' => ['nullable', 'integer', Rule::in([1, 24, 168, 720])],
        ]);
        if ($data['ip_address'] === $request->ip()) {
            throw \Illuminate\Validation\ValidationException::withMessages(['ip_address' => 'This is your own IP address — blocking it would lock you out.']);
        }

        BlockedIp::updateOrCreate(['ip_address' => $data['ip_address']], [
            'reason' => $data['reason'] ?? null,
            'blocked_by' => $request->user()->id,
            'expires_at' => ! empty($data['hours']) ? now()->addHours((int) $data['hours']) : null,
        ]);
        ActivityLogger::log($request, 'blocked', "Blocked IP {$data['ip_address']}");
        Inertia::flash('toast', ['type' => 'success', 'message' => "IP {$data['ip_address']} blocked."]);

        return back();
    }

    public function unblockIp(Request $request, BlockedIp $blockedIp): RedirectResponse
    {
        $blockedIp->delete();
        ActivityLogger::log($request, 'blocked', "Unblocked IP {$blockedIp->ip_address}");
        Inertia::flash('toast', ['type' => 'success', 'message' => "IP {$blockedIp->ip_address} unblocked."]);

        return back();
    }

    /* ------------------------------------------------------------------ */

    private function query(array $f)
    {
        return UserActivity::query()
            ->when($f['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('user_name', 'like', "%{$s}%")
                ->orWhere('email', 'like', "%{$s}%")->orWhere('ip_address', 'like', "%{$s}%")
                ->orWhere('description', 'like', "%{$s}%")->orWhere('city', 'like', "%{$s}%")->orWhere('country', 'like', "%{$s}%")))
            ->when($f['event'] ?? null, fn ($q, $e) => $q->where('event', $e))
            ->when($f['device'] ?? null, fn ($q, $d) => $q->where('device', $d))
            ->when($f['user'] ?? null, fn ($q, $u) => $q->where('user_id', $u))
            ->when(($f['suspicious'] ?? null) === '1', fn ($q) => $q->where('is_suspicious', true))
            ->when($f['from'] ?? null, fn ($q, $d) => $q->where('created_at', '>=', $d))
            ->when($f['to'] ?? null, fn ($q, $d) => $q->where('created_at', '<=', $d.' 23:59:59'));
    }

    private function presentActivity(UserActivity $a): array
    {
        return [
            ...$a->only(['id', 'user_id', 'user_name', 'email', 'event', 'description', 'method', 'url', 'ip_address', 'device', 'browser', 'platform', 'country', 'region', 'city', 'is_suspicious', 'user_agent']),
            'created_at' => $a->created_at?->toIso8601String(),
        ];
    }

    private function users()
    {
        $sessions = config('session.driver') === 'database'
            ? DB::table(config('session.table', 'sessions'))->whereNotNull('user_id')
                ->where('last_activity', '>=', now()->subMinutes((int) config('session.lifetime', 120))->timestamp)
                ->select('user_id', DB::raw('count(*) as n'), DB::raw('max(last_activity) as last'))->groupBy('user_id')->get()->keyBy('user_id')
            : collect();

        $lastLogins = UserActivity::where('event', 'login')
            ->whereIn('id', UserActivity::selectRaw('max(id)')->where('event', 'login')->where('created_at', '>=', now()->subDays(90))->groupBy('user_id'))
            ->get()->keyBy('user_id');

        $failed = UserActivity::where('event', 'login_failed')->where('created_at', '>=', now()->subDays(7))
            ->select('email', DB::raw('count(*) as n'))->groupBy('email')->pluck('n', 'email');

        // Staff accounts plus anyone online or active in the last 30 days, at most 500 (F07):
        // this used to load every login, including every member.
        $recent = UserActivity::where('created_at', '>=', now()->subDays(30))->whereNotNull('user_id')->distinct()->limit(2000)->pluck('user_id');

        return User::with('roles:id,name')
            ->where(fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('name', '!=', \App\Enums\Role::MEMBER->value))
                ->orWhereIn('id', $sessions->keys())->orWhereIn('id', $recent)->orWhereNotNull('blocked_at'))
            ->orderBy('name')->limit(500)->get()->map(function (User $u) use ($sessions, $lastLogins, $failed) {
            $last = $lastLogins->get($u->id);

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->roles->pluck('name')->first(),
                'avatar' => $u->avatar_url,
                'blocked' => (bool) $u->blocked_at,
                'blocked_reason' => $u->blocked_reason,
                'last_login_at' => $u->last_login_at ? \Illuminate\Support\Carbon::parse($u->last_login_at)->toIso8601String() : null,
                'last_ip' => $u->last_login_ip,
                'device' => $last ? trim("{$last->device} · {$last->browser} on {$last->platform}") : null,
                'location' => $last ? collect([$last->city, $last->region, $last->country])->filter()->implode(', ') : null,
                'online' => $sessions->has($u->id),
                'sessions' => (int) ($sessions->get($u->id)->n ?? 0),
                'failed_logins_7d' => (int) ($failed[$u->email] ?? 0),
                'must_change_password' => (bool) $u->must_change_credentials,
            ];
        });
    }

    private function endSessions(User $user): int
    {
        if (config('session.driver') !== 'database') {
            return 0;
        }
        $user->forceFill(['remember_token' => null])->saveQuietly();

        return DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
    }
}
