<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

/**
 * Phase 4 permissions (data only; RolePermissionSeeder matches for fresh installs).
 *
 *  F21 — `website.manage` was used by the /website-content routes but never
 *        created, so only the Superadmin could edit the public website.
 *        Created and given to Admin.
 *  F08 — `departments.manage-any` / `ministries.manage-any`: without them,
 *        departments.update / ministries.update only cover the departments
 *        and ministries the user leads. Given to Admin and Supervisor, who
 *        could already edit all of them, so nothing changes for them.
 *        Department Leaders don't get them: they now manage only their own.
 */
return new class extends Migration
{
    private const PERMISSIONS = [
        'website.manage' => ['Website', 'Edit the public website (slides, beliefs, page text)'],
        'departments.manage-any' => ['Departments', 'Edit any department, not only the ones you lead'],
        'ministries.manage-any' => ['Ministries', 'Edit any ministry, not only the ones you lead'],
    ];

    private const GRANTS = [
        'Superadmin' => ['website.manage', 'departments.manage-any', 'ministries.manage-any'],
        'Admin' => ['website.manage', 'departments.manage-any', 'ministries.manage-any'],
        'Supervisor' => ['departments.manage-any', 'ministries.manage-any'],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('permissions') || ! Schema::hasTable('roles')) {
            return;
        }

        $now = now();
        foreach (self::PERMISSIONS as $name => [$module, $description]) {
            $key = ['name' => $name, 'guard_name' => 'web'];
            if (DB::table('permissions')->where($key)->exists()) {
                continue;
            }
            $row = $key + ['created_at' => $now, 'updated_at' => $now];
            if (Schema::hasColumn('permissions', 'module')) {
                $row['module'] = $module;
            }
            if (Schema::hasColumn('permissions', 'description')) {
                $row['description'] = $description;
            }
            DB::table('permissions')->insert($row);
        }

        foreach (self::GRANTS as $roleName => $permissions) {
            $roleId = DB::table('roles')->where(['name' => $roleName, 'guard_name' => 'web'])->value('id');
            if (! $roleId) {
                continue;
            }
            foreach ($permissions as $name) {
                $permissionId = DB::table('permissions')->where(['name' => $name, 'guard_name' => 'web'])->value('id');
                $pair = ['role_id' => $roleId, 'permission_id' => $permissionId];
                if ($permissionId && ! DB::table('role_has_permissions')->where($pair)->exists()) {
                    DB::table('role_has_permissions')->insert($pair);
                }
            }
        }

        $this->forgetPermissionCache();
    }

    public function down(): void
    {
        if (! Schema::hasTable('permissions')) {
            return;
        }

        $ids = DB::table('permissions')->whereIn('name', array_keys(self::PERMISSIONS))->where('guard_name', 'web')->pluck('id');
        DB::table('role_has_permissions')->whereIn('permission_id', $ids)->delete();
        if (Schema::hasTable('model_has_permissions')) {
            DB::table('model_has_permissions')->whereIn('permission_id', $ids)->delete();
        }
        DB::table('permissions')->whereIn('id', $ids)->delete();

        $this->forgetPermissionCache();
    }

    private function forgetPermissionCache(): void
    {
        if (class_exists(PermissionRegistrar::class)) {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }
    }
};
