<?php

namespace App\Http\Requests\Members;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreMemberRequest extends FormRequest
{
    use MemberRequestRules;

    public function authorize(): bool
    {
        return $this->user()->can('members.create');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return array_merge($this->profileRules(), [
            'member_id' => ['nullable', 'string', 'max:50', 'unique:members,member_id'],
            'email' => ['nullable', 'email', 'max:255', 'unique:members,email'],
        ]);
    }
}
