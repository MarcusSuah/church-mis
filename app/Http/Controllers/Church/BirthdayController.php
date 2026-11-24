<?php

namespace App\Http\Controllers\Church;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Mail\MemberMessageMail;
use App\Models\Member;
use App\Models\MemberMessage;
use App\Services\ActivityNotifier;
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
    /** Members the picker lists per page. */
    public const PAGE_SIZE = 50;

    /** Most members one message can go to. */
    public const MAX_RECIPIENTS = 200;

    private const ACTIVE = 'Active';

    public function index(Request $request): Response
    {
        $upcoming = Birthdays::upcoming(31);
        $preselect = $request->query('member');
        $preselect = is_string($preselect) && Str::isUuid($preselect) ? $preselect : null;
        $preselectMember = $preselect ? $this->memberOptionQuery()->whereKey($preselect)->first() : null;

        return Inertia::render('birthdays/index', [
            'today' => $upcoming->where('days_until', 0)->values(),
            'upcoming' => $upcoming->where('days_until', '>', 0)->values(),
            // Active members to pick from: one page at a time, filtered in the database (F07).
            'members' => Inertia::defer(fn () => $this->memberOptions($request, self::PAGE_SIZE), 'recipients'),
            'memberTotal' => Inertia::defer(fn () => $this->activeMembers($request)->count(), 'recipients'),
            // "Select all": every matching active member, up to the send limit. Loaded only on request.
            'allMembers' => Inertia::optional(fn () => $this->memberOptions($request, self::MAX_RECIPIENTS)),
            'memberFilters' => [
                'q' => $this->term($request),
                'department' => $this->department($request),
            ],
            'departments' => Member::query()->where('status', self::ACTIVE)
                ->whereNotNull('department')->where('department', '!=', '')
                ->distinct()->orderBy('department')->pluck('department'),
            'maxRecipients' => self::MAX_RECIPIENTS,
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

    /**
     * Active members matching the picker's search and department, alphabetically.
     *
     * @return list<array<string, mixed>>
     */
    private function memberOptions(Request $request, int $limit): array
    {
        return $this->activeMembers($request)
            ->orderBy('last_name')->orderBy('first_name')
            ->limit($limit)
            ->get()
            ->map(fn (Member $m) => $this->presentOption($m))
            ->all();
    }

    /** Active members, narrowed by ?member_q= and ?member_department=. */
    private function activeMembers(Request $request): Builder
    {
        $term = $this->term($request);
        $department = $this->department($request);

        return $this->memberOptionQuery()
            ->where('status', self::ACTIVE)
            ->when($term !== '', fn (Builder $q) => $q->search($term))
            ->when($department !== '', fn (Builder $q) => $q->where('department', $department));
    }

    private function term(Request $request): string
    {
        return mb_substr($request->string('member_q')->trim()->toString(), 0, 100);
    }

    private function department(Request $request): string
    {
        return mb_substr($request->string('member_department')->trim()->toString(), 0, 100);
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
            'member_ids' => ['required', 'array', 'min:1', 'max:'.self::MAX_RECIPIENTS],
            // Active members from the picker, or anyone on the birthday list.
            'member_ids.*' => ['uuid', Rule::exists('members', 'id')->whereNotIn('status', ['Rejected', 'Deceased'])],
            'occasion' => ['required', 'string', Rule::in(array_keys(MessageTemplates::OCCASIONS))],
            'subject' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string', 'max:5000'],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => [Rule::in(['in_app', 'email'])],
        ], [
            'member_ids.required' => 'Choose at least one member.',
            'member_ids.max' => 'A message can go to at most '.self::MAX_RECIPIENTS.' members at a time.',
            'member_ids.*.exists' => 'One of the chosen members can no longer receive messages.',
        ]);

        $sent = 0;
        $emailed = 0;
        $noEmail = [];
        $names = [];
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
            $names[] = $member->full_name;
        }

        // One staff alert for the whole send (the members get their own message).
        if ($sent > 0) {
            $who = implode(', ', array_slice($names, 0, 3)).($sent > 3 ? ' and '.($sent - 3).' more' : '');
            ActivityNotifier::custom(
                "{$data['occasion']} message sent",
                "sent a {$data['occasion']} message “{$data['subject']}” to {$who}",
                NotificationType::Member,
                'birthdays.view',
                '/birthdays',
            );
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
