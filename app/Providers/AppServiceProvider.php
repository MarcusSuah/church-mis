<?php

namespace App\Providers;

use App\Models\Department;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserActivity;
use App\Observers\AuditObserver;
use App\Observers\NotifyObserver;
use App\Policies\DepartmentPolicy;
use App\Policies\MemberPolicy;
use App\Policies\MinistryPolicy;
use App\Policies\RolePolicy;
use App\Policies\UserPolicy;
use App\Services\ActivityLogger;
use App\Support\ApiRateLimits;
use App\Support\Authorization;
use App\Support\ChurchSettings;
use App\Support\Notifier;
use App\Support\SessionLimiter;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Events\PermissionAttachedEvent;
use Spatie\Permission\Events\PermissionDetachedEvent;
use Spatie\Permission\Events\RoleAttachedEvent;
use Spatie\Permission\Events\RoleDetachedEvent;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureDefaults();

        // Church profile + currency settings saved by the admin override config('church.*').
        ChurchSettings::apply();

        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Member::class, MemberPolicy::class);
        Gate::policy(Role::class, RolePolicy::class);
        Gate::policy(Department::class, DepartmentPolicy::class);
        Gate::policy(Ministry::class, MinistryPolicy::class);

        // Phase 4: one Gate::before for API token abilities, the Superadmin
        // bypass and Spatie permissions, in that order (see the class).
        Authorization::register();

        ApiRateLimits::register();

        // Audit trail for church records.
        foreach (array_keys(AuditObserver::MODULES) as $model) {
            if (class_exists($model)) {
                $model::observe(AuditObserver::class);
            }
        }

        // In-app notifications for every module.
        foreach (NotifyObserver::MODELS as $model) {
            $model::observe(NotifyObserver::class);
        }

        $this->trackAuthentication();
        $this->auditRoleChanges();
    }

    /** Role and permission grants/revokes → audit log (Security module). */
    private function auditRoleChanges(): void
    {
        $names = function (mixed $items, string $class): string {
            $ids = collect(is_iterable($items) ? $items : [$items])->map(fn ($i) => $i instanceof Model ? $i->getKey() : $i)->all();

            return $class::whereIn('id', $ids)->pluck('name')->implode(', ');
        };
        $who = fn (Model $m) => $m->getAttribute('name') ?? $m->getAttribute('email') ?? class_basename($m).' '.$m->getKey();

        // Role changes on accounts are audited and also alert the people who manage users.
        $roleChange = function ($e, string $verb) use ($names, $who): void {
            $message = 'Role '.$names($e->rolesOrIds, Role::class)." {$verb} ".$who($e->model);
            AuditObserver::note('UPDATE', 'Security', $message, 'model_has_roles');
            if ($e->model instanceof User && auth()->check()) {
                Notifier::permission('users.view', '🔐 Account role changed', $message.' by '.auth()->user()->name.'.', 'warning', '/admin/users');
            }
        };
        Event::listen(RoleAttachedEvent::class, fn ($e) => $roleChange($e, 'given to'));
        Event::listen(RoleDetachedEvent::class, fn ($e) => $roleChange($e, 'removed from'));
        Event::listen(PermissionAttachedEvent::class, fn ($e) => AuditObserver::note('UPDATE', 'Security', 'Permission '.$names($e->permissionsOrIds, Permission::class).' given to '.$who($e->model), 'role_has_permissions'));
        Event::listen(PermissionDetachedEvent::class, fn ($e) => AuditObserver::note('UPDATE', 'Security', 'Permission '.$names($e->permissionsOrIds, Permission::class).' removed from '.$who($e->model), 'role_has_permissions'));
    }

    /** Sign-ins, sign-outs, failed attempts and password resets → activity log. */
    private function trackAuthentication(): void
    {
        Event::listen(Login::class, function (Login $e) {
            $req = request();
            $e->user->forceFill(['last_login_at' => now(), 'last_login_ip' => $req->ip()])->saveQuietly();
            // F09: remember THIS user's password hash for AuthenticateSession, so a
            // hash left in the session by a previous account can't sign them out.
            if ($e->guard === 'web' && $req->hasSession()) {
                $guard = auth()->guard('web');
                $hash = method_exists($guard, 'hashPasswordForCookie')
                    ? $guard->hashPasswordForCookie($e->user->getAuthPassword())
                    : $e->user->getAuthPassword();
                $req->session()->put('password_hash_web', $hash);
            }
            // Device limit counts browser sessions only; an API token sign-in has none.
            if ($e->guard === 'web' && $req->hasSession()) {
                SessionLimiter::enforce($e->user, $req);
            }
            ActivityLogger::log($req, 'login', 'Signed in', $e->user);
        });

        Event::listen(Logout::class, function (Logout $e) {
            if ($e->user) {
                ActivityLogger::log(request(), 'logout', 'Signed out', $e->user);
            }
        });

        Event::listen(Failed::class, function (Failed $e) {
            $req = request();
            $email = (string) ($e->credentials['email'] ?? '');
            $recent = UserActivity::where('event', 'login_failed')->where('ip_address', $req->ip())
                ->where('created_at', '>=', now()->subMinutes(15))->count() + 1;
            $suspicious = $recent >= (int) config('church.suspicious_failed_logins', 5);

            if ($recent === (int) config('church.suspicious_failed_logins', 5)) {
                Notifier::permission('activity.view', '🔒 Suspicious sign-in activity', "{$recent} failed sign-ins in 15 minutes from IP {$req->ip()} (last tried: {$email}). Review it in the Activity Log.", 'urgent', '/activity-logs?tab=suspicious');
            }
            ActivityLogger::log($req, 'login_failed',
                "Failed sign-in for {$email}".($suspicious ? " ({$recent} failures in 15 min from this IP)" : ''),
                $e->user instanceof User ? $e->user : null,
                ['email' => $email, 'is_suspicious' => $suspicious]);
        });

        Event::listen(PasswordReset::class, fn (PasswordReset $e) => ActivityLogger::log(request(), 'password_changed', 'Password reset by email link', $e->user));
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
