<?php

namespace App\Http\Controllers\Church;

use App\Http\Controllers\Controller;
use App\Mail\MemberMessageMail;
use App\Models\Member;
use App\Models\MemberMessage;
use App\Support\Birthdays;
use App\Support\MessageTemplates;
use App\Support\Notifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Birthdays & celebrations: see who is celebrating and send them a message. */
class BirthdayController extends Controller
{
    public function index(Request $request): Response
    {
        $upcoming = Birthdays::upcoming(31);
        $preselect = $request->query('member');
        $preselect = is_string($preselect) && Str::isUuid($preselect) ? $preselect : null;
        $preselectMember = $preselect ? $this->memberOptionQuery()->whereKey($preselect)->first() : null;

        return Inertia::render('birthdays/index', [
            'today' => $upcoming->where('days_until', 0)->values(),
            'upcoming' => $upcoming->where('days_until', '>', 0)->values(),
            // Type-ahead: at most 20 matches, fetched only while the picker is searching (F07).
            'members' => Inertia::optional(fn () => $this->memberOptions($request->string('member_q')->trim()->toString())),
            'preselectMember' => $preselectMember ? $this->presentOption($preselectMember) : null,
            'occasions' => MessageTemplates::OCCASIONS,
            'history' => MemberMessage::with('sender:id,name')->latest()->paginate(10)->through(fn (MemberMessage $m) => [
                'id' => $m->id,
                'member_name' => $m->member_name,
                'occasion' => $m->occasion,
                'subject' => $m->subject,
                'message' => $m->message,
                'channels' => $m->channels ?? [],
                'email_status' => $m->email_status,
                'sent_by' => $m->sender?->name,
                'created_at' => $m->created_at?->toIso8601String(),
            ]),
            'preselect' => $preselect,
            'can' => ['send' => $request->user()->can('birthdays.send')],
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function memberOptions(string $term): array
    {
        if (mb_strlen($term) < 2) {
            return [];
        }

        return $this->memberOptionQuery()
            ->search(mb_substr($term, 0, 100))
            ->orderBy('last_name')->orderBy('first_name')
            ->limit(20)
            ->get()
            ->map(fn (Member $m) => $this->presentOption($m))
            ->all();
    }

    private function memberOptionQuery(): Builder
    {
        return Member::query()
            ->whereNotIn('status', ['Rejected', 'Deceased'])
            ->select(['id', 'first_name', 'last_name', 'middle_name', 'email', 'date_of_birth', 'user_id', 'department', 'photo_url']);
    }

    /** @return array<string, mixed> */
    private function presentOption(Member $m): array
    {
        return [
            'id' => $m->id,
            'name' => $m->full_name,
            'first_name' => $m->first_name,
            'email' => $m->email,
            'has_account' => (bool) $m->user_id,
            'department' => $m->department,
            'photo_url' => $m->photo_url,
            'date_of_birth' => $m->date_of_birth ? Carbon::parse($m->date_of_birth)->toDateString() : null,
        ];
    }

    public function send(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'member_ids' => ['required', 'array', 'min:1', 'max:200'],
            'member_ids.*' => ['uuid', 'exists:members,id'],
            'occasion' => ['required', 'string', Rule::in(array_keys(MessageTemplates::OCCASIONS))],
            'subject' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:5000'],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => [Rule::in(['in_app', 'email'])],
        ]);

        $sent = 0;
        $emailed = 0;
        $noEmail = [];
        foreach (Member::whereIn('id', $data['member_ids'])->get() as $member) {
            $age = $member->date_of_birth ? Carbon::parse($member->date_of_birth)->age + (now()->format('m-d') < Carbon::parse($member->date_of_birth)->format('m-d') ? 1 : 0) : '';
            $vars = ['first_name' => $member->first_name, 'full_name' => $member->full_name, 'age' => $age];
            $subject = MessageTemplates::fill($data['subject'], $vars);
            $body = MessageTemplates::fill($data['message'], $vars);

            if (in_array('in_app', $data['channels'], true)) {
                Notifier::member($member, $subject, $body, 'info', '/member-portal');
            }

            $emailStatus = 'skipped';
            if (in_array('email', $data['channels'], true)) {
                if (! $member->email) {
                    $emailStatus = 'no_email';
                    $noEmail[] = $member->full_name;
                } else {
                    try {
                        Mail::to($member->email, $member->full_name)->send(new MemberMessageMail($subject, $body, $member->full_name, $data['occasion']));
                        $emailStatus = 'sent';
                        $emailed++;
                    } catch (\Throwable $e) {
                        Log::warning('Member message email failed', ['member' => $member->id, 'error' => $e->getMessage()]);
                        $emailStatus = 'failed';
                    }
                }
            }

            MemberMessage::create([
                'member_id' => $member->id,
                'member_name' => $member->full_name,
                'occasion' => $data['occasion'],
                'subject' => $subject,
                'message' => $body,
                'channels' => $data['channels'],
                'email_status' => $emailStatus,
                'sent_by' => $request->user()->id,
            ]);
            $sent++;
        }

        $msg = $sent === 1 ? 'Message sent.' : "Message sent to {$sent} members.";
        if (in_array('email', $data['channels'], true)) {
            $msg .= " {$emailed} email(s) delivered.";
        }
        if ($noEmail) {
            $msg .= ' No email address for: '.implode(', ', array_slice($noEmail, 0, 5)).(count($noEmail) > 5 ? '…' : '').'.';
        }
        Inertia::flash('toast', ['type' => 'success', 'message' => $msg]);

        return back();
    }
}
