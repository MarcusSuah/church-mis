<?php

/*
 * Penetration tests (security review, Step 7). Each test plays an attacker
 * and asserts the secure outcome, so a failure is a vulnerability.
 *
 * Already covered elsewhere and not repeated here: Admin vs Superadmin (F03),
 * API sign-in limits and token IDOR (Phase4AccessControlTest), web sign-in
 * limits (Auth/AuthenticationTest), unverified and rejected accounts (F02),
 * suspended members (Members/MemberLoginAccessTest), sermon media (C13).
 */

use App\Enums\Role as RoleEnum;
use App\Models\Baptism;
use App\Models\Member;
use App\Models\Notification as AppNotification;
use App\Models\User;
use App\Models\Wedding;
use App\Support\Notifier;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(fn () => $this->seed(RolePermissionSeeder::class));

function penUser(string $role, array $attrs = []): User
{
    return tap(
        User::factory()->create(['must_change_credentials' => false, 'status' => 'approved', ...$attrs]),
        fn (User $u) => $u->assignRole($role),
    );
}

/** A verified, active, member-only login with its member record. */
function penMember(string $email): array
{
    $user = penUser(RoleEnum::MEMBER->value, ['email' => $email]);
    $member = Member::create(['first_name' => 'Pen', 'last_name' => 'Tester', 'email' => $email, 'status' => 'Active', 'user_id' => $user->id]);

    return [$user, $member];
}

/** The application's own routes (not vendor packages). */
function penAppRoutes(): Collection
{
    return collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RoutingRoute $r) => str_starts_with($r->getActionName(), 'App\\'));
}

function penMethod(RoutingRoute $r): string
{
    return collect($r->methods())->reject(fn ($m) => $m === 'HEAD')->first();
}

/** The route's URI with placeholder IDs that satisfy its parameter constraints (e.g. whereNumber). */
function penUri(RoutingRoute $r): string
{
    $uri = preg_replace_callback('/\{([^}?:]+)[^}]*\}/', function (array $m) use ($r) {
        $pattern = $r->wheres[$m[1]] ?? null;

        return $pattern && preg_match('/^'.$pattern.'$/', '999999') ? '999999' : '00000000-0000-0000-0000-000000000000';
    }, $r->uri());

    return '/'.ltrim($uri, '/');
}

/** An upload built from a real file on disk, so its type is detected from the content like a real upload. */
function penRealUpload(string $name, string $content): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'pen');
    file_put_contents($path, $content);

    return new UploadedFile($path, $name, null, null, true);
}

function penRegistration(array $overrides = []): array
{
    return [
        'first_name' => 'Ama', 'last_name' => 'Mensah', 'gender' => 'Female', 'date_of_birth' => '1990-04-12',
        'phone' => '+231770000001', 'email' => 'ama@example.test', 'password' => 'Chosen#Pass2026',
        'password_confirmation' => 'Chosen#Pass2026', 'address' => '12 Broad Street', 'city' => 'Monrovia',
        'country' => 'Liberia', 'membership_type' => 'Regular Member', 'baptized' => false,
        'communion_participant' => false, 'emergency_name' => 'Kofi Mensah', 'emergency_phone' => '+231770000002',
        'emergency_relation' => 'Spouse', 'consent' => true, ...$overrides,
    ];
}

/* ------------------------------------------------- 1. Signed-out access */

test('PEN-1: every signed-in route turns away a signed-out visitor', function () {
    $leaks = [];

    foreach (penAppRoutes() as $route) {
        $middleware = implode(',', $route->gatherMiddleware());
        if (! preg_match('/\bauth\b|auth:sanctum/', $middleware)) {
            continue;
        }

        $isApi = str_starts_with($route->uri(), 'api/');
        $response = $isApi ? $this->json(penMethod($route), penUri($route)) : $this->call(penMethod($route), penUri($route));
        $status = $response->getStatusCode();
        $safe = $isApi ? $status === 401 : ($status === 302 && str_ends_with((string) $response->headers->get('Location'), '/login'));

        if (! $safe) {
            $leaks[] = penMethod($route).' '.penUri($route)." -> {$status}";
        }
    }

    expect($leaks)->toBe([]);
});

/* ------------------------------------------ 3. Member → staff escalation */

test('PEN-3: a member-only account is refused on every staff route', function () {
    [$user] = penMember('member@example.test');
    $this->actingAs($user);
    $leaks = [];

    foreach (penAppRoutes() as $route) {
        $middleware = implode(',', $route->gatherMiddleware());
        if (! preg_match('/permission:|role:|redirect\.members/', $middleware)) {
            continue;
        }

        $response = $this->call(penMethod($route), penUri($route));
        $status = $response->getStatusCode();
        $location = (string) $response->headers->get('Location');
        // Refused (403), not found (404), or sent to the portal / sign-in. A redirect
        // anywhere else (e.g. "back" with validation errors) means the request got in.
        $safe = in_array($status, [403, 404], true)
            || ($status === 302 && (str_ends_with($location, '/member-portal') || str_ends_with($location, '/login')));

        if (! $safe) {
            $leaks[] = penMethod($route).' '.penUri($route)." -> {$status} {$location}";
        }
    }

    expect($leaks)->toBe([]);
});

/* ------------------------------------- 2. Member → another member (IDOR) */

test('PEN-2: a member cannot reach another member\'s certificates, documents or notifications', function () {
    [$attacker] = penMember('attacker@example.test');
    [, $victim] = penMember('victim@example.test');

    $baptism = Baptism::create(['member_id' => $victim->id, 'candidate_name' => 'Victim', 'baptism_date' => '2026-06-08', 'baptism_type' => 'immersion']);
    $baptism->forceFill(['certificate_issued' => true, 'certificate_number' => 'BSSC-2026-001'])->save();
    $wedding = Wedding::create(['groom_name' => 'Peter', 'bride_name' => 'Victim', 'bride_member_id' => $victim->id, 'wedding_date' => '2026-04-18', 'status' => 'completed']);
    $wedding->forceFill(['certificate_issued' => true, 'certificate_number' => 'MSSC-2026-001'])->save();
    $document = $victim->documentRequests()->create(['document_type' => 'Membership Certificate', 'status' => 'Ready']);
    $document->forceFill(['file_path' => 'documents/victim.pdf'])->save();
    Notifier::member($victim, 'Private', 'For the victim only');
    $notification = AppNotification::latest('id')->firstOrFail();

    $this->actingAs($attacker);
    $this->get(route('member.portal.baptism-certificate', $baptism))->assertNotFound();
    $this->get(route('member.portal.marriage-certificate', $wedding))->assertNotFound();
    $this->get(route('member.portal.document.download', $document))->assertNotFound();
    $this->post(route('notifications.read', $notification))->assertNotFound();
    $this->post(route('notifications.toggle-read', $notification))->assertNotFound();

    $this->get('/member-portal')->assertInertia(fn (Assert $p) => $p->where('member.id', fn ($id) => $id !== $victim->id));
});

/* ------------------------------------------------- 4. Mass assignment */

test('PEN-4: the portal profile ignores status, links, email and IDs smuggled into the request', function () {
    [$user, $member] = penMember('member@example.test');
    [$other] = penMember('other@example.test');
    $original = $member->only(['status', 'member_id', 'user_id', 'email', 'reg_ref']);

    $this->actingAs($user)->patch(route('member.portal.update'), [
        'city' => 'Gbarnga',
        'status' => 'Approved', 'member_id' => 'SSBC-M-9999', 'user_id' => $other->id,
        'email' => 'hijack@example.test', 'reg_ref' => 'SSBC-REG-HACK', 'department' => 'Finance',
    ])->assertSessionHasNoErrors();

    $member->refresh();
    expect($member->city)->toBe('Gbarnga')
        ->and($member->only(['status', 'member_id', 'user_id', 'email', 'reg_ref']))->toBe($original);
});

test('PEN-4: self sign-up cannot pick a role, approval or a verified email', function () {
    Notification::fake();

    $this->post(route('register.store'), [
        'name' => 'Mallory', 'email' => 'mallory@example.test', 'password' => 'Chosen#Pass2026', 'password_confirmation' => 'Chosen#Pass2026',
        'role' => RoleEnum::SUPERADMIN->value, 'roles' => [RoleEnum::SUPERADMIN->value], 'status' => 'approved',
        'is_active' => true, 'email_verified_at' => now()->toDateTimeString(), 'must_change_credentials' => false,
    ]);

    $user = User::where('email', 'mallory@example.test')->firstOrFail();
    expect($user->getRoleNames()->all())->toBe([RoleEnum::MEMBER->value])
        ->and($user->hasVerifiedEmail())->toBeFalse()
        ->and($user->status->value)->not->toBe('approved');
});

/* --------------------------------------------------- 6. SQL injection */

test('PEN-6: SQL injection payloads in search, filters and sorting change nothing and leak nothing', function (string $payload) {
    $admin = penUser(RoleEnum::ADMIN->value);
    Member::create(['first_name' => 'Kwame', 'last_name' => 'Boateng', 'status' => 'Active']);
    Member::create(['first_name' => 'Ama', 'last_name' => 'Mensah', 'status' => 'Active']);
    $this->actingAs($admin);

    $this->get(route('members.index', ['search' => $payload]))->assertOk()->assertInertia(fn (Assert $p) => $p->has('members.data', 0));
    $this->get(route('members.index', ['status' => $payload, 'sort_col' => $payload, 'sort_dir' => $payload]))->assertOk()
        ->assertInertia(fn (Assert $p) => $p->where('filters.sort_col', 'last_name')->where('filters.status', 'All'));
    $this->getJson(route('search', ['q' => $payload]))->assertOk()->assertJsonPath('groups', []);
    $this->getJson(route('lookup.members', ['q' => $payload]))->assertOk()->assertJsonCount(0, 'data');

    expect(Schema::hasTable('members'))->toBeTrue()->and(Schema::hasTable('users'))->toBeTrue()
        ->and(Member::count())->toBe(2);
})->with([
    'tautology' => ["' OR '1'='1"],
    'comment' => ["' OR 1=1 -- "],
    'union' => ["' UNION SELECT email, password FROM users -- "],
    'stacked' => ['x; DROP TABLE members; --'],
    'wildcard' => ["%' OR 1=1 #"],
]);

/* ------------------------------------------------------ 7. Stored XSS */

test('PEN-7: script payloads from public forms are never sent back as live HTML', function () {
    Notification::fake();
    $script = '<script>alert(1)</script>';
    $img = '"><img src=x onerror=alert(1)>';

    $this->post(route('public-registration.store'), penRegistration(['first_name' => $script, 'last_name' => $img]))->assertSessionHasNoErrors();
    $this->post(route('site.contact.send'), ['name' => $script, 'email' => 'x@example.test', 'subject' => $img, 'message' => "Hello {$script}"])->assertSessionHasNoErrors();

    $admin = penUser(RoleEnum::ADMIN->value);
    foreach ([route('pending-registrations.index', ['status' => 'All']), route('members.index'), route('messages.index')] as $page) {
        // A full page load embeds the props in the HTML, so a raw tag here would execute.
        $this->actingAs($admin)->get($page)->assertOk()
            ->assertDontSee($script, false)
            ->assertDontSee('<img src=x onerror', false);
    }
});

/* ------------------------------------------------ 8. Malicious uploads */

test('PEN-8: disguised scripts and SVGs are rejected as photos and images', function (string $name, string $content) {
    Storage::fake('public');

    $this->post(route('public-registration.store'), penRegistration(['photo' => penRealUpload($name, $content)]))->assertSessionHasErrors('photo');

    $staff = penUser(RoleEnum::ADMIN->value);
    $this->actingAs($staff)->postJson(route('uploads.image'), ['file' => penRealUpload($name, $content)])->assertStatus(422);

    expect(Storage::disk('public')->allFiles())->toBe([]);
})->with([
    // Harmless PHP bodies: real web-shell code gets the temp file quarantined by antivirus.
    'PHP disguised as JPEG' => ['avatar.jpg', '<?php echo "uploaded code ran"; ?>'],
    'PHP with double extension' => ['shell.php.jpg', '<?php echo phpversion(); ?>'],
    'SVG with script' => ['logo.png', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>'],
    'HTML page' => ['page.gif', '<html><body><script>alert(1)</script></body></html>'],
]);

test('PEN-8: a real image named like a script is stored under a random, non-executable name', function () {
    Storage::fake('public');
    $staff = penUser(RoleEnum::ADMIN->value);

    $this->actingAs($staff)->postJson(route('uploads.image'), ['file' => UploadedFile::fake()->image('shell.php.jpg')])->assertOk();

    $stored = Storage::disk('public')->allFiles();
    expect($stored)->toHaveCount(1)
        ->and($stored[0])->not->toContain('shell')->not->toContain('.php')
        ->and($stored[0])->toEndWith('.jpg');
});

/* --------------------------------------- 10. Sign-up and reset flooding */

test('PEN-10: one address cannot flood the sign-up form', function () {
    Notification::fake();

    foreach (range(1, 12) as $i) {
        $this->post(route('register.store'), [
            'name' => "Bot {$i}", 'email' => "bot{$i}@example.test", 'password' => 'Chosen#Pass2026', 'password_confirmation' => 'Chosen#Pass2026',
        ]);
        auth()->logout();
    }

    expect(User::where('email', 'like', 'bot%')->count())->toBeLessThanOrEqual(10);
});

test('PEN-10: one address cannot flood the forgot-password form', function () {
    Notification::fake();
    $targets = collect(range(1, 12))->map(fn ($i) => User::factory()->create(['email' => "target{$i}@example.test"]));

    foreach ($targets as $target) {
        $this->post(route('password.email'), ['email' => $target->email]);
    }

    $emailsSent = $targets->sum(fn (User $target) => Notification::sent($target, ResetPassword::class)->count());
    expect($emailsSent)->toBeLessThanOrEqual(10);
});

/* ----------------------------------------------------- 12. Open redirect */

test('PEN-12: the lock screen never sends a user to another site after unlocking', function () {
    $admin = penUser(RoleEnum::ADMIN->value, ['password' => 'Secret#Pass1']);

    $this->actingAs($admin)
        ->withHeader('referer', 'https://evil.example/phish')
        ->post(route('lock-screen.lock'));

    $response = $this->actingAs($admin)->post(route('lock-screen.unlock'), ['password' => 'Secret#Pass1']);
    expect((string) $response->headers->get('Location'))->not->toContain('evil.example');
});

/* -------------------------------------------------------------- CSRF */

test('PEN-CSRF: browser routes are protected against cross-site request forgery', function () {
    $web = app(Kernel::class)->getMiddlewareGroups()['web'];

    expect(array_intersect($web, [ValidateCsrfToken::class, PreventRequestForgery::class]))->not->toBeEmpty();
});

test('PEN-10: the confirm-password screen limits password guessing', function () {
    $staff = penUser(RoleEnum::ADMIN->value, ['password' => 'Secret#Pass1']);

    foreach (range(1, 6) as $attempt) {
        $this->actingAs($staff)->post(route('password.confirm.store'), ['password' => "wrong-{$attempt}"])->assertSessionHasErrors('password');
    }

    $this->actingAs($staff)->post(route('password.confirm.store'), ['password' => 'Secret#Pass1'])
        ->assertSessionHasErrors(['password' => 'Too many attempts. Please wait a minute and try again.']);
});

/* ------------------------------------------------- Security headers */

test('E: every response carries anti-framing, no-sniff, referrer and HTTPS headers', function () {
    $this->get('/')->assertHeader('X-Frame-Options', 'SAMEORIGIN')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeaderMissing('Strict-Transport-Security');

    $this->getJson('/api/v1/auth/me')->assertUnauthorized()->assertHeader('X-Frame-Options', 'SAMEORIGIN');

    $this->get('https://localhost/')->assertHeader('Strict-Transport-Security', 'max-age=31536000');
});

/* ------------------------------------------- Link fields (finding F) */

test('F: link fields refuse addresses that could run script or leave the site', function (string $link) {
    $admin = penUser(RoleEnum::ADMIN->value);

    $this->actingAs($admin)->post(route('notifications.store'), [
        'title' => 'Choir', 'message' => 'Practice moved', 'notification_type' => 'info', 'recipient' => 'all', 'link_url' => $link,
    ])->assertSessionHasErrors('link_url');
})->with([
    'javascript' => ['javascript:alert(document.cookie)'],
    'mixed-case javascript' => ['JaVaScRiPt:alert(1)'],
    'tab-split javascript' => ["java\tscript:alert(1)"],
    'data URL' => ['data:text/html,<script>alert(1)</script>'],
    'vbscript' => ['vbscript:msgbox(1)'],
    'protocol-relative' => ['//evil.example/phish'],
    'backslash host' => ['/\evil.example'],
]);

test('F: link fields accept web addresses, site paths, anchors and mail links', function (string $link) {
    $admin = penUser(RoleEnum::ADMIN->value);

    $this->actingAs($admin)->post(route('notifications.store'), [
        'title' => 'Choir', 'message' => 'Practice moved', 'notification_type' => 'info', 'recipient' => 'all', 'link_url' => $link,
    ])->assertSessionHasNoErrors();
})->with([
    'https' => ['https://example.org/events?id=1'],
    'site path' => ['/member-portal'],
    'storage file' => ['/storage/uploads/images/banner.jpg'],
    'anchor' => ['#service-times'],
    'mailto' => ['mailto:office@example.org'],
]);
