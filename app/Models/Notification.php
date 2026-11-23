<?php

namespace App\Models;

use App\Enums\NotificationType;
use App\Enums\Role;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\DB;
use App\Services\ActivityNotifier;


/**
 * In-app notifications. Who sees one is decided by recipient_type:
 *   all     — everyone who signs in
 *   staff   — every user who isn't member-only
 *   members — member-only users
 *   role    — users with the role named in recipient_id
 *   member  — the user linked to the member whose id is in recipient_id
 *   permission — users holding the permission named in recipient_id
 *               (sensitive alerts go only to the people allowed to act on them)
 * Read state is per user (notification_reads).
 */
class Notification extends Model
{
    use HasFactory, HasUuids;

    public const RECIPIENT_TYPES = ['all', 'staff', 'members', 'role', 'member', 'permission'];

    protected $fillable = [
        'title',
        'message',
        'actor_id',
        'notification_type',
        'recipient_type',
        'recipient_id',
        'is_read',
        'is_sent',
        'sent_at',
        'created_by',
        'link_url',
    ];

    protected function casts(): array
    {
        return [
            'notification_type' => NotificationType::class,
            'is_read' => 'boolean',
            'is_sent' => 'boolean',
            'sent_at' => 'datetime',
        ];
    }

    public function readers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'notification_reads')->withPivot('read_at');
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $memberOnly = $user->isMemberOnly();
        $memberId = Member::where('user_id', $user->id)->value('id');
        $roles = $user->getRoleNames()->all();
        // The Superadmin passes every check through Gate::before and holds no explicit
        // permissions, so give it every permission here too, or permission-targeted
        // alerts (expenses to approve, suspicious sign-ins, pastoral cases) never reach it.
        $permissions = $user->hasRole(Role::SUPERADMIN->value)
            ? Permission::pluck('name')->all()
            : $user->getAllPermissions()->pluck('name')->all();

        return $query->where('is_sent', true)
            // Nobody is alerted about their own actions.
            ->where(fn(Builder $a) => $a->whereNull('actor_id')->orWhere('actor_id', '!=', $user->id))
            ->where(function (Builder $q) use ($memberOnly, $memberId, $roles, $permissions) {
                $q->where('recipient_type', 'all')
                    ->orWhere('recipient_type', $memberOnly ? 'members' : 'staff');
                if ($roles) {
                    $q->orWhere(fn(Builder $r) => $r->where('recipient_type', 'role')->whereIn('recipient_id', $roles));
                }
                if ($permissions) {
                    $q->orWhere(fn(Builder $p) => $p->where('recipient_type', 'permission')->whereIn('recipient_id', $permissions));
                }
                if ($memberId) {
                    $q->orWhere(fn(Builder $m) => $m->where('recipient_type', 'member')->where('recipient_id', $memberId));
                }
            });
    }

    /** Adds an is_read_by_me column (0/1) for the given user. */
    public function scopeWithReadState(Builder $query, User $user): Builder
    {
        return $query->addSelect([
            'is_read_by_me' => DB::table('notification_reads')
                ->selectRaw('count(*)')
                ->whereColumn('notification_reads.notification_id', 'notifications.id')
                ->where('notification_reads.user_id', $user->id),
        ]);
    }

    public function scopeUnreadBy(Builder $query, User $user): Builder
    {
        return $query->whereNotExists(fn($q) => $q->selectRaw('1')->from('notification_reads')
            ->whereColumn('notification_reads.notification_id', 'notifications.id')
            ->where('notification_reads.user_id', $user->id));
    }
    
}
