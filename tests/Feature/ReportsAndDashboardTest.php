<?php

/*
 * Dashboard board count and activity feed, baptism validation, offering
 * service sessions, cash references, and the report charts / ledger /
 * approvals / PDF.
 */

use App\Enums\Role as RoleEnum;
use App\Models\AttendanceSession;
use App\Models\AuditLog;
use App\Models\Board;
use App\Models\BoardMember;
use App\Models\Donation;
use App\Models\Event;
use App\Models\Expense;
use App\Models\GalleryAlbum;
use App\Models\Member;
use App\Models\Offering;
use App\Models\ReportSignature;
use App\Models\Tithe;
use App\Models\User;
use App\Models\UserActivity;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::ADMIN->value));
});

function staffWith(RoleEnum $role): User
{
    return tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole($role->value));
}

function offeringInput(array $overrides = []): array
{
    return [
        'is_collection' => true, 'amount' => 50, 'currency' => 'USD', 'payment_method' => 'cash',
        'offering_type' => 'Regular Offering', 'service_type' => 'Sunday Worship', 'service_session' => 'first_service',
        'offering_date' => now()->toDateString(), 'counted_by' => 'Cashier One', ...$overrides,
    ];
}

/* ------------------------------------------------------------- dashboard */

test('the dashboard counts active boards and the people serving on them once each', function () {
    [$ama, $kojo] = collect(['Ama', 'Kojo'])->map(fn ($n) => Member::create(['first_name' => $n, 'last_name' => 'Doe', 'status' => 'Active']))->all();
    $trustees = Board::create(['name' => 'Trustees', 'is_active' => true]);
    $deacons = Board::create(['name' => 'Deacons', 'is_active' => true]);
    $retired = Board::create(['name' => 'Old Board', 'is_active' => false]);
    BoardMember::create(['board_id' => $trustees->id, 'member_id' => $ama->id, 'role' => 'Member']);
    BoardMember::create(['board_id' => $deacons->id, 'member_id' => $ama->id, 'role' => 'Member']);
    BoardMember::create(['board_id' => $retired->id, 'member_id' => $kojo->id, 'role' => 'Member']);

    $this->actingAs($this->admin)->get('/dashboard')->assertInertia(fn (Assert $p) => $p
        ->where('quick.boards', 2)
        ->where('quick.board_members', 1));
});

test('recent activity merges record changes, exports and sign-ins, and hides sign-ins from staff without the activity log', function () {
    // Seeding roles writes many audit rows in the same second; these actions come after them.
    $this->travel(1)->minutes();
    Member::create(['first_name' => 'Ama', 'last_name' => 'Doe', 'status' => 'Active']);
    UserActivity::create(['user_id' => $this->admin->id, 'user_name' => $this->admin->name, 'email' => $this->admin->email, 'event' => 'login_failed', 'description' => 'Failed sign-in for someone@example.test']);
    $this->actingAs($this->admin)->get('/reports/export?type=membership&range=this_month&format=csv')->assertOk();

    $this->actingAs($this->admin)->get('/dashboard')->assertInertia(fn (Assert $p) => $p
        ->where('activity', fn ($items) => collect($items)->pluck('action')->unique()->intersect(['CREATE', 'EXPORT', 'LOGIN_FAILED'])->count() === 3));

    $pastor = staffWith(RoleEnum::PASTOR);
    $this->actingAs($pastor)->get('/dashboard')->assertInertia(fn (Assert $p) => $p
        ->where('activity', fn ($items) => ! collect($items)->contains('action', 'LOGIN_FAILED')));
});

test('downloading a report is written to the audit log', function () {
    $this->actingAs($this->admin)->get('/reports/export?type=finance&range=this_year&format=csv')->assertOk();

    expect(AuditLog::where('action', 'EXPORT')->where('module', 'Reports')->value('description'))
        ->toBe('Downloaded reports export (finance, this_year, csv)');
});

/* -------------------------------------------------------------- baptisms */

test('every baptism field is required except the certificate number, with a message for each', function () {
    $this->actingAs($this->admin)->post('/baptisms', ['certificate_issued' => true])
        ->assertSessionHasErrors([
            'candidate_name' => 'Enter the full name of the person being baptized.',
            'candidate_photo', 'baptism_date', 'baptism_type', 'officiant', 'location', 'witnesses', 'notes',
            'certificate_date' => 'Choose the date the certificate was issued.',
        ])
        ->assertSessionDoesntHaveErrors('certificate_number');

    $this->actingAs($this->admin)->post('/baptisms', [
        'candidate_name' => 'Ama Doe', 'candidate_photo' => '/storage/photos/ama.jpg', 'baptism_date' => now()->toDateString(),
        'baptism_type' => 'immersion', 'officiant' => 'Rev. Mensah', 'location' => 'Main chapel', 'witnesses' => 'Kojo, Esi',
        'certificate_issued' => false, 'notes' => 'Sunday service',
    ])->assertSessionHasNoErrors();
});

test('a baptism cannot be dated in the future', function () {
    $this->actingAs($this->admin)->post('/baptisms', ['baptism_date' => now()->addDay()->toDateString()])
        ->assertSessionHasErrors(['baptism_date' => 'The baptism date cannot be in the future.']);
});

/* ------------------------------------------------------------- offerings */

test('a Sunday Worship offering records its service session and the table shows it', function () {
    $this->actingAs($this->admin)->post('/offerings', offeringInput(['service_session' => null]))
        ->assertSessionHasErrors(['service_session' => 'Choose which Sunday service (1st or 2nd) this offering came from.']);

    $this->actingAs($this->admin)->post('/offerings', offeringInput(['service_session' => 'second_service']))->assertSessionHasNoErrors();

    $this->actingAs($this->admin)->get('/offerings')->assertInertia(fn (Assert $p) => $p
        ->where('records.0.service_session', 'second_service')
        ->where('records.0.service_label', 'Sunday Worship — 2nd Service')
        ->where('records.0.member_name', 'Service collection — Sunday Worship — 2nd Service')
        ->where('serviceSessions', ['first_service' => '1st Service', 'second_service' => '2nd Service'])
        ->has('services', 6));
});

test('services other than Sunday Worship have no session', function () {
    $this->actingAs($this->admin)->post('/offerings', offeringInput(['service_type' => 'Bible Study', 'service_session' => 'first_service']))->assertSessionHasNoErrors();

    expect(Offering::first()->service_session)->toBeNull();
});

/* ------------------------------------------------------- cash references */

test('cash offerings and donations get one shared sequence of generated references', function () {
    $year = now()->year;
    $this->actingAs($this->admin)->post('/offerings', offeringInput())->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post('/donations', [
        'donor_name' => 'Kofi', 'amount' => 20, 'currency' => 'USD', 'payment_method' => 'cash', 'donation_date' => now()->toDateString(),
    ])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post('/donations', [
        'donor_name' => 'Esi', 'amount' => 20, 'currency' => 'USD', 'payment_method' => 'momo', 'donation_date' => now()->toDateString(),
    ])->assertSessionHasNoErrors();

    expect(Offering::first()->reference_number)->toBe("CASH-{$year}-0001")
        ->and(Donation::where('donor_name', 'Kofi')->value('reference_number'))->toBe("CASH-{$year}-0002")
        ->and(Donation::where('donor_name', 'Esi')->value('reference_number'))->toBeNull();

    // Editing keeps the reference it was given.
    $offering = Offering::first();
    $this->actingAs($this->admin)->patch("/offerings/{$offering->id}", offeringInput(['amount' => 75]))->assertSessionHasNoErrors();
    expect($offering->fresh()->reference_number)->toBe("CASH-{$year}-0001");
});

/* --------------------------------------------------------------- reports */

test('the membership & financial report combines both reports with charts, ledger and approvals', function () {
    Member::create(['first_name' => 'Ama', 'last_name' => 'Doe', 'gender' => 'female', 'status' => 'Active']);
    Tithe::create(['member_name' => 'Ama', 'amount' => 100, 'currency' => 'USD', 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund']);
    Tithe::create(['member_name' => 'Old', 'amount' => 40, 'currency' => 'USD', 'payment_method' => 'cash', 'tithe_date' => now()->subYear()->toDateString(), 'fund_name' => 'General Fund']);
    Expense::create(['title' => 'Power', 'category' => 'utilities', 'amount' => 30, 'currency' => 'USD', 'payment_method' => 'cash', 'status' => 'Paid', 'expense_date' => now()->toDateString(), 'fund_name' => 'General Fund']);

    $this->actingAs($this->admin)->get('/reports?type=full&range=this_month')->assertInertia(fn (Assert $p) => $p
        ->where('report.title', 'Membership & Financial Report')
        ->where('report.summary', fn ($rows) => collect($rows)->pluck('label')->contains('Total members on record') && collect($rows)->pluck('label')->contains('Tithes'))
        ->has('charts.gender')
        ->has('charts.monthly_financials')
        ->where('ledger.opening_balance', 40)
        ->where('ledger.closing_balance', 110)
        ->where('ledger.rows', [
            ['date' => now()->toDateString(), 'ref' => 'TITHES', 'description' => 'Tithes received (1 gift)', 'income' => 100, 'expense' => 0, 'balance' => 140],
            ['date' => now()->toDateString(), 'ref' => 'EXP-UTILITIES', 'description' => 'Utilities expenses (1 item)', 'income' => 0, 'expense' => 30, 'balance' => 110],
        ])
        ->where('overview.closing_balance', 110)
        ->has('approvals.signatories', 5));
});

test('every report type has charts, and every report renders as a PDF', function (string $type) {
    Event::create(['title' => 'Revival', 'event_type' => 'Service', 'start_date' => now(), 'status' => 'Upcoming']);

    $this->actingAs($this->admin)->get("/reports?type={$type}&range=this_year")->assertInertia(fn (Assert $p) => $p->whereType('charts', 'array'));
    $this->actingAs($this->admin)->get("/reports/pdf?type={$type}&range=this_year")->assertOk()->assertHeader('content-type', 'application/pdf');
})->with(['membership', 'finance', 'full', 'attendance', 'sacraments', 'ministry', 'events']);

test('a position signs a report once, and the signature is flagged when the figures change afterwards', function () {
    Storage::fake('local');
    $png = 'data:image/png;base64,'.base64_encode(base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='));
    $slot = ['type' => 'finance', 'from' => now()->startOfMonth()->toDateString(), 'to' => now()->endOfMonth()->toDateString()];

    // The Admin signs as Secretary, not as Treasurer.
    $this->actingAs($this->admin)->post('/reports/signatures', [...$slot, 'position' => 'treasurer', 'signature' => $png])->assertForbidden();
    $this->actingAs($this->admin)->post('/reports/signatures', [...$slot, 'position' => 'secretary', 'signature' => $png])->assertSessionHasNoErrors();
    $this->actingAs($this->admin)->post('/reports/signatures', [...$slot, 'position' => 'secretary', 'signature' => $png])->assertSessionHasErrors('signature');

    $signed = fn (Assert $p) => $p->where('approvals.signatories', fn ($rows) => collect($rows)->firstWhere('position_key', 'secretary')['status'] === 'signed');
    $this->actingAs($this->admin)->get('/reports?type=finance&range=this_month')->assertInertia(fn (Assert $p) => $signed($p)
        ->where('approvals.signatories', fn ($rows) => collect($rows)->firstWhere('position_key', 'secretary')['stale'] === false));

    Tithe::create(['member_name' => 'Late gift', 'amount' => 5, 'currency' => 'USD', 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund']);
    $this->actingAs($this->admin)->get('/reports?type=finance&range=this_month')->assertInertia(fn (Assert $p) => $p
        ->where('approvals.signatories', fn ($rows) => collect($rows)->firstWhere('position_key', 'secretary')['stale'] === true));

    expect(ReportSignature::count())->toBe(1);
});

/* -------------------------------------------------------- signing by role */

test('each approval line can be signed only by its role, and each person signs one line', function () {
    Storage::fake('local');
    $png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    $slot = ['type' => 'membership', 'from' => now()->startOfMonth()->toDateString(), 'to' => now()->endOfMonth()->toDateString()];
    $pastor = staffWith(RoleEnum::PASTOR);
    $treasurer = staffWith(RoleEnum::FINANCEOFFICER);
    $super = staffWith(RoleEnum::SUPERADMIN);

    $this->actingAs($pastor)->post('/reports/signatures', [...$slot, 'position' => 'treasurer', 'signature' => $png])->assertForbidden();
    $this->actingAs($super)->post('/reports/signatures', [...$slot, 'position' => 'pastor', 'signature' => $png])->assertForbidden();
    $this->actingAs($pastor)->post('/reports/signatures', [...$slot, 'position' => 'pastor', 'signature' => $png])->assertSessionHasNoErrors();

    $this->actingAs($treasurer)->post('/reports/signatures', [...$slot, 'position' => 'treasurer', 'signature' => $png])->assertSessionHasNoErrors();
    $this->actingAs($treasurer)->post('/reports/signatures', [...$slot, 'position' => 'finance_committee', 'signature' => $png])
        ->assertSessionHasErrors(['signature' => 'You have already signed this report as Church Treasurer. Each person signs one position.']);

    // On the page, a second Finance Officer may sign only the Finance Committee line.
    $other = staffWith(RoleEnum::FINANCEOFFICER);
    $this->actingAs($other)->get('/reports?type=membership&range=this_month')->assertInertia(fn (Assert $p) => $p
        ->where('approvals.signatories', fn ($rows) => collect($rows)->filter(fn ($r) => $r['can_sign'])->pluck('position_key')->values()->all() === ['finance_committee']));
});

/* ----------------------------------------------------------------- filters */

test('the membership report can be narrowed to male members, on screen, in the PDF and in the CSV', function () {
    Member::create(['first_name' => 'Kojo', 'last_name' => 'Mensah', 'gender' => 'Male', 'status' => 'Active', 'department' => 'Youth']);
    Member::create(['first_name' => 'Ama', 'last_name' => 'Owusu', 'gender' => 'Female', 'status' => 'Active', 'department' => 'Youth']);
    Member::create(['first_name' => 'Kofi', 'last_name' => 'Boateng', 'gender' => 'Male', 'status' => 'Inactive', 'department' => 'Choir']);

    $this->actingAs($this->admin)->get('/reports?type=membership&gender=Male')->assertInertia(fn (Assert $p) => $p
        ->where('filters', ['gender' => 'Male'])
        ->where('filterOptions.gender.options', ['Female' => 'Female', 'Male' => 'Male'])
        ->where('report.filters', 'Gender: Male')
        ->where('overview.members_total', 2)
        ->where('report.sections.0.title', 'Member list — Gender: Male')
        ->where('report.sections.0.rows', fn ($rows) => collect($rows)->pluck(1)->all() === ['Kofi Boateng', 'Kojo Mensah'])
        ->where('charts.gender', [['label' => 'Male', 'value' => 2]])
        ->where('approvals', null));

    $this->actingAs($this->admin)->get('/reports?type=membership&gender=Male&status=Active&department=Youth')->assertInertia(fn (Assert $p) => $p
        ->where('overview.members_total', 1)
        ->where('report.filters', 'Gender: Male · Member status: Active · Department: Youth'));

    $this->actingAs($this->admin)->get('/reports/pdf?type=membership&gender=Male')->assertOk()->assertHeader('content-type', 'application/pdf');
    $csv = $this->actingAs($this->admin)->get('/reports/export?type=membership&format=csv&gender=Male')->streamedContent();
    expect($csv)->toContain('Filtered by')->toContain('Gender: Male')->toContain('Kojo Mensah')->not->toContain('Ama Owusu');
});

test('the attendance report can be narrowed to one service', function () {
    AttendanceSession::create(['title' => 'Morning service', 'service_type' => 'sunday_worship', 'service_date' => now()->toDateString(), 'total_present' => 120]);
    AttendanceSession::create(['title' => 'Bible study', 'service_type' => 'bible_study', 'service_date' => now()->toDateString(), 'total_present' => 30]);

    $this->actingAs($this->admin)->get('/reports?type=attendance&range=this_month&service=bible_study')->assertInertia(fn (Assert $p) => $p
        ->where('report.filters', 'Service: Bible Study')
        ->where('report.summary.1', ['label' => 'Total attendance', 'value' => '30'])
        ->where('report.sections.0.rows', [['Bible Study', '1', '30', '30']]));

    $this->actingAs($this->admin)->get('/reports/pdf?type=attendance&range=this_month&service=bible_study')->assertOk();
});

test('finance and sacrament filters narrow their reports, and unknown filter values are ignored', function () {
    Tithe::create(['member_name' => 'Ama', 'amount' => 100, 'currency' => 'USD', 'payment_method' => 'cash', 'tithe_date' => now()->toDateString(), 'fund_name' => 'General Fund']);
    Donation::create(['donor_name' => 'Kofi', 'amount' => 70, 'currency' => 'USD', 'payment_method' => 'cash', 'donation_date' => now()->toDateString(), 'fund_name' => 'General Fund']);

    $this->actingAs($this->admin)->get('/reports?type=finance&range=this_month&income=donations')->assertInertia(fn (Assert $p) => $p
        ->where('overview.income', 70)
        ->where('ledger.total_income', 70)
        ->where('charts.income_by_category', [['label' => 'Donations', 'value' => 70]]));

    $this->actingAs($this->admin)->get('/reports?type=sacraments&sacrament=weddings')->assertInertia(fn (Assert $p) => $p
        ->where('report.sections', fn ($sections) => collect($sections)->pluck('title')->all() === ['Weddings']));

    $this->actingAs($this->admin)->get('/reports?type=membership&gender=Robot&department='.urlencode("' OR 1=1"))->assertInertia(fn (Assert $p) => $p
        ->where('filters', [])
        ->where('report.filters', ''));
});

/* ----------------------------------------------------------------- gallery */

test('gallery and uploaded image URLs are root-relative, so they display on any host', function () {
    Storage::fake('public');
    Event::create(['title' => 'Revival', 'event_type' => 'Service', 'start_date' => now(), 'status' => 'Upcoming', 'is_public' => true,
        'banner_url' => 'https://old-host.example/storage/uploads/images/revival.jpg']);
    $album = GalleryAlbum::create(['title' => 'Easter', 'event_date' => now()->toDateString(), 'is_published' => true]);
    $album->photos()->create(['image_path' => "gallery/{$album->id}/a.jpg", 'sort_order' => 1]);

    $this->get('/gallery')->assertInertia(fn (Assert $p) => $p->where('albums.data', fn ($albums) => collect($albums)->pluck('photos.0.url')->sort()->values()->all()
        === ["/storage/gallery/{$album->id}/a.jpg", '/storage/uploads/images/revival.jpg']));

    $url = $this->actingAs($this->admin)->post('/uploads/image', ['file' => UploadedFile::fake()->image('banner.jpg')])->assertOk()->json('url');
    expect($url)->toStartWith('/storage/uploads/images/');
});
