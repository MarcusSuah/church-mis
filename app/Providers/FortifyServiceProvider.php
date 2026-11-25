<?php

namespace App\Providers;

use App\Actions\Auth\AuthenticateUser;
use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
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
        // Sign-in rules (blocked IPs, rejected or blocked accounts, suspended or
        // inactive members) are shared with the API login: see AuthenticateUser.
        Fortify::authenticateUsing(fn (Request $request) => app(AuthenticateUser::class)(
            $request,
            (string) $request->input(Fortify::username()),
            (string) $request->input('password'),
        ));

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

        // Fortify's account forms (applied to every Fortify route via config/fortify.php,
        // but only these submissions count). Stops bots creating accounts or sending
        // reset emails in bulk through the church's mail account, and password guessing
        // on the confirm-password screen. Sign-in has its own "login" limiter.
        RateLimiter::for('account-forms', function (Request $request) {
            if (! $request->isMethod('POST')) {
                return Limit::none();
            }

            if ($request->routeIs('password.confirm.store')) {
                return Limit::perMinute(6)->by('confirm:'.($request->user()?->id ?: $request->ip()))
                    ->response(fn () => back()->withErrors(['password' => 'Too many attempts. Please wait a minute and try again.']));
            }

            if ($request->routeIs('register.store', 'password.email', 'password.update')) {
                return Limit::perMinute(10)->by('account-forms:'.$request->ip())
                    ->response(fn () => back()->withInput($request->only('email', 'name'))
                        ->withErrors(['email' => 'Too many requests. Please wait a minute and try again.']));
            }

            return Limit::none();
        });

        // API: per signed-in user, falling back to the IP address.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('passkeys', function (Request $request) {
            return Limit::perMinute(10)->by(
                ($request->input('credential.id') ?: $request->session()->getId()).'|'.$request->ip(),
            );
        });
    }
}
