<?php

namespace Database\Seeders;

use App\Enums\Role as RoleEnum;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::firstOrCreate(
            [
                'email' => 'admin@ssbcms.test',
            ],
            [
                'name' => 'System Administrator',

                'password' => Hash::make(
                    config(
                        'app.default_admin_password',
                        'ChangeMe123!'
                    )
                ),

                'status' => UserStatus::APPROVED,
                'is_active' => true,
                'must_change_credentials' => true,
                'email_verified_at' => now(),
            ],
        );

        $admin->syncRoles([
            RoleEnum::SUPERADMIN->value,
        ]);
    }
}
