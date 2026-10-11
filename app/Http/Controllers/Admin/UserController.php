<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role as RoleEnum;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Services\ActivityLogger;
use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        $query = User::query()->with(['reviewer', 'roles'])->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->trim()->toString();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $status = UserStatus::tryFrom($request->string('status')->toString());
            if ($status) {
                $query->where('status', $status->value);
            }
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 20, 25, 30, 40, 50], true) ? $perPage : 15;

        $actor = $request->user();
        $users = $query->paginate($perPage)->withQueryString()->through(fn (User $u) => [
            ...$this->transform($u),
            'can_assign_roles' => $this->mayAssignRoles($actor, $u),
        ]);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'assignableRoles' => Role::query()->with('permissions:id,name')->orderBy('name')->get()
                ->map(fn (Role $role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                    'label' => RoleEnum::tryFrom($role->name)?->label() ?? $role->name,
                    'assignable' => UserPolicy::canGiveRole($actor, $role->name),
                ])->values(),
            'filters' => [
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
                'is_active' => $request->string('is_active')->toString(),
                'per_page' => (string) $perPage,
            ],
        ]);
    }

    public function pending(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        $users = User::query()
            ->where('status', UserStatus::PENDING)
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $u) => $this->transform($u));

        return Inertia::render('Admin/Users/Pending', ['users' => $users]);
    }

    public function show(User $user): Response
    {
        Gate::authorize('view', $user);

        $user->load('reviewer');

        return Inertia::render('Admin/Users/Show', ['user' => $this->transform($user)]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        // F03: permission alone is not enough — the editor must outrank the account.
        Gate::authorize('update', $user);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:30'],
            'is_active' => ['boolean'],
            'must_change_credentials' => ['boolean'],
            'avatar' => ['nullable', 'image', 'max:2048'],
        ]);

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }

            $validated['avatar'] = $request->file('avatar')->store('avatars', 'public');
        } else {
            unset($validated['avatar']);
        }

        $emailChanged = $validated['email'] !== $user->email;
        $user->fill($validated);
        if ($emailChanged) {
            // The new address must be proven by its owner before it counts (F03).
            $user->email_verified_at = null;
        }
        $user->save();

        if ($emailChanged && $user->id !== $request->user()->id) {
            ActivityLogger::log($request, 'update', "Changed the email of user #{$user->id}", $request->user());
        }

        return back();
    }

    public function approve(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('approve', $user);

        if (! $user->isPending()) {
            throw ValidationException::withMessages(['user' => 'Only pending users can be approved.']);
        }

        $user->update([
            'status' => UserStatus::APPROVED,
            'is_active' => true,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'rejection_reason' => null,
        ]);

        return back();
    }

    public function reject(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('approve', $user);

        $validated = $request->validate(['rejection_reason' => ['required', 'string', 'max:2000']]);

        if (! $user->isPending()) {
            throw ValidationException::withMessages(['user' => 'Only pending users can be rejected.']);
        }

        $user->update([
            'status' => UserStatus::REJECTED,
            'is_active' => false,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return back();
    }

    public function activate(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('update', $user);

        $user->update(['is_active' => true]);

        return back();
    }

    public function deactivate(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('deactivate', $user);

        if ($request->user()->id === $user->id) {
            throw ValidationException::withMessages(['user' => 'You cannot deactivate your own account.']);
        }

        $user->update(['is_active' => false]);

        return back();
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('delete', $user);

        if ($request->user()->id === $user->id) {
            throw ValidationException::withMessages(['user' => 'You cannot delete your own account.']);
        }

        // Like the Superadmin and Admin roles, a Superadmin account is never deleted —
        // not even by another Superadmin (who skips the policy check above).
        if ($this->isProtectedAccount($user)) {
            throw ValidationException::withMessages(['user' => 'A Superadmin account cannot be deleted.']);
        }

        $user->delete();

        return to_route('admin.users.index');
    }

    /**
     * Change which roles an account has (Phase 4, F08). Every role added or
     * removed must be within the editor's ceiling (UserPolicy::assignRoles),
     * and each change is written to the audit log.
     */
    public function updateRoles(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'roles' => ['present', 'array'],
            'roles.*' => ['string', 'max:255'],
        ]);

        // Use the stored names, so "admin" can't pass as a different role than "Admin".
        $requested = collect($validated['roles'])->unique()->map(function (string $name) {
            $role = Role::query()->where('guard_name', 'web')->where('name', $name)->first();
            if (! $role) {
                throw ValidationException::withMessages(['roles' => "The role {$name} does not exist."]);
            }

            return $role->name;
        })->unique()->values()->all();

        $current = $user->getRoleNames()->all();
        $changed = array_values(array_unique([...array_diff($requested, $current), ...array_diff($current, $requested)]));

        abort_unless($this->mayAssignRoles($request->user(), $user, $changed), 403, 'You cannot change the roles of this account.');

        if ($changed === []) {
            return back();
        }

        $user->syncRoles($requested);

        Audit::record('update', 'model_has_roles', "Changed the roles of {$user->email}", ['roles' => $current], ['roles' => $requested]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Roles updated for {$user->name}."]);

        return back();
    }

    /**
     * Nobody changes their own roles, the Superadmin included (the Superadmin
     * skips policies, so this is checked here), and the last Superadmin keeps the role.
     *
     * @param  list<string>  $changedRoles
     */
    private function mayAssignRoles(User $actor, User $target, array $changedRoles = []): bool
    {
        if ($actor->id === $target->id || ! Gate::forUser($actor)->allows('assignRoles', [$target, $changedRoles])) {
            return false;
        }

        $superadmin = RoleEnum::SUPERADMIN->value;

        return ! (in_array($superadmin, $changedRoles, true)
            && $target->hasRole($superadmin)
            && User::role($superadmin)->count() <= 1);
    }

    private function isProtectedAccount(User $user): bool
    {
        return $user->hasRole(RoleEnum::SUPERADMIN->value);
    }

    private function transform(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar_url,
            'status' => $user->status->value,
            'display_status' => $user->display_status,
            'is_active' => $user->is_active,
            'must_change_credentials' => $user->must_change_credentials,
            'reviewed_by' => $user->reviewed_by,
            'reviewed_at' => $user->reviewed_at?->toISOString(),
            'rejection_reason' => $user->rejection_reason,
            'reviewer' => $user->reviewer
                ? ['id' => $user->reviewer->id, 'name' => $user->reviewer->name]
                : null,
            'created_at' => $user->created_at?->toISOString(),

            // Spatie roles
            'roles' => $user->roles->map(fn ($role) => [
                'id' => $role->id,
                'name' => $role->name,
            ])->values(),
            // optional convenience field if you only care about the first role
            'role' => $user->roles->first()?->name,
            'is_protected' => $user->roles->contains('name', RoleEnum::SUPERADMIN->value),
        ];
    }
}
