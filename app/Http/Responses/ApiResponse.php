<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;

/**
 * The standard JSON envelope for /api responses (Phase 4):
 * { "success": bool, "message": string, "data"?: mixed, "errors"?: object, ...extra }.
 */
final class ApiResponse
{
    /** @param  array<string, mixed>  $extra */
    public static function success(mixed $data = null, string $message = 'OK', int $status = 200, array $extra = []): JsonResponse
    {
        return response()->json(['success' => true, 'message' => $message, 'data' => $data, ...$extra], $status);
    }

    /**
     * @param  array<string, mixed>  $errors  field => messages (validation)
     * @param  array<string, mixed>  $extra  additional top-level keys (e.g. an error reference)
     * @param  array<string, mixed>  $headers  response headers to keep (e.g. Retry-After)
     */
    public static function error(string $message, int $status, array $errors = [], array $extra = [], array $headers = []): JsonResponse
    {
        $body = ['success' => false, 'message' => $message, ...$extra];
        if ($errors !== []) {
            $body['errors'] = $errors;
        }

        return response()->json($body, $status, $headers);
    }
}
