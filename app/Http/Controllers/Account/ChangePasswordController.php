<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Change password. Users flagged by an admin have must_change_credentials =
 * true and are sent here before they can use the app (EnsurePasswordChanged
 * middleware). There is no shared default password any more (Phase 2, F01).
 */
class ChangePasswordController extends Controller
{
    public function show(Request $request): Response
    {
        return Inertia::render('auth/change-password', [
            'forced' => (bool) $request->user()->must_change_credentials,
            'home' => $this->home($request),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => [
                'required', 'confirmed', 'different:current_password',
                Password::min(8)->mixedCase()->numbers()->symbols(),
            ],
        ], [
            'current_password.current_password' => 'The current password is incorrect.',
            'password.different' => 'The new password must be different from your current password.',
        ]);

        $user->forceFill([
            'password' => $request->input('password'),
            'must_change_credentials' => false,
        ])->save();

        \App\Services\ActivityLogger::log($request, 'password_changed', 'Changed password', $user);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Password changed successfully!']);

        return redirect($this->home($request));
    }

    private function home(Request $request): string
    {
        return $request->user()->isMemberOnly() ? route('member.portal') : route('dashboard');
    }
}
