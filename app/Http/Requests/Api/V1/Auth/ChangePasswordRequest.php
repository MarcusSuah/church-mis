<?php

namespace App\Http\Requests\Api\V1\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

/** PUT /api/v1/auth/password — same rules as the web change-password page. */
class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'max:255'],
            'password' => [
                'required', 'string', 'max:255', 'confirmed', 'different:current_password',
                Password::min(8)->mixedCase()->numbers()->symbols(),
                Password::default(),
            ],
        ];
    }

    public function messages(): array
    {
        return ['password.different' => 'The new password must be different from your current password.'];
    }

    /** current_password is checked against the user Sanctum resolved (cookie or token). */
    public function after(): array
    {
        return [function (Validator $validator) {
            if (! Hash::check((string) $this->input('current_password'), (string) $this->user()->password)) {
                $validator->errors()->add('current_password', 'The current password is incorrect.');
            }
        }];
    }
}
