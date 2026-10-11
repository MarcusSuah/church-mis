<?php

namespace App\Http\Requests\Api\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Validator;

/** POST /api/v1/auth/tokens — the current password is required again. */
class CreateTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'max:255'],
            'abilities' => ['sometimes', 'array', 'max:200'],
            'abilities.*' => ['string', 'max:100', 'distinct'],
            'expires_in_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if (! Hash::check((string) $this->input('password'), (string) $this->user()->password)) {
                $validator->errors()->add('password', 'The password is incorrect.');
            }
        }];
    }
}
