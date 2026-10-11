<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\IssueApiToken;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\CreateTokenRequest;
use App\Http\Resources\V1\TokenResource;
use App\Http\Responses\ApiResponse;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * The signed-in user's own API tokens (Phase 4). Every query goes through
 * $request->user()->tokens(), so nobody can see or revoke another user's
 * token by guessing its id (IDOR).
 */
class TokenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tokens = $request->user()->tokens()->orderByDesc('created_at')->limit(100)->get();

        return ApiResponse::success(TokenResource::collection($tokens)->resolve($request), 'Tokens retrieved successfully.');
    }

    public function store(CreateTokenRequest $request, IssueApiToken $issue): JsonResponse
    {
        $data = $request->validated();
        $token = $issue($request->user(), $data['name'], $data['abilities'] ?? null, $data['expires_in_days'] ?? null);
        ActivityLogger::log($request, 'update', "Created API token \"{$token->accessToken->name}\"", $request->user());

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'details' => (new TokenResource($token->accessToken))->resolve($request),
        ], 'Token created. Copy it now; it is shown only once.', 201);
    }

    public function destroy(Request $request, string $token): JsonResponse
    {
        $record = $request->user()->tokens()->whereKey($token)->firstOrFail();
        $record->delete();
        ActivityLogger::log($request, 'logout', "Revoked API token \"{$record->name}\"", $request->user());

        return ApiResponse::success(null, 'Token revoked.');
    }

    /** DELETE /api/v1/auth/tokens — every token except the one making this request. */
    public function destroyAll(Request $request): JsonResponse
    {
        $current = $request->user()->currentAccessToken();
        $count = $request->user()->tokens()
            ->when($current instanceof PersonalAccessToken, fn ($q) => $q->whereKeyNot($current->getKey()))
            ->delete();
        ActivityLogger::log($request, 'logout', "Revoked {$count} API token(s)", $request->user());

        return ApiResponse::success(['revoked' => $count], 'Tokens revoked.');
    }
}
