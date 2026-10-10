<?php

namespace App\Providers;

use App\Enums\Role as RoleEnum;
use App\Models\Member;
use App\Models\User;
use App\Models\UserActivity;
use App\Services\ActivityLogger;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Event;
use App\Policies\MemberPolicy;
use App\Policies\UserPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

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
        \App\Support\ChurchSettings::apply();

        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Member::class, MemberPolicy::class);

        // Super admin passes every ability check (policies, @can, and
        // Spatie's permission middleware, which goes through the Gate).
        Gate::before(function (User $user) {
            return $user->hasRole(RoleEnum::SUPERADMIN->value) ? true : null;
        });

        // Audit trail for church records.
        foreach (array_keys(\App\Observers\AuditObserver::MODULES) as $model) {
            if (class_exists($model)) {
                $model::observe(\App\Observers\AuditObserver::class);
            }
        }

        // In-app notifications for every module.
        foreach (\App\Observers\NotifyObserver::MODELS as $model) {
            $model::observe(\App\Observers\NotifyObserver::class);
        }

        $this->trackAuthentication();
    }

    /** Sign-ins, sign-outs, failed attempts and password resets → activity log. */
    private function trackAuthentication(): void
    {
        Event::listen(Login::class, function (Login $e) {
            $req = request();
            $e->user->forceFill(['last_login_at' => now(), 'last_login_ip' => $req->ip()])->saveQuietly();
            \App\Support\SessionLimiter::enforce($e->user, $req);
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
                \App\Support\Notifier::permission('activity.view', '🔒 Suspicious sign-in activity', "{$recent} failed sign-ins in 15 minutes from IP {$req->ip()} (last tried: {$email}). Review it in the Activity Log.", 'urgent', '/activity-logs?tab=suspicious');
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
