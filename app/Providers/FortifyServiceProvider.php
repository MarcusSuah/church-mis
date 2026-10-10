<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Models\BlockedIp;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Blocked accounts and blocked IPs can't sign in.
        Fortify::authenticateUsing(function (Request $request) {
            if (BlockedIp::isBlocked($request->ip())) {
                throw ValidationException::withMessages(['email' => 'Access from your network has been blocked. Please contact the church office.']);
            }
            $user = User::where('email', $request->input(Fortify::username()))->first();
            if (! $user || ! Hash::check((string) $request->input('password'), $user->password)) {
                return null;
            }
            // Rejected sign-ups can't sign in (Phase 2, F02). Pending ones can,
            // but only reach the member portal until staff link and approve them.
            if ($user->isRejected()) {
                ActivityLogger::log($request, 'login_failed', 'Rejected account tried to sign in', $user, ['email' => $user->email]);
                throw ValidationException::withMessages(['email' => 'This account was not approved. Please contact the church office.']);
            }
            if ($user->blocked_at || ! $user->is_active) {
                ActivityLogger::log($request, 'login_failed', 'Blocked account tried to sign in', $user, ['email' => $user->email]);
                throw ValidationException::withMessages(['email' => 'Your account has been blocked. Please contact the church office.']);
            }

            return $user;
        });

        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        // Sign-in throttling: a few tries per account+IP each minute, and a cap per IP
        // per hour so one address can't cycle through many accounts.
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());
            $tooMany = function (Request $request, array $headers) {
                $wait = (int) ($headers['Retry-After'] ?? 60);

                return back()->withInput($request->only(Fortify::username()))->withErrors([
                    Fortify::username() => 'Too many sign-in attempts. Please wait '.($wait >= 120 ? ceil($wait / 60).' minutes' : "{$wait} seconds").' and try again.',
                ]);
            };

            return [
                Limit::perMinute((int) config('church.login_attempts_per_minute', 5))->by($throttleKey)->response($tooMany),
                Limit::perHour((int) config('church.login_attempts_per_hour', 30))->by('ip:'.$request->ip())->response($tooMany),
            ];
        });

        // Public forms (registration, password reset) — protects against bots.
        RateLimiter::for('public-forms', fn (Request $request) => Limit::perMinute(10)->by($request->ip())
            ->response(fn () => back()->withErrors(['email' => 'Too many requests. Please wait a minute and try again.'])));

        // API: per signed-in user, falling back to the IP address.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('passkeys', function (Request $request) {
            return Limit::perMinute(10)->by(
                ($request->input('credential.id') ?: $request->session()->getId()).'|'.$request->ip(),
            );
        });
    }
}
