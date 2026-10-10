<?php

namespace App\Http\Requests\Members;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMemberRequest extends FormRequest
{
    use MemberRequestRules;

    public function authorize(): bool
    {
        return $this->user()->can('members.update');
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $member = $this->route('member');

        return array_merge($this->profileRules(), [
            'member_id' => ['nullable', 'string', 'max:50', Rule::unique('members', 'member_id')->ignore($member)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('members', 'email')->ignore($member)],
        ]);
    }
}
