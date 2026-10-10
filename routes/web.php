<?php

use App\Http\Controllers\Account\ChangePasswordController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Church\BirthdayController;
use App\Http\Controllers\Church\DashboardController;
use App\Http\Controllers\Church\ReportController;
use App\Http\Controllers\ChurchStructure\BoardController;
use App\Http\Controllers\ChurchStructure\CommitteeController;
use App\Http\Controllers\ChurchStructure\DepartmentController;
use App\Http\Controllers\ChurchStructure\LeadershipController;
use App\Http\Controllers\ChurchStructure\MinistryController;
use App\Http\Controllers\Content\AnnouncementController;
use App\Http\Controllers\Content\DocumentController;
use App\Http\Controllers\Content\EventController;
use App\Http\Controllers\Finance\BudgetController;
use App\Http\Controllers\Finance\DonationController;
use App\Http\Controllers\Finance\ExpenseController;
use App\Http\Controllers\Finance\FinanceController;
use App\Http\Controllers\Finance\FundController;
use App\Http\Controllers\Finance\OfferingController;
use App\Http\Controllers\Finance\TitheController;
use App\Http\Controllers\Members\FamilyController;
use App\Http\Controllers\Members\MemberController;
use App\Http\Controllers\Members\MemberDirectoryController;
use App\Http\Controllers\Members\MemberLookupController;
use App\Http\Controllers\Members\MemberPortalController;
use App\Http\Controllers\Members\PendingRegistrationController;
use App\Http\Controllers\Members\PublicRegistrationController;
use App\Http\Controllers\Sacraments\BaptismController;
use App\Http\Controllers\Sacraments\CertificateController;
use App\Http\Controllers\Sacraments\CommunionController;
use App\Http\Controllers\Sacraments\FuneralController;
use App\Http\Controllers\Sacraments\PastoralCareController;
use App\Http\Controllers\Sacraments\WeddingController;
use App\Http\Controllers\Site\PublicSiteController;
use App\Http\Controllers\System\ActivityController;
use App\Http\Controllers\System\AuditLogController;
use App\Http\Controllers\System\ChurchSettingsController;
use App\Http\Controllers\System\NotificationController;
use App\Http\Controllers\System\UploadController;
use App\Http\Controllers\System\WebsiteController;
use App\Http\Controllers\WorshipCare\AttendanceController;
use App\Http\Controllers\WorshipCare\PrayerRequestController;
use App\Http\Controllers\WorshipCare\SermonController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public church website (no sign-in needed)
|--------------------------------------------------------------------------
*/
Route::controller(PublicSiteController::class)->group(function () {
    Route::get('/', 'home')->name('home');
    Route::get('about', 'about')->name('site.about');
    Route::get('contact', 'contact')->name('site.contact');
    Route::prefix('church')->name('site.')->group(function () {
        Route::get('events', 'events')->name('events');
        Route::get('events/{event}', 'showEvent')->name('events.show');
        Route::get('sermons', 'sermons')->name('sermons');
        Route::get('sermons/{sermon}', 'showSermon')->name('sermons.show');
        Route::get('news', 'announcements')->name('announcements');
        Route::get('news/{announcement}', 'showAnnouncement')->name('announcements.show');
        Route::get('ministries', 'ministries')->name('ministries');
        Route::get('ministries/{ministry}', 'showMinistry')->name('ministries.show');
        Route::get('departments', 'departments')->name('departments');
        Route::get('departments/{department}', 'showDepartment')->name('departments.show');
        Route::get('leadership', 'leadership')->name('leadership');
        Route::get('leadership/{leader}', 'showLeader')->name('leadership.show');
    });
});
Route::middleware(['auth', 'verified', 'permission:website.manage'])->prefix('website-content')->name('website.')->group(function () {
    Route::get('/', [WebsiteController::class, 'index'])->name('index');
    Route::put('content', [WebsiteController::class, 'updateContent'])->name('content');
    Route::post('slides', [WebsiteController::class, 'storeSlide'])->name('slides.store');
    Route::patch('slides/{slide}', [WebsiteController::class, 'updateSlide'])->name('slides.update');
    Route::delete('slides/{slide}', [WebsiteController::class, 'destroySlide'])->name('slides.destroy');
    Route::post('beliefs', [WebsiteController::class, 'storeBelief'])->name('beliefs.store');
    Route::patch('beliefs/{belief}', [WebsiteController::class, 'updateBelief'])->name('beliefs.update');
    Route::delete('beliefs/{belief}', [WebsiteController::class, 'destroyBelief'])->name('beliefs.destroy');
});
/*
|--------------------------------------------------------------------------
| Public member registration (no login required)
|--------------------------------------------------------------------------
*/
Route::get('public-member-registration', [PublicRegistrationController::class, 'create'])
    ->name('public-registration.create');
Route::post('public-member-registration', [PublicRegistrationController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('public-registration.store');

Route::middleware(['auth', 'verified'])->group(function () {
    /*
    |--------------------------------------------------------------------------
    | Staff dashboard — Member-only users are bounced to their portal
    |--------------------------------------------------------------------------
    */
    Route::get('dashboard', DashboardController::class)
        ->middleware('redirect.members')
        ->name('dashboard');

    /*
    |--------------------------------------------------------------------------
    | Member portal (self-service, any signed-in user)
    |--------------------------------------------------------------------------
    */
    Route::prefix('member-portal')->name('member.portal')->group(function () {
        Route::get('/', [MemberPortalController::class, 'show']);
        Route::post('profile', [MemberPortalController::class, 'store'])->name('.store');
        Route::patch('profile', [MemberPortalController::class, 'update'])->name('.update');
        Route::post('prayer-requests', [MemberPortalController::class, 'storePrayerRequest'])->name('.prayer');
        Route::post('document-requests', [MemberPortalController::class, 'storeDocumentRequest'])->name('.document');
        Route::get('documents/{documentRequest}/download', [MemberPortalController::class, 'downloadDocument'])->name('.document.download');
        Route::get('baptism-certificate/{baptism}', [MemberPortalController::class, 'baptismCertificate'])->name('.baptism-certificate');
        Route::get('marriage-certificate/{wedding}', [MemberPortalController::class, 'marriageCertificate'])->name('.marriage-certificate');
        Route::get('giving-statement', [MemberPortalController::class, 'givingStatement'])->name('.giving-statement');
    });
    Route::get('my-portal', fn () => redirect('/member-portal'));

    /*
    |--------------------------------------------------------------------------
    | Account — change password (members start on the default password)
    |--------------------------------------------------------------------------
    */
    Route::get('change-password', [ChangePasswordController::class, 'show'])->name('password.change');
    Route::put('change-password', [ChangePasswordController::class, 'update'])
        ->middleware('throttle:6,1')->name('password.change.update');

    /*
    |--------------------------------------------------------------------------
    | Worship & Care — Pastoral Care; Sacraments — Baptism, Communion, Weddings, Funerals
    |--------------------------------------------------------------------------
    */
    foreach ([
        'pastoral-care' => [PastoralCareController::class, 'pastoral-care'],
        'baptisms' => [BaptismController::class, 'baptisms'],
        'communions' => [CommunionController::class, 'communions'],
        'weddings' => [WeddingController::class, 'weddings'],
        'funerals' => [FuneralController::class, 'funerals'],
        'tithes' => [TitheController::class, 'tithes'],
        'offerings' => [OfferingController::class, 'offerings'],
        'donations' => [DonationController::class, 'donations'],
        'expenses' => [ExpenseController::class, 'expenses'],
        'budgets' => [BudgetController::class, 'budgets'],
        'events' => [EventController::class, 'events'],
        'announcements' => [AnnouncementController::class, 'announcements'],
        'documents' => [DocumentController::class, 'documents'],
    ] as $uri => [$controller, $perm]) {
        Route::get($uri, [$controller, 'index'])->middleware("permission:{$perm}.view")->name("{$uri}.index");
        Route::post($uri, [$controller, 'store'])->middleware("permission:{$perm}.create")->name("{$uri}.store");
        Route::patch("{$uri}/{id}", [$controller, 'update'])->middleware("permission:{$perm}.update")->name("{$uri}.update");
        Route::delete("{$uri}/{id}", [$controller, 'destroy'])->middleware("permission:{$perm}.delete")->name("{$uri}.destroy");
    }
    Route::patch('pastoral-care/{id}/status', [PastoralCareController::class, 'status'])
        ->middleware('permission:pastoral-care.update')->name('pastoral-care.status');
    Route::patch('expenses/{id}/status', [ExpenseController::class, 'status'])->middleware('permission:expenses.update')->name('expenses.status');
    Route::patch('announcements/{id}/toggle', [AnnouncementController::class, 'toggle'])->middleware('permission:announcements.update')->name('announcements.toggle');
    Route::patch('documents/{id}/archive', [DocumentController::class, 'archive'])->middleware('permission:documents.update')->name('documents.archive');
    Route::get('documents/{id}/download', [DocumentController::class, 'download'])->name('documents.download');

    /*
    |--------------------------------------------------------------------------
    | Finance overview, funds, receipts
    |--------------------------------------------------------------------------
    */
    Route::get('finance-management', [FinanceController::class, 'index'])->middleware('permission:finance.view')->name('finance.index');
    Route::get('finance-management/export', [FinanceController::class, 'export'])->middleware('permission:finance.view')->name('finance.export');
    Route::get('finance-management/receipts', [FinanceController::class, 'receipts'])->middleware('permission:finance.view')->name('finance.receipts');
    Route::post('funds', [FundController::class, 'store'])->middleware('permission:finance.create')->name('funds.store');
    Route::patch('funds/{id}', [FundController::class, 'update'])->middleware('permission:finance.update')->name('funds.update');
    Route::delete('funds/{id}', [FundController::class, 'destroy'])->middleware('permission:finance.delete')->name('funds.destroy');

    /*
    |--------------------------------------------------------------------------
    | System — audit logs, activity log & access control
    |--------------------------------------------------------------------------
    */
    /*
    |--------------------------------------------------------------------------
    | Reports, birthdays & church settings
    |--------------------------------------------------------------------------
    */
    Route::middleware('permission:reports.view')->group(function () {
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/pdf', [ReportController::class, 'pdf'])->name('reports.pdf');
        Route::get('reports/export', [ReportController::class, 'export'])->name('reports.export');
    });
    Route::get('birthdays', [BirthdayController::class, 'index'])->middleware('permission:birthdays.view')->name('birthdays.index');
    Route::post('birthdays/send', [BirthdayController::class, 'send'])->middleware('permission:birthdays.send')->name('birthdays.send');
    Route::middleware('permission:church-settings.manage')->group(function () {
        Route::get('church-settings', [ChurchSettingsController::class, 'edit'])->name('church-settings.edit');
        Route::put('church-settings', [ChurchSettingsController::class, 'update'])->name('church-settings.update');
    });

    Route::middleware('permission:audit-logs.view')->group(function () {
        Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
        Route::get('audit-logs/export', [AuditLogController::class, 'export'])->name('audit-logs.export');
    });
    Route::middleware('permission:activity.view')->group(function () {
        Route::get('activity-logs', [ActivityController::class, 'index'])->name('activity.index');
        Route::get('activity-logs/export', [ActivityController::class, 'export'])->name('activity.export');
    });
    Route::middleware('permission:activity.manage')->prefix('activity-logs')->name('activity.')->group(function () {
        Route::post('users/{user}/block', [ActivityController::class, 'blockUser'])->name('users.block');
        Route::post('users/{user}/unblock', [ActivityController::class, 'unblockUser'])->name('users.unblock');
        Route::post('users/{user}/sign-out', [ActivityController::class, 'signOut'])->name('users.sign-out');
        Route::post('blocked-ips', [ActivityController::class, 'blockIp'])->name('ips.block');
        Route::delete('blocked-ips/{blockedIp}', [ActivityController::class, 'unblockIp'])->name('ips.unblock');
    });

    /*
    |--------------------------------------------------------------------------
    | Certificates & document requests (approve → PDF → member downloads)
    |--------------------------------------------------------------------------
    */
    Route::middleware('permission:certificates.view')->prefix('certificates')->name('certificates.')->group(function () {
        Route::get('/', [CertificateController::class, 'index'])->name('index');
        Route::get('requests/{documentRequest}/pdf', [CertificateController::class, 'requestPdf'])->name('requests.pdf');
        Route::get('baptisms/{baptism}/pdf', [CertificateController::class, 'baptismPdf'])->name('baptisms.pdf');
        Route::get('weddings/{wedding}/pdf', [CertificateController::class, 'weddingPdf'])->name('weddings.pdf');
        Route::middleware('permission:certificates.approve')->group(function () {
            Route::post('requests/{documentRequest}/approve', [CertificateController::class, 'approve'])->name('requests.approve');
            Route::post('requests/{documentRequest}/reject', [CertificateController::class, 'reject'])->name('requests.reject');
            Route::post('requests/{documentRequest}/collected', [CertificateController::class, 'collected'])->name('requests.collected');
            Route::post('baptisms/{baptism}/issue', [CertificateController::class, 'issueBaptism'])->name('baptisms.issue');
            Route::post('weddings/{wedding}/issue', [CertificateController::class, 'issueWedding'])->name('weddings.issue');
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Notifications
    |--------------------------------------------------------------------------
    */
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('notifications/{notification}/toggle-read', [NotificationController::class, 'toggleRead'])->name('notifications.toggle-read');
    Route::middleware('permission:notifications.create')->group(function () {
        Route::post('notifications', [NotificationController::class, 'store'])->name('notifications.store');
        Route::patch('notifications/{notification}', [NotificationController::class, 'update'])->name('notifications.update');
        Route::delete('notifications/{notification}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    });
    Route::middleware('permission:members.view')->group(function () {
        Route::get('member-directory', [MemberDirectoryController::class, 'index'])->name('member-directory.index');
        Route::get('member-directory/export', [MemberDirectoryController::class, 'export'])->name('member-directory.export');
    });
    // Type-ahead member picker (staff only; at most 20 results).
    Route::get('lookup/members', MemberLookupController::class)
        ->middleware('throttle:120,1')
        ->name('lookup.members');
    Route::post('uploads/image', [UploadController::class, 'image'])
        ->middleware('throttle:30,1')
        ->name('uploads.image');
    /*
    | Families
    */
    Route::middleware('permission:members.view')->group(function () {
        Route::get('families', [FamilyController::class, 'index'])->name('families.index');
        Route::get('families/export', [FamilyController::class, 'export'])->name('families.export');
    });
    Route::middleware('permission:members.update')->group(function () {
        Route::post('families', [FamilyController::class, 'store'])->name('families.store');
        Route::patch('families/{family}', [FamilyController::class, 'update'])->name('families.update');
        Route::post('families/{family}/members', [FamilyController::class, 'addMember'])->name('families.members.store');
        Route::patch('families/{family}/members/{familyMember}', [FamilyController::class, 'updateMember'])->name('families.members.update');
        Route::post('families/{family}/members/{familyMember}/head', [FamilyController::class, 'makeHead'])->name('families.members.head');
        Route::delete('families/{family}/members/{familyMember}', [FamilyController::class, 'removeMember'])->name('families.members.destroy');
    });
    Route::delete('families/{family}', [FamilyController::class, 'destroy'])
        ->middleware('permission:members.delete')->name('families.destroy');
    /*
    |--------------------------------------------------------------------------
    | Member management
    |--------------------------------------------------------------------------
    | Static paths (bulk-*) are registered before {member} so they are never
    | captured by the wildcard.
    */
    Route::get('member-management', [MemberController::class, 'index'])
        ->middleware('permission:members.view')
        ->name('members.index');

    Route::get('member-management/export', [MemberController::class, 'export'])
        ->middleware('permission:members.view')
        ->name('members.export');

    Route::get('pending-registrations', [PendingRegistrationController::class, 'index'])
        ->middleware('permission:members.view')
        ->name('pending-registrations.index');

    Route::middleware('permission:members.create')->group(function () {
        Route::post('member-management', [MemberController::class, 'store'])->name('members.store');
        Route::post('member-management/import', [MemberController::class, 'import'])->name('members.import');
    });

    Route::middleware('permission:members.update')->group(function () {
        Route::post('member-management/bulk-status', [MemberController::class, 'bulkStatus'])
            ->name('members.bulk-status');
        Route::patch('member-management/{member}', [MemberController::class, 'update'])
            ->name('members.update');
        Route::patch('member-management/{member}/status', [MemberController::class, 'updateStatus'])
            ->name('members.status');
        Route::patch('member-management/{member}/assignment', [MemberController::class, 'assign'])
            ->name('members.assign');
    });

    Route::middleware('permission:members.delete')->group(function () {
        Route::post('member-management/bulk-delete', [MemberController::class, 'bulkDestroy'])
            ->name('members.bulk-destroy');
        Route::delete('member-management/{member}', [MemberController::class, 'destroy'])
            ->name('members.destroy');
    });
    /*
|--------------------------------------------------------------------------
| Church structure — Departments
|--------------------------------------------------------------------------
*/
    Route::get('departments', [DepartmentController::class, 'index'])
        ->middleware('permission:departments.view')->name('departments.index');
    Route::post('departments', [DepartmentController::class, 'store'])
        ->middleware('permission:departments.create')->name('departments.store');
    Route::delete('departments/{department}', [DepartmentController::class, 'destroy'])
        ->middleware('permission:departments.delete')->name('departments.destroy');
    Route::middleware('permission:departments.update')->prefix('departments/{department}')->name('departments.')->group(function () {
        Route::patch('/', [DepartmentController::class, 'update'])->name('update');
        Route::post('leader', [DepartmentController::class, 'setLeader'])->name('leader');
        Route::post('members', [DepartmentController::class, 'addMember'])->name('members.store');
        Route::patch('members/{departmentMember}', [DepartmentController::class, 'updateMember'])->name('members.update');
        Route::delete('members/{departmentMember}', [DepartmentController::class, 'removeMember'])->name('members.destroy');
        Route::post('activities', [DepartmentController::class, 'storeActivity'])->name('activities.store');
        Route::delete('activities/{activity}', [DepartmentController::class, 'destroyActivity'])->name('activities.destroy');
    });
    /*
|--------------------------------------------------------------------------
| Church structure — Ministries
|--------------------------------------------------------------------------
*/
    Route::get('ministries', [MinistryController::class, 'index'])
        ->middleware('permission:ministries.view')->name('ministries.index');
    Route::post('ministries', [MinistryController::class, 'store'])
        ->middleware('permission:ministries.create')->name('ministries.store');
    Route::delete('ministries/{ministry}', [MinistryController::class, 'destroy'])
        ->middleware('permission:ministries.delete')->name('ministries.destroy');
    Route::middleware('permission:ministries.update')->prefix('ministries/{ministry}')->name('ministries.')->group(function () {
        Route::patch('/', [MinistryController::class, 'update'])->name('update');
        Route::post('leader', [MinistryController::class, 'setLeader'])->name('leader');
        Route::post('members', [MinistryController::class, 'addMember'])->name('members.store');
        Route::patch('members/{ministryMember}', [MinistryController::class, 'updateMember'])->name('members.update');
        Route::delete('members/{ministryMember}', [MinistryController::class, 'removeMember'])->name('members.destroy');
    });
    /*
|--------------------------------------------------------------------------
| Church structure — Boards & Trustees
|--------------------------------------------------------------------------
*/
    Route::get('boards', [BoardController::class, 'index'])
        ->middleware('permission:boards.view')->name('boards.index');
    Route::post('boards', [BoardController::class, 'store'])
        ->middleware('permission:boards.create')->name('boards.store');
    Route::delete('boards/{board}', [BoardController::class, 'destroy'])
        ->middleware('permission:boards.delete')->name('boards.destroy');
    Route::middleware('permission:boards.update')->prefix('boards/{board}')->name('boards.')->group(function () {
        Route::patch('/', [BoardController::class, 'update'])->name('update');
        Route::post('chair', [BoardController::class, 'setChair'])->name('chair');
        Route::post('members', [BoardController::class, 'addMember'])->name('members.store');
        Route::patch('members/{boardMember}', [BoardController::class, 'updateMember'])->name('members.update');
        Route::delete('members/{boardMember}', [BoardController::class, 'removeMember'])->name('members.destroy');
    });
    /*
|--------------------------------------------------------------------------
| Church structure — Committees
|--------------------------------------------------------------------------
*/
    Route::get('committees', [CommitteeController::class, 'index'])
        ->middleware('permission:committees.view')->name('committees.index');
    Route::post('committees', [CommitteeController::class, 'store'])
        ->middleware('permission:committees.create')->name('committees.store');
    Route::delete('committees/{committee}', [CommitteeController::class, 'destroy'])
        ->middleware('permission:committees.delete')->name('committees.destroy');
    Route::middleware('permission:committees.update')->prefix('committees/{committee}')->name('committees.')->group(function () {
        Route::patch('/', [CommitteeController::class, 'update'])->name('update');
        Route::post('chair', [CommitteeController::class, 'setChair'])->name('chair');
        Route::post('members', [CommitteeController::class, 'addMember'])->name('members.store');
        Route::patch('members/{committeeMember}', [CommitteeController::class, 'updateMember'])->name('members.update');
        Route::delete('members/{committeeMember}', [CommitteeController::class, 'removeMember'])->name('members.destroy');
    });

    /*
|--------------------------------------------------------------------------
| Church structure — Leadership
|--------------------------------------------------------------------------
*/
    Route::get('leadership', [LeadershipController::class, 'index'])
        ->middleware('permission:leadership.view')->name('leadership.index');
    Route::post('leadership', [LeadershipController::class, 'store'])
        ->middleware('permission:leadership.create')->name('leadership.store');
    Route::patch('leadership/{leader}', [LeadershipController::class, 'update'])
        ->middleware('permission:leadership.update')->name('leadership.update');
    Route::delete('leadership/{leader}', [LeadershipController::class, 'destroy'])
        ->middleware('permission:leadership.delete')->name('leadership.destroy');
    /*
|--------------------------------------------------------------------------
| Worship & Care — Attendance
|--------------------------------------------------------------------------
*/
    Route::get('attendance', [AttendanceController::class, 'index'])
        ->middleware('permission:attendance.view')->name('attendance.index');
    Route::post('attendance/sessions', [AttendanceController::class, 'store'])
        ->middleware('permission:attendance.create')->name('attendance.sessions.store');
    Route::middleware('permission:attendance.update')->group(function () {
        Route::patch('attendance/sessions/{session}', [AttendanceController::class, 'update'])->name('attendance.sessions.update');
        Route::post('attendance/sessions/{session}/mark', [AttendanceController::class, 'mark'])->name('attendance.sessions.mark');
        Route::post('attendance/sessions/{session}/mark-remaining', [AttendanceController::class, 'markRemaining'])->name('attendance.sessions.mark-remaining');
    });
    Route::delete('attendance/sessions/{session}', [AttendanceController::class, 'destroy'])
        ->middleware('permission:attendance.delete')->name('attendance.sessions.destroy');
    /*
|--------------------------------------------------------------------------
| Worship & Care — Sermons
|--------------------------------------------------------------------------
*/
    Route::middleware('permission:sermons.view')->group(function () {
        Route::get('sermons', [SermonController::class, 'index'])->name('sermons.index');
        Route::post('sermons/{sermon}/view', [SermonController::class, 'recordView'])->name('sermons.view');
    });
    Route::post('sermons', [SermonController::class, 'store'])
        ->middleware('permission:sermons.create')->name('sermons.store');
    Route::patch('sermons/{sermon}', [SermonController::class, 'update'])
        ->middleware('permission:sermons.update')->name('sermons.update');
    Route::delete('sermons/{sermon}', [SermonController::class, 'destroy'])
        ->middleware('permission:sermons.delete')->name('sermons.destroy');
    /*
|--------------------------------------------------------------------------
| Worship & Care — Prayer Requests
|--------------------------------------------------------------------------
*/
    Route::middleware('permission:prayer-requests.view')->group(function () {
        Route::get('prayer-requests', [PrayerRequestController::class, 'index'])->name('prayer-requests.index');
        Route::post('prayer-requests/{prayerRequest}/pray', [PrayerRequestController::class, 'pray'])->name('prayer-requests.pray');
    });
    Route::post('prayer-requests', [PrayerRequestController::class, 'store'])
        ->middleware('permission:prayer-requests.create')->name('prayer-requests.store');
    Route::middleware('permission:prayer-requests.update')->group(function () {
        Route::patch('prayer-requests/{prayerRequest}', [PrayerRequestController::class, 'update'])->name('prayer-requests.update');
        Route::patch('prayer-requests/{prayerRequest}/status', [PrayerRequestController::class, 'status'])->name('prayer-requests.status');
    });
    Route::delete('prayer-requests/{prayerRequest}', [PrayerRequestController::class, 'destroy'])
        ->middleware('permission:prayer-requests.delete')->name('prayer-requests.destroy');
    /*
    |--------------------------------------------------------------------------
    | Administration
    |--------------------------------------------------------------------------
    | Permission names here must match RolePermissionSeeder exactly — the old
    | users.edit / roles.manage / permissions.manage names were never seeded,
    | so only the Super Admin (who bypasses checks) could use these routes.
    */
    Route::prefix('admin')->name('admin.')->group(function () {
        // Users
        Route::middleware('permission:users.view')->group(function () {
            Route::get('/users', [UserController::class, 'index'])->name('users.index');
            Route::get('/users/pending', [UserController::class, 'pending'])->name('users.pending');
            Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
        });
        Route::middleware('permission:users.update')->group(function () {
            Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
            Route::post('/users/{user}/activate', [UserController::class, 'activate'])->name('users.activate');
            Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
        });
        Route::middleware('permission:users.approve')->group(function () {
            Route::post('/users/{user}/approve', [UserController::class, 'approve'])->name('users.approve');
            Route::post('/users/{user}/reject', [UserController::class, 'reject'])->name('users.reject');
        });
        Route::delete('/users/{user}', [UserController::class, 'destroy'])
            ->middleware('permission:users.delete')
            ->name('users.destroy');

        // Roles
        Route::get('/roles', [RoleController::class, 'index'])
            ->middleware('permission:roles.view')->name('roles.index');
        Route::post('/roles', [RoleController::class, 'store'])
            ->middleware('permission:roles.create')->name('roles.store');
        Route::put('/roles/{role}', [RoleController::class, 'update'])
            ->middleware('permission:roles.update')->name('roles.update');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])
            ->middleware('permission:roles.delete')->name('roles.destroy');

        // Permissions
        Route::get('/permissions', [PermissionController::class, 'index'])
            ->middleware('permission:permissions.view')->name('permissions.index');

        Route::post('/permissions', [PermissionController::class, 'store'])
            ->middleware('permission:permissions.create')->name('permissions.store');
        Route::put('/permissions/{permission}', [PermissionController::class, 'update'])
            ->middleware('permission:permissions.update')->name('permissions.update');
        Route::delete('/permissions/{permission}', [PermissionController::class, 'destroy'])
            ->middleware('permission:permissions.delete')->name('permissions.destroy');
    });
});

require __DIR__.'/settings.php';
