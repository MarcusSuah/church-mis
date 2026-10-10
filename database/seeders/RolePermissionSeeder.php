<?php

namespace Database\Seeders;

use App\Enums\Role as RoleEnum;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * All Church MIS permissions.
     *
     * The permission names here MUST match the permission
     * middleware used by the application routes.
     */
    protected array $permissions = [

        'Dashboard' => [
            'dashboard.view' => 'View dashboard',
        ],
        'Users' => [
            'users.view' => 'View users',
            'users.create' => 'Create users',
            'users.update' => 'Edit users',
            'users.delete' => 'Delete users',
            'users.approve' => 'Approve or reject user sign-ups',
        ],
        'Roles' => [
            'roles.view' => 'View roles',
            'roles.create' => 'Create roles',
            'roles.update' => 'Edit roles',
            'roles.delete' => 'Delete roles',
        ],
        'Permissions' => [
            'permissions.view' => 'View permissions',
            'permissions.create' => 'Create permissions',
            'permissions.update' => 'Edit permissions',
            'permissions.delete' => 'Delete permissions',
        ],
        'Members' => [
            'members.view' => 'View members',
            'members.create' => 'Create members',
            'members.update' => 'Edit members',
            'members.delete' => 'Delete members',
        ],
        'Departments' => [
            'departments.view' => 'View departments',
            'departments.create' => 'Create departments',
            'departments.update' => 'Edit departments',
            'departments.delete' => 'Delete departments',
        ],

        'Attendance' => [
            'attendance.view' => 'View attendance records',
            'attendance.create' => 'Record attendance',
            'attendance.update' => 'Edit attendance records',
            'attendance.delete' => 'Delete attendance records',
        ],

        'Ministries' => [
            'ministries.view' => 'View ministries',
            'ministries.create' => 'Create ministries',
            'ministries.update' => 'Edit ministries',
            'ministries.delete' => 'Delete ministries',
        ],

        'Boards' => [
            'boards.view' => 'View boards and trustees',
            'boards.create' => 'Create boards and trustees',
            'boards.update' => 'Edit boards and trustees',
            'boards.delete' => 'Delete boards and trustees',
        ],

        'Committees' => [
            'committees.view' => 'View committees',
            'committees.create' => 'Create committees',
            'committees.update' => 'Edit committees',
            'committees.delete' => 'Delete committees',
        ],

        'Leadership' => [
            'leadership.view' => 'View church leadership',
            'leadership.create' => 'Create leadership records',
            'leadership.update' => 'Edit leadership records',
            'leadership.delete' => 'Delete leadership records',
        ],

        'Events' => [
            'events.view' => 'View events',
            'events.create' => 'Create events',
            'events.update' => 'Edit events',
            'events.delete' => 'Delete events',
        ],

        'Sermons' => [
            'sermons.view' => 'View sermons',
            'sermons.create' => 'Create sermons',
            'sermons.update' => 'Edit sermons',
            'sermons.delete' => 'Delete sermons',
        ],

        'Announcements' => [
            'announcements.view' => 'View announcements',
            'announcements.create' => 'Create announcements',
            'announcements.update' => 'Edit announcements',
            'announcements.delete' => 'Delete announcements',
        ],

        'Prayer Requests' => [
            'prayer-requests.view' => 'View prayer requests',
            'prayer-requests.create' => 'Create prayer requests',
            'prayer-requests.update' => 'Edit prayer requests',
            'prayer-requests.delete' => 'Delete prayer requests',
        ],

        'Pastoral Care' => [
            'pastoral-care.view' => 'View pastoral care records',
            'pastoral-care.create' => 'Create pastoral care records',
            'pastoral-care.update' => 'Edit pastoral care records',
            'pastoral-care.delete' => 'Delete pastoral care records',
            'pastoral-care.confidential' => 'See pastoral care cases marked confidential',
        ],

        'Finance' => [
            'finance.view' => 'View financial management',
            'finance.create' => 'Create financial records',
            'finance.update' => 'Edit financial records',
            'finance.delete' => 'Delete financial records',
        ],

        'Tithes' => [
            'tithes.view' => 'View tithes',
            'tithes.create' => 'Record tithes',
            'tithes.update' => 'Edit tithes',
            'tithes.delete' => 'Delete tithes',
        ],

        'Offerings' => [
            'offerings.view' => 'View offerings',
            'offerings.create' => 'Record offerings',
            'offerings.update' => 'Edit offerings',
            'offerings.delete' => 'Delete offerings',
        ],

        'Donations' => [
            'donations.view' => 'View donations',
            'donations.create' => 'Record donations',
            'donations.update' => 'Edit donations',
            'donations.delete' => 'Delete donations',
        ],

        'Expenses' => [
            'expenses.view' => 'View expenses',
            'expenses.create' => 'Create expenses',
            'expenses.update' => 'Edit expenses',
            'expenses.delete' => 'Delete expenses',
        ],

        'Budgets' => [
            'budgets.view' => 'View budgets',
            'budgets.create' => 'Create budgets',
            'budgets.update' => 'Edit budgets',
            'budgets.delete' => 'Delete budgets',
        ],

        'Baptisms' => [
            'baptisms.view' => 'View baptism records',
            'baptisms.create' => 'Create baptism records',
            'baptisms.update' => 'Edit baptism records',
            'baptisms.delete' => 'Delete baptism records',
        ],

        'Communions' => [
            'communions.view' => 'View communion records',
            'communions.create' => 'Create communion records',
            'communions.update' => 'Edit communion records',
            'communions.delete' => 'Delete communion records',
        ],

        'Weddings' => [
            'weddings.view' => 'View wedding records',
            'weddings.create' => 'Create wedding records',
            'weddings.update' => 'Edit wedding records',
            'weddings.delete' => 'Delete wedding records',
        ],

        'Funerals' => [
            'funerals.view' => 'View funeral records',
            'funerals.create' => 'Create funeral records',
            'funerals.update' => 'Edit funeral records',
            'funerals.delete' => 'Delete funeral records',
        ],

        'Documents' => [
            'documents.view' => 'View church documents',
            'documents.create' => 'Upload documents',
            'documents.update' => 'Edit and archive documents',
            'documents.delete' => 'Delete documents',
        ],

        'Church' => [
            'church-settings.manage' => 'Edit church profile, default currency and exchange rate',
            'reports.view' => 'View and print church reports',
            'birthdays.view' => 'View member birthdays',
            'birthdays.send' => 'Send birthday and congratulation messages',
        ],

        'Monitoring' => [
            'audit-logs.view' => 'View the audit log of record changes',
            'activity.view' => 'View user activity, devices and locations',
            'activity.manage' => 'Block/unblock users and IP addresses, sign users out',
        ],

        'Certificates' => [
            'certificates.view' => 'View certificate and document requests',
            'certificates.approve' => 'Approve, reject and issue certificates and documents',
        ],

        'Notifications' => [
            'notifications.create' => 'Send, edit and delete notifications',
        ],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($this->permissions as $module => $items) {
            foreach ($items as $name => $description) {
                Permission::firstOrCreate(
                    [
                        'name' => $name,
                        'guard_name' => 'web',
                    ],
                    [
                        'module' => $module,
                        'description' => $description,
                    ],
                );
            }
        }

        foreach (RoleEnum::cases() as $role) {
            Role::firstOrCreate(
                [
                    'name' => $role->value,
                    'guard_name' => 'web',
                ]
            );
        }

        Role::where(
            'name',
            RoleEnum::SUPERADMIN->value
        )->first()?->syncPermissions(
            Permission::where('guard_name', 'web')->get()
        );

        Role::where(
            'name',
            RoleEnum::ADMIN->value
        )->first()?->syncPermissions([
            'dashboard.view',
            'notifications.create',
            'certificates.view',
            'certificates.approve',
            'documents.view', 'documents.create', 'documents.update',
            'reports.view', 'birthdays.view', 'birthdays.send',
            'documents.view', 'documents.create', 'documents.update',
            'reports.view', 'birthdays.view', 'birthdays.send', 'documents.delete',
            'audit-logs.view', 'activity.view', 'activity.manage',
            'church-settings.manage', 'reports.view', 'birthdays.view', 'birthdays.send',
            // Users
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            // Members
            'members.view',
            'members.create',
            'members.update',
            'members.delete',
            // Church structure
            'departments.view',
            'departments.create',
            'departments.update',
            'departments.delete',
            'ministries.view',
            'ministries.create',
            'ministries.update',
            'ministries.delete',
            'boards.view',
            'boards.create',
            'boards.update',
            'boards.delete',
            'committees.view',
            'committees.create',
            'committees.update',
            'committees.delete',
            'leadership.view',
            'leadership.create',
            'leadership.update',
            'leadership.delete',
            // Worship
            'attendance.view',
            'attendance.create',
            'attendance.update',
            'attendance.delete',
            'sermons.view',
            'sermons.create',
            'sermons.update',
            'sermons.delete',
            'events.view',
            'events.create',
            'events.update',
            'events.delete',
            'announcements.view',
            'announcements.create',
            'announcements.update',
            'announcements.delete',
            // Pastoral care
            'prayer-requests.view',
            'prayer-requests.create',
            'prayer-requests.update',
            'prayer-requests.delete',
            'pastoral-care.view',
            'pastoral-care.create',
            'pastoral-care.update',
            'pastoral-care.delete',
            // Finance
            'finance.view',
            'finance.create',
            'finance.update',
            'finance.delete',
            'tithes.view',
            'tithes.create',
            'tithes.update',
            'tithes.delete',
            'offerings.view',
            'offerings.create',
            'offerings.update',
            'offerings.delete',
            'donations.view',
            'donations.create',
            'donations.update',
            'donations.delete',
            'expenses.view',
            'expenses.create',
            'expenses.update',
            'expenses.delete',
            'budgets.view',
            'budgets.create',
            'budgets.update',
            'budgets.delete',
            // Sacraments
            'baptisms.view',
            'baptisms.create',
            'baptisms.update',
            'baptisms.delete',
            'communions.view',
            'communions.create',
            'communions.update',
            'communions.delete',
            'weddings.view',
            'weddings.create',
            'weddings.update',
            'weddings.delete',
            'funerals.view',
            'funerals.create',
            'funerals.update',
            'funerals.delete',
        ]);

        Role::where(
            'name',
            RoleEnum::SUPERVISOR->value
        )->first()?->syncPermissions([
            'dashboard.view',
            'members.view',
            'members.create',
            'members.update',
            'departments.view',
            'departments.create',
            'departments.update',
            'ministries.view',
            'ministries.create',
            'ministries.update',
            'attendance.view',
            'attendance.create',
            'attendance.update',
            'events.view',
            'events.create',
            'events.update',
            'announcements.view',
            'announcements.create',
            'announcements.update',
        ]);

        Role::where(
            'name',
            RoleEnum::FINANCEOFFICER->value
        )->first()?->syncPermissions([
            'dashboard.view',
            'members.view',
            'finance.view',
            'finance.create',
            'finance.update',
            'tithes.view',
            'tithes.create',
            'tithes.update',
            'offerings.view',
            'offerings.create',
            'offerings.update',
            'donations.view',
            'donations.create',
            'donations.update',
            'expenses.view',
            'expenses.create',
            'expenses.update',
            'budgets.view',
            'budgets.create',
            'budgets.update',
        ]);

        Role::where(
            'name',
            RoleEnum::PASTOR->value
        )->first()?->syncPermissions([
            'dashboard.view',
            'notifications.create',
            'certificates.view',
            'certificates.approve',
            'documents.view', 'documents.create', 'documents.update',
            'reports.view', 'birthdays.view', 'birthdays.send',
            'members.view',
            'members.update',
            'attendance.view',
            'ministries.view',
            'boards.view',
            'committees.view',
            'leadership.view',
            'events.view',
            'sermons.view',
            'sermons.create',
            'sermons.update',
            'announcements.view',
            'announcements.create',
            'announcements.update',
            'prayer-requests.view',
            'prayer-requests.create',
            'prayer-requests.update',
            'pastoral-care.view',
            'pastoral-care.create',
            'pastoral-care.update',
            'pastoral-care.confidential',
            'baptisms.view',
            'baptisms.create',
            'baptisms.update',
            'communions.view',
            'communions.create',
            'communions.update',
            'weddings.view',
            'weddings.create',
            'weddings.update',
            'funerals.view',
            'funerals.create',
            'funerals.update',
        ]);

        Role::where(
            'name',
            RoleEnum::DEPARTMENTLEADER->value
        )->first()?->syncPermissions([
            'dashboard.view',
            'members.view',
            'departments.view',
            'departments.update',
            'attendance.view',
            'attendance.create',
            'attendance.update',
            'ministries.view',
            'ministries.update',
            'events.view',
            'events.create',
            'events.update',
            'announcements.view',
        ]);

        Role::where(
            'name',
            RoleEnum::MEMBER->value
        )->first()?->syncPermissions([
            // A Member sees only their own record, through the member portal.
            // No staff-page permissions (Phase 2, F02): prayer-requests.view
            // exposed every private request, departments.view and
            // ministries.view exposed member rosters with emails, and the
            // sermons/events/announcements pages show drafts and notes.
            'dashboard.view',
        ]);
    }
}
