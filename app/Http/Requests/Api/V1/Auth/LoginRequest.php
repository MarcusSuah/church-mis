<?php

namespace App\Http\Requests\Api\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /api/v1/auth/login
 *
 * Browser (cookie) login from the church's own frontend: email + password
 * (+ remember). Token login from any other client: also device_name, and
 * optionally abilities and expires_in_days. Accounts with two-factor
 * authentication also send code (6 digits) or recovery_code.
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'remember' => ['sometimes', 'boolean'],
            'device_name' => ['nullable', 'string', 'max:100'],
            'abilities' => ['sometimes', 'array', 'max:200'],
            'abilities.*' => ['string', 'max:100', 'distinct'],
            'expires_in_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'code' => ['nullable', 'string', 'max:10'],
            'recovery_code' => ['nullable', 'string', 'max:100'],
        ];
    }
}
