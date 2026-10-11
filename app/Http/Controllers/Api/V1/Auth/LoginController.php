<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\AuthenticateUser;
use App\Actions\Auth\IssueApiToken;
use App\Actions\Auth\VerifyTwoFactor;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Resources\V1\UserResource;
use App\Http\Responses\ApiResponse;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * POST /api/v1/auth/login (Phase 4)
 *
 * From the church's own frontend (a host in SANCTUM_STATEFUL_DOMAINS, after
 * GET /sanctum/csrf-cookie): starts a cookie session. No token is created
 * or returned.
 *
 * From any other client: returns a personal access token once, with its
 * abilities and expiry. device_name is required and the email must be
 * verified.
 */
class LoginController extends Controller
{
    public function __invoke(LoginRequest $request, AuthenticateUser $authenticate, VerifyTwoFactor $twoFactor, IssueApiToken $issue): JsonResponse
    {
        $data = $request->validated();
        $user = $authenticate($request, $data['email'], $data['password']);

        if (! $user) {
            event(new Failed('web', null, ['email' => $data['email']]));
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        if ($twoFactor->required($user)) {
            if (blank($data['code'] ?? null) && blank($data['recovery_code'] ?? null)) {
                return ApiResponse::error('Enter the code from your authenticator app, or a recovery code.', 422,
                    ['code' => ['A two-factor code is required.']], ['two_factor_required' => true]);
            }

            // Per ACCOUNT, not per IP: 5 wrong codes a minute, from anywhere, then wait.
            $key = 'api-2fa:'.$user->getKey();
            if (RateLimiter::tooManyAttempts($key, 5)) {
                $wait = RateLimiter::availableIn($key);

                return ApiResponse::error("Too many two-factor attempts. Please wait {$wait} seconds and try again.", 429, [], ['retry_after' => $wait], ['Retry-After' => $wait]);
            }
            if (! $twoFactor->passes($user, $data['code'] ?? null, $data['recovery_code'] ?? null)) {
                RateLimiter::hit($key, 60);
                event(new Failed('web', $user, ['email' => $data['email']]));
                throw ValidationException::withMessages(['code' => 'The two-factor code is not valid.']);
            }
            RateLimiter::clear($key);
        }

        // First-party browser request: cookie session (Sanctum marks these requests).
        if ($request->attributes->get('sanctum') === true && $request->hasSession()) {
            Auth::guard('web')->login($user, (bool) ($data['remember'] ?? false));
            $request->session()->regenerate();

            return ApiResponse::success(new UserResource($user), 'Signed in.');
        }

        // Any other client: a personal access token.
        if (blank($data['device_name'] ?? null)) {
            throw ValidationException::withMessages(['device_name' => 'Give this device a name (for example "Pastor\'s phone") to get an API token.']);
        }
        if (! $user->hasVerifiedEmail()) {
            throw ValidationException::withMessages(['email' => 'Verify your email address before signing in from an app.']);
        }

        $token = $issue($user, $data['device_name'], $data['abilities'] ?? null, $data['expires_in_days'] ?? null);
        event(new Login('sanctum', $user, false));

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => $token->accessToken->expires_at?->toIso8601String(),
            'abilities' => $token->accessToken->abilities,
            'user' => (new UserResource($user->withAccessToken($token->accessToken)))->resolve($request),
        ], 'Signed in. Store this token securely; it is shown only once.', 201);
    }
}
