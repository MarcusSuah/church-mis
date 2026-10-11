<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Fortify\ResetUserPassword;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\ChangePasswordRequest;
use App\Http\Requests\Api\V1\Auth\ForgotPasswordRequest;
use App\Http\Requests\Api\V1\Auth\ResetPasswordRequest;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Support\UserSessions;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

/** Password change and reset over the API (Phase 4). */
class PasswordController extends Controller
{
    /** PUT /api/v1/auth/password — other sessions and tokens are signed out (F09). */
    public function update(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->forceFill([
            'password' => $request->validated('password'),
            'must_change_credentials' => false,
        ])->save();

        UserSessions::passwordChanged($user, $request);
        ActivityLogger::log($request, 'password_changed', 'Changed password (API)', $user);

        return ApiResponse::success(null, 'Password changed. Your other devices have been signed out.');
    }

    /**
     * POST /api/v1/auth/forgot-password — always the same answer, so the
     * response never reveals whether an email has an account.
     */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        Password::broker()->sendResetLink(['email' => $request->validated('email')]);

        return ApiResponse::success(null, 'If that email address has an account, a password reset link is on its way.');
    }

    /** POST /api/v1/auth/reset-password — every session and token is ended. */
    public function reset(ResetPasswordRequest $request, ResetUserPassword $resetter): JsonResponse
    {
        $input = $request->only(['email', 'password', 'password_confirmation', 'token']);

        $status = Password::broker()->reset($input, function (User $user) use ($resetter, $input) {
            $resetter->reset($user, $input);
            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            // Same message for an unknown email and a bad token, so this
            // endpoint can't be used to find out which emails have accounts.
            throw ValidationException::withMessages(['email' => $status === Password::RESET_THROTTLED
                ? __($status)
                : 'This password reset link is invalid or has expired. Please request a new one.']);
        }

        return ApiResponse::success(null, 'Your password has been reset. Please sign in.');
    }
}
