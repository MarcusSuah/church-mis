<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Routing\Attributes\Controllers\Middleware;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Spatie\Permission\Models\Role;


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

        $users = $query->paginate($perPage)->withQueryString()->through(fn(User $u) => $this->transform($u));

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
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
            ->through(fn(User $u) => $this->transform($u));

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
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
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
            \App\Services\ActivityLogger::log($request, 'update', "Changed the email of user #{$user->id}", $request->user());
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

        $user->delete();

        return to_route('admin.users.index');
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
            'roles' => $user->roles->map(fn($role) => [
                'id' => $role->id,
                'name' => $role->name,
            ])->values(),
            // optional convenience field if you only care about the first role
            'role' => $user->roles->first()?->name,
        ];
    }
}
