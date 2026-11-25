<?php

namespace App\Http\Controllers\Members;

use App\Concerns\PasswordValidationRules;
use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Support\MemberEmails;
use App\Support\Notifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public "Join Our Family" form. No login required — submissions land in
 * the Pending Registrations queue with an SSBC-REG-YYYY-NNNNNN reference.
 * The member chooses a password here and signs in with it once approved.
 */
class PublicRegistrationController extends Controller
{
    use PasswordValidationRules;

    public function create(): Response
    {
        return Inertia::render('public-member-registration', [
            'church' => [
                'name' => config('church.name'),
                'email' => config('church.email'),
            ],
            // Service times from Church Settings → Website (blank ones are hidden).
            'services' => collect([
                'Sunday School' => config('church.service_sunday_school'),
                'Sunday Worship' => config('church.service_sunday_worship'),
                'Bible Study' => config('church.service_bible_study'),
                'Prayer Meeting' => config('church.service_prayer_meeting'),
            ])->filter()->map(fn ($time, $name) => "{$name}: {$time}")->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            // Step 1 — personal
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'gender' => ['required', 'in:Male,Female'],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'marital_status' => ['nullable', 'in:Single,Married,Widowed,Divorced'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:30'],
            'alt_phone' => ['nullable', 'string', 'max:30'],
            'email' => ['required', 'email', 'max:255', 'unique:members,email'],
            // Used to sign in once staff approve the registration.
            'password' => $this->passwordRules(),
            'address' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'country' => ['required', 'string', 'max:100'],
            // Step 2 — church
            'membership_type' => ['required', 'in:Regular Member,Associate Member,Junior Member,Transfer Member'],
            'previous_church' => ['nullable', 'string', 'max:150'],
            'previous_denomination' => ['nullable', 'string', 'max:100'],
            'baptized' => ['boolean'],
            'baptism_date' => ['nullable', 'date', 'before_or_equal:today'],
            'communion_participant' => ['boolean'],
            'interests' => ['nullable', 'string', 'max:255'],
            // Step 3 — family
            'family' => ['nullable', 'array'],
            'family.spouse_name' => ['nullable', 'string', 'max:150'],
            'family.spouse_is_member' => ['nullable', 'boolean'],
            'family.children' => ['nullable', 'array', 'max:20'],
            'family.children.*.name' => ['required', 'string', 'max:150'],
            'family.children.*.date_of_birth' => ['nullable', 'date', 'before:tomorrow'],
            // Step 4 — emergency & additional
            'emergency_name' => ['required', 'string', 'max:150'],
            'emergency_phone' => ['required', 'string', 'max:30'],
            'emergency_relation' => ['required', 'string', 'max:50'],
            'occupation' => ['nullable', 'string', 'max:100'],
            'employer' => ['nullable', 'string', 'max:150'],
            'skills' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'consent' => ['accepted'],
        ], [
            'email.unique' => 'A registration with this email already exists. Contact the church office if you need help.',
            'consent.accepted' => 'Please confirm the information is accurate and agree to the privacy notice.',
        ]);

        $photoUrl = $request->hasFile('photo')
            ? asset('storage/'.$request->file('photo')->store('uploads/members', 'public'))
            : null;

        $member = new Member([
            ...collect($validated)->except(['photo', 'consent', 'password'])->all(),
            'photo_url' => $photoUrl,
            'baptized' => $request->boolean('baptized'),
            'communion_participant' => $request->boolean('communion_participant'),
            'baptism_date' => $request->boolean('baptized') ? ($validated['baptism_date'] ?? null) : null,
            'status' => 'Pending',
            'reg_ref' => Member::nextRegRef(),
            'date_joined' => now()->toDateString(),
        ]);
        // Hashed by the model cast; moved onto the login when staff approve the member.
        $member->forceFill(['pending_password' => $validated['password']])->save();

        MemberEmails::registrationReceived($member, choseSignInPassword: true);

        Notifier::permission(
            'members.view',
            'New member registration',
            "New member registration from {$member->full_name}",
            'member',
            '/pending-registrations',
        );

        Inertia::flash('registration', [
            'reference' => $member->reg_ref,
            'name' => $member->first_name,
            'email' => $member->email,
            // No login yet: it is created with the chosen password when staff approve the registration.
            'has_account' => false,
        ]);

        return back();
    }
}
