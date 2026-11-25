<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use App\Notifications\MembershipApproved;
use App\Support\ListQuery;
use App\Support\MemberAccounts;
use App\Support\MemberEmails;
use App\Support\Notifier;
use App\Support\Sequence;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Member extends Model
{
    use HasSlug, HasUuids;

    /** The members table only has created_at. */
    const UPDATED_AT = null;

    public const STATUSES = ['Pending', 'Under Review', 'Approved', 'Active', 'Suspended', 'Inactive', 'Rejected'];

    public const AWAITING_REVIEW = ['Pending', 'Under Review'];

    /**
     * Statuses that lock a member-only login out of the site, with the reason
     * shown on the sign-in page. Pending / Under Review members who signed up
     * through the portal keep portal access so they can follow their review.
     *
     * @var array<string, string>
     */
    public const LOCKED_OUT = [
        'Suspended' => 'Your membership account has been suspended. Please contact the church office for help.',
        'Inactive' => 'Your membership account is inactive. Please contact the church office to reactivate it.',
        'Rejected' => 'Your membership registration was not approved. Please contact the church office.',
    ];

    protected $appends = ['full_name', 'initials'];

    /** The password chosen at registration never leaves the server. */
    protected $hidden = ['pending_password'];

    protected $fillable = [
        'user_id',
        'member_id',
        'first_name',
        'middle_name',
        'last_name',
        'gender',
        'date_of_birth',
        'marital_status',
        'nationality',
        'email',
        'phone',
        'alt_phone',
        'address',
        'city',
        'state',
        'country',
        'photo_url',
        'department',
        'ministry',
        'status',
        'membership_type',
        'date_joined',
        'baptized',
        'baptism_date',
        'communion_participant',
        'previous_church',
        'previous_denomination',
        'occupation',
        'employer',
        'emergency_name',
        'emergency_phone',
        'emergency_relation',
        'family',
        'skills',
        'interests',
        'notes',
        'reg_ref',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'date_of_birth' => 'date:Y-m-d',
            'date_joined' => 'date:Y-m-d',
            'baptism_date' => 'date:Y-m-d',
            'baptized' => 'boolean',
            'communion_participant' => 'boolean',
            'family' => 'array',
            'reviewed_at' => 'datetime',
            'pending_password' => 'hashed',
        ];
    }

    /** Statuses at which a registration counts as accepted and gets a Member ID. */
    public const ACCEPTED = ['Approved', 'Active'];

    protected static function booted(): void
    {
        static::creating(function (Member $member) {
            if (blank($member->status)) {
                $member->status = 'Pending';
            }

            // Staff-entered members get a Member ID immediately. Self-
            // registrations (which carry a reg_ref) only get one once
            // they're approved — until then they're shown by reg_ref.
            if (blank($member->member_id) && (blank($member->reg_ref) || in_array($member->status, self::ACCEPTED, true))) {
                $member->member_id = static::nextMemberId();
            }
        });

        static::updating(function (Member $member) {
            if ($member->isDirty('status') && in_array($member->status, self::ACCEPTED, true) && blank($member->member_id)) {
                $member->member_id = static::nextMemberId();
            }
            if ($member->isDirty('status')) {
                $member->reviewed_at = now();
            }
        });

        // Approved members with an email get a login and an emailed
        // "set your password" link. Pending self-registrations get nothing
        // until staff approve them. See App\Support\MemberAccounts.
        static::created(fn (Member $member) => MemberAccounts::ensureFor($member));

        static::updated(function (Member $member) {
            // Read the change flags first: ensureFor() saves the link quietly, which resets them.
            $justApproved = $member->wasChanged('status') && in_array($member->status, self::ACCEPTED, true)
                && ! in_array($member->getOriginal('status'), self::ACCEPTED, true);
            $needsLogin = ! $member->user_id && $member->email && ($member->wasChanged('email') || $member->wasChanged('status'));
            // Only approving a registration is emailed, not reactivating a suspended or inactive member.
            $registrationApproved = $justApproved
                && in_array($member->getOriginal('status'), [...self::AWAITING_REVIEW, 'Rejected'], true);
            $hadLogin = (bool) $member->user_id;
            $choseSignInPassword = filled($member->getAttributes()['pending_password'] ?? null);

            $login = $needsLogin ? MemberAccounts::ensureFor($member) : null;

            if ($registrationApproved) {
                MemberEmails::approved($member, match (true) {
                    ! $member->user_id => null,
                    // A brand-new login without a chosen password gets the separate set-password email.
                    ! $hadLogin && ! $choseSignInPassword && $login?->wasRecentlyCreated => MembershipApproved::SIGN_IN_SETUP,
                    default => MembershipApproved::SIGN_IN_READY,
                });
            }
            if ($justApproved) {
                Notifier::member(
                    $member,
                    'Membership approved',
                    "Welcome to the church family, {$member->first_name}! Your membership is approved. Your Member ID is {$member->member_id}.",
                    'success',
                    '/member-portal',
                );
            }
        });
    }

    /** SSBC-M-000001, SSBC-M-000002, … */
    public static function nextMemberId(): string
    {
        return static::nextSequence('member_id', 'SSBC-M-', 4);
    }

    /** SSBC-REG-2026-000001 (sequence restarts each year) */
    public static function nextRegRef(): string
    {
        return static::nextSequence('reg_ref', 'SSBC-REG-'.now()->format('Y').'-', 6);
    }

    /** Locked counter, so concurrent saves never share a number (Phase 3, F11). */
    private static function nextSequence(string $column, string $prefix, int $pad): string
    {
        $next = Sequence::next("members.{$column}:{$prefix}",
            fn () => Sequence::highestIn(['members'], $column, $prefix));

        return $prefix.str_pad((string) $next, $pad, '0', STR_PAD_LEFT);
    }

    /**
     * Name / email / Member ID / phone search (Phase 3, F17).
     * On MySQL and MariaDB, words of 3+ letters use the FULLTEXT index
     * (prefix match, so "kwa" finds "Kwame"); IDs and phone numbers use
     * index-friendly prefix matches. Elsewhere (SQLite in tests) it falls
     * back to LIKE. User text is stripped of FULLTEXT operators first.
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim(mb_substr((string) $term, 0, 100));
        if ($term === '') {
            return $query;
        }

        $driver = $query->getConnection()->getDriverName();
        $words = collect(preg_split('/\s+/', preg_replace('/[+\-<>()~*"@]+/', ' ', $term)))
            ->filter(fn ($w) => mb_strlen($w) >= 3)->values();

        return $query->where(function (Builder $q) use ($term, $driver, $words) {
            if (in_array($driver, ['mysql', 'mariadb'], true) && $words->isNotEmpty()) {
                $q->whereFullText(['first_name', 'last_name', 'email'], $words->map(fn ($w) => "+{$w}*")->implode(' '), ['mode' => 'boolean']);
            } else {
                foreach (['first_name', 'last_name', 'email'] as $column) {
                    ListQuery::whereLike($q, $column, $term, 'contains', 'or');
                }
            }
            foreach (['member_id', 'reg_ref', 'phone'] as $column) {
                ListQuery::whereLike($q, $column, $term, 'prefix', 'or');
            }
        });
    }

    /** Members who came in through a registration form (public or portal). */
    /**
     * The review queue: anyone who signed up through a registration form
     * (has a reg_ref), plus every member still awaiting review however they
     * were added, so the queue matches the "pending members" sidebar badge.
     */
    public function scopeRegistrations(Builder $query): Builder
    {
        return $query->where(fn (Builder $q) => $q->whereNotNull('reg_ref')->orWhereIn('status', self::AWAITING_REVIEW));
    }

    public function getInitialsAttribute(): string
    {
        return mb_strtoupper(
            mb_substr((string) $this->first_name, 0, 1).mb_substr((string) $this->last_name, 0, 1)
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeAwaitingReview(Builder $query): Builder
    {
        return $query->whereIn('status', self::AWAITING_REVIEW);
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class, 'department_members')
            ->withPivot('role', 'joined_at');
    }

    public function ministries(): BelongsToMany
    {
        return $this->belongsToMany(Ministry::class, 'ministry_members')
            ->withPivot('role', 'joined_at');
    }

    public function boards(): BelongsToMany
    {
        return $this->belongsToMany(Board::class, 'board_members')
            ->withPivot('role', 'term_start', 'term_end', 'joined_at');
    }

    public function committees(): BelongsToMany
    {
        return $this->belongsToMany(Committee::class, 'committee_members')
            ->withPivot('role', 'joined_at');
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function leadershipProfile(): HasMany
    {
        return $this->hasMany(ChurchLeadership::class);
    }

    public function tithes(): HasMany
    {
        return $this->hasMany(Tithe::class);
    }

    public function offerings(): HasMany
    {
        return $this->hasMany(Offering::class);
    }

    public function donations(): HasMany
    {
        return $this->hasMany(Donation::class);
    }

    public function baptisms(): HasMany
    {
        return $this->hasMany(Baptism::class);
    }

    public function groomWeddings(): HasMany
    {
        return $this->hasMany(Wedding::class, 'groom_member_id');
    }

    public function brideWeddings(): HasMany
    {
        return $this->hasMany(Wedding::class, 'bride_member_id');
    }

    public function funerals(): HasMany
    {
        return $this->hasMany(Funeral::class);
    }

    public function familyMembership()
    {
        return $this->hasOne(FamilyMember::class, 'member_id');
    }

    public function prayerRequests(): HasMany
    {
        return $this->hasMany(PrayerRequest::class, 'requester_member_id');
    }

    public function documentRequests(): HasMany
    {
        return $this->hasMany(DocumentRequest::class);
    }

    /** Slug source: see HasSlug. */
    public function slugSource(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
