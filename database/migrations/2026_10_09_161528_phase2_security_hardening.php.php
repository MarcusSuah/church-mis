<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2 security fixes that live in data, not code:
 *
 *  F02 — The Member role loses every staff-page permission. Members see their
 *        own data through the member portal only. (Before: any self-registered
 *        user could read all private prayer requests and member rosters.)
 *  F02 — Existing staff accounts are marked email-verified, so turning on
 *        MustVerifyEmail does not lock trusted staff out on deploy.
 *  F04 — New permission `pastoral-care.confidential`: only holders see cases
 *        marked confidential. Given to the Pastor role (Superadmin bypasses).
 *
 * The seeder (RolePermissionSeeder) is updated to match for fresh installs.
 */
return new class extends Migration
{
    /** Member role keeps only this. */
    private const MEMBER_KEEPS = ['dashboard.view'];

    /** What the Member role had before this migration (restored by down()). */
    private const MEMBER_HAD = [
        'dashboard.view', 'departments.view', 'ministries.view', 'events.view', 'sermons.view',
        'announcements.view', 'prayer-requests.view', 'prayer-requests.create',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('permissions') || ! Schema::hasTable('roles')) {
            return;
        }

        $now = now();

        // F04: confidential pastoral care permission.
        $permissionData = ['name' => 'pastoral-care.confidential', 'guard_name' => 'web'];
        if (! DB::table('permissions')->where($permissionData)->exists()) {
            $row = $permissionData + ['created_at' => $now, 'updated_at' => $now];
            if (Schema::hasColumn('permissions', 'module')) {
                $row['module'] = 'Pastoral Care';
            }
            if (Schema::hasColumn('permissions', 'description')) {
                $row['description'] = 'See pastoral care cases marked confidential';
            }
            DB::table('permissions')->insert($row);
        }
        $confidentialId = DB::table('permissions')->where($permissionData)->value('id');

        foreach (['Pastor', 'Superadmin'] as $roleName) {
            $roleId = DB::table('roles')->where(['name' => $roleName, 'guard_name' => 'web'])->value('id');
            if ($roleId && ! DB::table('role_has_permissions')->where(['role_id' => $roleId, 'permission_id' => $confidentialId])->exists()) {
                DB::table('role_has_permissions')->insert(['role_id' => $roleId, 'permission_id' => $confidentialId]);
            }
        }

        // F02: strip staff-page permissions from the Member role.
        $memberRoleId = DB::table('roles')->where(['name' => 'Member', 'guard_name' => 'web'])->value('id');
        if ($memberRoleId) {
            $keepIds = DB::table('permissions')->whereIn('name', self::MEMBER_KEEPS)->pluck('id');
            DB::table('role_has_permissions')
                ->where('role_id', $memberRoleId)
                ->whereNotIn('permission_id', $keepIds)
                ->delete();
        }

        // F02: trusted staff (any role other than Member) count as verified.
        if (Schema::hasTable('model_has_roles') && Schema::hasTable('users')) {
            $staffRoleIds = DB::table('roles')->where('name', '!=', 'Member')->pluck('id');
            $staffUserIds = DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->whereIn('role_id', $staffRoleIds)
                ->pluck('model_id');

            DB::table('users')
                ->whereIn('id', $staffUserIds)
                ->whereNull('email_verified_at')
                ->update(['email_verified_at' => $now]);
        }

        $this->forgetPermissionCache();
    }

    public function down(): void
    {
        if (! Schema::hasTable('permissions') || ! Schema::hasTable('roles')) {
            return;
        }

        $memberRoleId = DB::table('roles')->where(['name' => 'Member', 'guard_name' => 'web'])->value('id');
        if ($memberRoleId) {
            foreach (DB::table('permissions')->whereIn('name', self::MEMBER_HAD)->pluck('id') as $pid) {
                DB::table('role_has_permissions')->insertOrIgnore(['role_id' => $memberRoleId, 'permission_id' => $pid]);
            }
        }

        $pid = DB::table('permissions')->where(['name' => 'pastoral-care.confidential', 'guard_name' => 'web'])->value('id');
        if ($pid) {
            DB::table('role_has_permissions')->where('permission_id', $pid)->delete();
            DB::table('model_has_permissions')->where('permission_id', $pid)->delete();
            DB::table('permissions')->where('id', $pid)->delete();
        }

        // Email verification timestamps are left as they are.
        $this->forgetPermissionCache();
    }

    private function forgetPermissionCache(): void
    {
        try {
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        } catch (\Throwable) {
            // Cache store not available during some installs; the 24h cache expiry covers it.
        }
    }
};
