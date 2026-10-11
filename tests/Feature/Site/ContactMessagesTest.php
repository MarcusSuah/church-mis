<?php

use App\Enums\Role as RoleEnum;
use App\Mail\ContactReplyMail;
use App\Models\ContactMessage;
use App\Models\ContactMessageReply;
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

test('a second reply is added to the conversation instead of replacing the first', function () {
    Mail::fake();
    $message = ContactMessage::create(contactPayload());

    $this->actingAs($this->admin)->post(route('messages.reply', $message), ['response' => 'Yes, the hall is free in June.']);
    $this->actingAs($this->admin)->post(route('messages.reply', $message), ['response' => 'The 14th is booked for you.']);

    expect($message->replies()->pluck('body')->all())->toBe(['Yes, the hall is free in June.', 'The 14th is booked for you.'])
        ->and($message->replies()->where('email_sent', true)->count())->toBe(2)
        ->and($message->fresh()->response)->toBe('The 14th is booked for you.');

    $this->get(route('messages.index'))->assertInertia(fn (Assert $p) => $p
        ->where('messages.0.replies.0.body', 'Yes, the hall is free in June.')
        ->where('messages.0.replies.1.body', 'The 14th is booked for you.')
        ->where('messages.0.replies.1.sent_by', $this->admin->name));
    Mail::assertSent(ContactReplyMail::class, 2);
});

test('the follow-up email quotes the earlier reply', function () {
    $message = ContactMessage::create(contactPayload());
    Mail::fake();
    $this->actingAs($this->admin)->post(route('messages.reply', $message), ['response' => 'First answer from the office.']);
    $this->actingAs($this->admin)->post(route('messages.reply', $message), ['response' => 'Second answer.']);

    Mail::assertSent(ContactReplyMail::class, fn (ContactReplyMail $mail) => $mail->reply === 'Second answer.'
        && str_contains($mail->render(), 'First answer from the office.'));
});

test('a reply whose email fails is still kept, marked as not sent', function () {
    Mail::shouldReceive('to')->andThrow(new RuntimeException('SMTP down'));
    $message = ContactMessage::create(contactPayload());

    $this->actingAs($this->admin)->post(route('messages.reply', $message), ['response' => 'Saved even if mail fails.'])->assertRedirect();

    expect($message->replies()->sole()->only(['body', 'email_sent']))->toBe(['body' => 'Saved even if mail fails.', 'email_sent' => false]);
});

test('deleting a message hides it from the inbox but keeps it and its replies on record', function () {
    Mail::fake();
    $message = ContactMessage::create(contactPayload());
    $this->actingAs($this->admin)->post(route('messages.reply', $message), ['response' => 'On record.']);

    $this->delete(route('messages.destroy', $message))->assertRedirect();

    $this->get(route('messages.index'))->assertInertia(fn (Assert $p) => $p->has('messages', 0));
    expect(ContactMessage::withTrashed()->find($message->id))->not->toBeNull()
        ->and(ContactMessageReply::where('contact_message_id', $message->id)->count())->toBe(1);
});
