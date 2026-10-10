<?php

use App\Enums\Role as RoleEnum;
use App\Mail\ContactReplyMail;
use App\Models\ContactMessage;
use App\Models\Notification;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::ADMIN->value));
});

function contactPayload(array $overrides = []): array
{
    return [
        'name' => 'Ama Mensah', 'email' => 'ama@example.test', 'phone' => '0770 000 000',
        'subject' => 'Wedding enquiry', 'message' => 'Can we book the church hall in June?', ...$overrides,
    ];
}

test('a visitor can send a message from the contact page, and staff are notified', function () {
    $this->post(route('site.contact.send'), contactPayload())->assertRedirect()->assertSessionHasNoErrors();

    $message = ContactMessage::sole();
    expect($message->status)->toBe('new')->and($message->subject)->toBe('Wedding enquiry');
    expect(Notification::visibleTo($this->admin)->where('title', 'like', '%website message%')->exists())->toBeTrue();
});

test('the contact form validates input and rejects bots that fill the hidden field', function () {
    $this->post(route('site.contact.send'), contactPayload(['email' => 'not-an-email', 'message' => '']))
        ->assertSessionHasErrors(['email', 'message']);
    $this->post(route('site.contact.send'), contactPayload(['website' => 'http://spam.example']))
        ->assertSessionHasErrors('website');

    expect(ContactMessage::count())->toBe(0);
});

test('staff can read, reply by email to, and close a message', function () {
    Mail::fake();
    $message = ContactMessage::create(contactPayload());

    $this->actingAs($this->admin)->get(route('messages.index'))->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('messages/index')
        ->where('messages.0.subject', 'Wedding enquiry')
        ->where('counts.new', 1));

    $this->actingAs($this->admin)->post(route('messages.read', $message))->assertRedirect();
    expect($message->fresh()->status)->toBe('read');

    $this->actingAs($this->admin)->post(route('messages.reply', $message), ['response' => 'Yes, the hall is free in June.'])->assertRedirect();
    $message->refresh();
    expect($message->status)->toBe('replied')
        ->and($message->response)->toBe('Yes, the hall is free in June.')
        ->and($message->responded_by)->toBe($this->admin->id);
    Mail::assertSent(ContactReplyMail::class, fn (ContactReplyMail $mail) => $mail->hasTo('ama@example.test'));

    $this->actingAs($this->admin)->patch(route('messages.status', $message), ['status' => 'closed'])->assertRedirect();
    expect($message->fresh()->status)->toBe('closed');
});

test('people without the messages permission cannot open the inbox or reply', function () {
    $pastor = tap(User::factory()->create(['must_change_credentials' => false]), fn (User $u) => $u->assignRole(RoleEnum::PASTOR->value));
    $message = ContactMessage::create(contactPayload());

    $this->actingAs($pastor)->get(route('messages.index'))->assertForbidden();
    $this->actingAs($pastor)->post(route('messages.reply', $message), ['response' => 'Hi'])->assertForbidden();
    expect($message->fresh()->response)->toBeNull();
});
