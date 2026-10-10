<?php

namespace App\Models;

use App\Enums\Role as RoleEnum;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'name',
    'email',
    'phone',
    'avatar',
    'password',
    'status',
    'is_active',
    'must_change_credentials',
    'reviewed_by',
    'reviewed_at',
    'rejection_reason',
])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
/**
 * MustVerifyEmail is required (Phase 2, F02): without it the `verified'
 * middleware lets unverified sign-ups straight in.
 */
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, SoftDeletes, TwoFactorAuthenticatable;

    protected $guard_name = 'web';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',

            'status' => UserStatus::class,

            'is_active' => 'boolean',
            'blocked_at' => 'datetime',
            'last_login_at' => 'datetime',
            'must_change_credentials' => 'boolean',

            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * The church member profile linked to this login account.
     */
    public function member(): HasOne
    {
        return $this->hasOne(Member::class);
    }

    /**
     * True when the user's only role is Member — they get the member portal
     * instead of the staff dashboard.
     */
    public function isMemberOnly(): bool
    {
        $roles = $this->getRoleNames();

        return $roles->count() === 1 && $roles->first() === RoleEnum::MEMBER->value;
    }

    /**
     * User who reviewed this account.
     */
    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Users whose accounts were reviewed by this user.
     */
    public function reviewedUsers()
    {
        return $this->hasMany(User::class, 'reviewed_by');
    }

    /**
     * Determine whether the user is approved.
     */
    public function isApproved(): bool
    {
        return $this->status === UserStatus::APPROVED;
    }

    /**
     * Determine whether the user is pending approval.
     */
    public function isPending(): bool
    {
        return $this->status === UserStatus::PENDING;
    }

    /**
     * Determine whether the user is rejected.
     */
    public function isRejected(): bool
    {
        return $this->status === UserStatus::REJECTED;
    }

    /**
     * Determine whether the user can access the application.
     */
    public function canAccessApplication(): bool
    {
        return $this->status === UserStatus::APPROVED
            && $this->is_active;
    }

    protected function displayStatus(): Attribute
    {
        return Attribute::get(fn () => match (true) {
            $this->status === UserStatus::PENDING => 'pending',
            $this->status === UserStatus::REJECTED => 'rejected',
            $this->status === UserStatus::APPROVED && ! $this->is_active => 'inactive',
            default => 'active',
        });
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(fn () => $this->avatar ? Storage::url($this->avatar) : null);
    }
}
