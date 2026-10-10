<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role as RoleEnum;
use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Role::query()
            ->with('permissions:id,name,module')
            ->withCount('users')   // one query instead of one COUNT per role (F24)
            ->orderBy('name');

        if ($request->filled('search')) {
            $search = $request->string('search')->trim()->toString();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $perPage = $request->integer('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 20, 25, 30, 40, 50], true) ? $perPage : 15;

        $roles = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn(Role $role) => $this->transform($role));

        $permissions = Permission::query()
            ->orderBy('module')
            ->orderBy('name')
            ->get(['id', 'name', 'module', 'description']);

        return Inertia::render('Admin/Roles/Index', [
            'roles' => $roles,
            'permissions' => $permissions,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'per_page' => (string) $perPage,
            ],
        ]);
    }
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')],
            'permissions' => ['array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        $role->syncPermissions($validated['permissions'] ?? []);

        return back();
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($role->id)],
            'permissions' => ['array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        if ($role->isProtected() && $validated['name'] !== $role->name) {
            throw ValidationException::withMessages([
                'name' => 'This role cannot be renamed.',
            ]);
        }

        $role->update(['name' => $validated['name']]);
        $role->syncPermissions($validated['permissions'] ?? []);

        return back();
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->isProtected()) {
            throw ValidationException::withMessages([
                'role' => 'This role cannot be deleted.',
            ]);
        }

        if (User::role($role->name)->exists()) {
            throw ValidationException::withMessages([
                'role' => 'This role is still assigned to one or more users.',
            ]);
        }

        $role->delete();

        return back();
    }

    private function transform(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'label' => RoleEnum::tryFrom($role->name)?->label() ?? $role->name,
            'is_protected' => $role->isProtected(),
            'users_count' => (int) ($role->users_count ?? User::role($role->name)->count()),
            'permission_ids' => $role->permissions->pluck('id'),
        ];
    }
}
