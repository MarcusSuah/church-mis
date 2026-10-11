<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Mail\ContactReplyMail;
use App\Models\ContactMessage;
use App\Models\ContactMessageReply;
use App\Support\ListQuery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * System → Messages: the inbox for the public website's contact form.
 * Staff read messages, reply by email (the reply is kept with the message)
 * and close them when done.
 */
class ContactMessageController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = ListQuery::filters($request, ['status' => ContactMessage::STATUSES]);

        $query = ContactMessage::query()
            ->with('replies')
            ->when($filters['status'] !== 'All', fn ($q) => $q->where('status', $filters['status']));
        ListQuery::search($query, $filters['search'], ['name', 'email', 'subject']);

        $page = $query->latest()->paginate(ListQuery::perPage($request))->withQueryString();

        return Inertia::render('messages/index', [
            'messages' => collect($page->items())->map(fn (ContactMessage $m) => $this->present($m))->values(),
            'pagination' => ListQuery::meta($page),
            'filters' => $filters,
            'counts' => [
                'All' => ContactMessage::count(),
                ...collect(ContactMessage::STATUSES)->mapWithKeys(fn ($s) => [$s => 0])->all(),
                ...ContactMessage::query()->toBase()->selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status')->map(fn ($n) => (int) $n)->all(),
            ],
            'can' => ['respond' => $request->user()->can('messages.respond')],
        ]);
    }

    /** Opening a new message marks it read. */
    public function markRead(ContactMessage $message): RedirectResponse
    {
        if ($message->status === 'new') {
            $message->forceFill(['status' => 'read'])->save();
        }

        return back();
    }

    public function reply(Request $request, ContactMessage $message): RedirectResponse
    {
        $data = $request->validate(['response' => ['required', 'string', 'max:5000']]);
        $staff = $request->user();

        // Each reply is its own record, so earlier replies are never overwritten.
        $reply = DB::transaction(function () use ($message, $data, $staff) {
            $reply = $message->replies()->forceCreate([
                'body' => $data['response'],
                'sent_by' => $staff->id,
                'sent_by_name' => $staff->name,
                'sent_to' => $message->email,
            ]);

            // The message row keeps a copy of the latest reply for the inbox list.
            $message->forceFill([
                'response' => $data['response'],
                'responded_by' => $staff->id,
                'responded_at' => $reply->created_at,
                'status' => 'replied',
            ])->save();

            return $reply;
        });

        try {
            Mail::to($message->email, $message->name)->send(new ContactReplyMail($message, $data['response'], $staff->name));
            $reply->forceFill(['email_sent' => true])->save();
            Inertia::flash('toast', ['type' => 'success', 'message' => "Reply sent to {$message->email}."]);
        } catch (\Throwable $e) {
            Log::warning('Contact reply email failed', ['contact_message' => $message->id, 'error' => $e->getMessage()]);
            Inertia::flash('toast', ['type' => 'warning', 'message' => 'Reply saved, but the email could not be sent. Check the mail settings.']);
        }

        return back();
    }

    public function updateStatus(Request $request, ContactMessage $message): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(ContactMessage::STATUSES)]]);
        $message->forceFill(['status' => $data['status']])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Message marked '.$data['status'].'.']);

        return back();
    }

    public function destroy(ContactMessage $message): RedirectResponse
    {
        $message->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Message deleted.']);

        return back();
    }

    /** @return array<string, mixed> */
    private function present(ContactMessage $m): array
    {
        return [
            'id' => $m->id,
            'name' => $m->name,
            'email' => $m->email,
            'phone' => $m->phone,
            'subject' => $m->subject,
            'message' => $m->message,
            'status' => $m->status,
            // The whole conversation, oldest reply first.
            'replies' => $m->replies->map(fn (ContactMessageReply $r) => [
                'id' => $r->id,
                'body' => $r->body,
                'sent_by' => $r->sent_by_name,
                'sent_to' => $r->sent_to,
                'email_sent' => $r->email_sent,
                'sent_at' => $r->created_at?->toIso8601String(),
            ])->values(),
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }
}
