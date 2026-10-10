<?php

namespace App\Http\Requests\Members;

use App\Models\Member;
use Illuminate\Validation\Rule;

trait MemberRequestRules
{
    protected function profileRules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'gender' => ['nullable', 'string', 'in:Male,Female,Other'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'marital_status' => ['nullable', 'string', 'in:Single,Married,Widowed,Divorced'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'alt_phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'photo_url' => ['nullable', 'string', 'max:2048'],
            'department' => ['nullable', 'string', 'max:100'],
            'ministry' => ['nullable', 'string', 'max:100'],
            'status' => ['required', 'string', Rule::in(Member::STATUSES)],
            'membership_type' => ['nullable', 'string', 'max:100'],
            'date_joined' => ['nullable', 'date'],
            'baptized' => ['sometimes', 'boolean'],
            'baptism_date' => ['nullable', 'date', 'before_or_equal:today'],
            'communion_participant' => ['sometimes', 'boolean'],
            'previous_church' => ['nullable', 'string', 'max:150'],
            'previous_denomination' => ['nullable', 'string', 'max:100'],
            'occupation' => ['nullable', 'string', 'max:100'],
            'employer' => ['nullable', 'string', 'max:150'],
            'emergency_name' => ['nullable', 'string', 'max:150'],
            'emergency_phone' => ['nullable', 'string', 'max:30'],
            'emergency_relation' => ['nullable', 'string', 'max:50'],
            'skills' => ['nullable', 'string', 'max:1000'],
            'interests' => ['nullable', 'string', 'max:255'],
            'family' => ['nullable', 'array'],
            'family.spouse_name' => ['nullable', 'string', 'max:150'],
            'family.spouse_is_member' => ['nullable', 'boolean'],
            'family.children' => ['nullable', 'array', 'max:20'],
            'family.children.*.name' => ['required', 'string', 'max:150'],
            'family.children.*.date_of_birth' => ['nullable', 'date', 'before:tomorrow'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'reg_ref' => ['nullable', 'string', 'max:50'],
        ];
    }
}
