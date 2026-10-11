<?php

namespace App\Http\Controllers\Account;

use App\Enums\Role as RoleEnum;
use App\Http\Controllers\Controller;
use App\Services\ActivityLogger;
use App\Support\ChurchSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lock screen: protects an unattended screen without signing the user out.
 * The screen locks after the idle time set in Church Settings
 * (lock_screen_minutes) or when the user clicks "Lock screen"; it opens
 * again with the account password. See EnsureScreenUnlocked.
 */
class LockScreenController extends Controller
{
    public const LOCKED_KEY = 'screen_locked_at';

    public const INTENDED_KEY = 'screen_lock_intended';

    public static function isLocked(Request $request): bool
    {
        return $request->session()->has(self::LOCKED_KEY);
    }

    public function show(Request $request): Response|RedirectResponse
    {
        if (! self::isLocked($request)) {
            return redirect()->to($this->home($request));
        }

        $user = $request->user();
        $settings = ChurchSettings::all();
        $role = $user->getRoleNames()->first();

        return Inertia::render('auth/lock-screen', [
            'user' => [
                'name' => $user->name,
                'avatar' => $user->avatar_url,
                'role' => $role ? (RoleEnum::tryFrom($role)?->label() ?? $role) : null,
            ],
            'background' => $settings['about_image_1'] ?: null,
            'lockedAt' => $request->session()->get(self::LOCKED_KEY),
        ]);
    }

    public function lock(Request $request): RedirectResponse
    {
        if (! self::isLocked($request)) {
            $request->session()->put(self::LOCKED_KEY, now()->toIso8601String());

            // Return to the page the user was on (the Referer of this POST).
            $previous = $request->headers->get('referer');
            if ($previous && ! str_contains($previous, '/lock-screen')) {
                $request->session()->put(self::INTENDED_KEY, $previous);
            }
        }

        return redirect()->route('lock-screen');
    }

    public function unlock(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'string', 'max:255'],
        ]);

        if (! Hash::check($request->string('password')->toString(), $request->user()->getAuthPassword())) {
            ActivityLogger::log($request, 'login_failed', 'Wrong password on the lock screen', $request->user());

            throw ValidationException::withMessages(['password' => 'That password is not correct.']);
        }

        $intended = $request->session()->pull(self::INTENDED_KEY);
        $request->session()->forget(self::LOCKED_KEY);
        $request->session()->regenerate();

        return redirect()->to($this->safeIntended($intended) ?? $this->home($request));
    }

    /** Only same-site addresses, so the stored URL can't send anyone elsewhere. */
    private function safeIntended(?string $url): ?string
    {
        if (! $url || parse_url($url, PHP_URL_HOST) !== request()->getHost() || str_contains($url, '/lock-screen')) {
            return null;
        }

        return $url;
    }

    private function home(Request $request): string
    {
        return $request->user()?->isMemberOnly() ? route('member.portal') : route('dashboard');
    }
}
