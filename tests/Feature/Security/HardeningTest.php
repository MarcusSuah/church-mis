<?php

use App\Enums\Role as RoleEnum;
use App\Logging\RedactSensitiveContext;
use App\Models\Sermon;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Support\UserSessions;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Log\Logger;
use Illuminate\Support\Facades\Storage;
use Monolog\Handler\TestHandler;
use Monolog\Logger as Monolog;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::SUPERADMIN->value));
});

test('C13: sermon recordings and notes are uploaded, validated and linked', function () {
    Storage::fake('public');

    $this->actingAs($this->admin)->post('/sermons', [
        'title' => 'Faith That Works',
        'speaker_name' => 'Rev. Doe',
        'sermon_date' => now()->toDateString(),
        'service_type' => Sermon::SERVICE_TYPES[array_key_first(Sermon::SERVICE_TYPES)],
        'notes_file' => UploadedFile::fake()->create('notes.pdf', 200, 'application/pdf'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $sermon = Sermon::firstWhere('title', 'Faith That Works');
    expect($sermon->notes_url)->toStartWith(Storage::disk('public')->url('sermons/notes/'));
    Storage::disk('public')->assertExists(str($sermon->notes_url)->after('/storage/')->toString());
});

test('C13: executable or HTML files are rejected as sermon media', function () {
    Storage::fake('public');

    $this->actingAs($this->admin)->post('/sermons', [
        'title' => 'Bad Upload',
        'speaker_name' => 'Rev. Doe',
        'sermon_date' => now()->toDateString(),
        'service_type' => Sermon::SERVICE_TYPES[array_key_first(Sermon::SERVICE_TYPES)],
        'notes_file' => UploadedFile::fake()->create('notes.html', 5, 'text/html'),
        'video_url' => 'javascript:alert(1)',
    ])->assertSessionHasErrors(['notes_file', 'video_url']);

    expect(Sermon::where('title', 'Bad Upload')->exists())->toBeFalse();
});

test('C14: activity URLs never keep query strings or reset tokens', function () {
    $reset = Request::create('https://church.test/reset-password/secret-token-123?email=a@b.test');
    $verify = Request::create('https://church.test/email/verify/7/abc123hash?expires=1&signature=xyz');

    expect(ActivityLogger::safeUrl($reset))->toBe('https://church.test/reset-password/[redacted]')
        ->and(ActivityLogger::safeUrl($verify))->toBe('https://church.test/email/verify/7/[redacted]');
});

test('C14: log context keys that look like secrets are masked', function () {
    $handler = new TestHandler;
    $logger = new Logger(new Monolog('test', [$handler]));
    (new RedactSensitiveContext)($logger);

    $logger->info('check', ['password' => 'hunter2', 'nested' => ['api_key' => 'k'], 'member_id' => 5]);

    expect($handler->getRecords()[0]->context)->toBe(['password' => '[redacted]', 'nested' => ['api_key' => '[redacted]'], 'member_id' => 5]);
});

test('C5: a password reset ends every API token', function () {
    $user = User::factory()->create();
    $user->createToken('phone', ['members.view'], now()->addDay());

    UserSessions::endAll($user);

    expect($user->tokens()->count())->toBe(0);
});

test('C4/C17: the API needs a verified, authenticated user and returns only safe fields', function () {
    $this->getJson('/api/user')->assertUnauthorized();

    $unverified = User::factory()->unverified()->create();
    $this->actingAs($unverified)->getJson('/api/user')->assertForbidden();

    $this->actingAs($this->admin)->getJson('/api/user')
        ->assertOk()
        ->assertJsonStructure(['id', 'name', 'email', 'roles'])
        ->assertJsonMissingPath('password')
        ->assertJsonMissingPath('two_factor_secret');
});

test('C2: CORS does not allow unlisted origins', function () {
    $this->withHeaders(['Origin' => 'https://evil.example', 'Access-Control-Request-Method' => 'GET'])
        ->options('/api/user')
        ->assertHeaderMissing('Access-Control-Allow-Origin');
});
