<?php

namespace App\Observers;

use App\Models\Announcement;
use App\Models\AttendanceSession;
use App\Models\Baptism;
use App\Models\BoardMember;
use App\Models\CommitteeMember;
use App\Models\DepartmentMember;
use App\Models\Document;
use App\Models\Donation;
use App\Models\Event;
use App\Models\Expense;
use App\Models\Funeral;
use App\Models\Member;
use App\Models\MinistryMember;
use App\Models\Offering;
use App\Models\PastoralCare;
use App\Models\Sermon;
use App\Models\Tithe;
use App\Models\Wedding;
use App\Support\Money;
use App\Support\Notifier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * In-app notifications for every module: members hear about events,
 * announcements, sermons, their own giving and memberships; staff hear about
 * things that need attention (expenses to approve, new care cases…).
 */
class NotifyObserver
{
    public const MODELS = [
        Event::class, Announcement::class, Sermon::class, Document::class,
        Tithe::class, Offering::class, Donation::class, Expense::class,
        PastoralCare::class, Baptism::class, Wedding::class, Funeral::class, AttendanceSession::class,
        DepartmentMember::class, MinistryMember::class, BoardMember::class, CommitteeMember::class,
    ];

    public function created(Model $m): void
    {
        $by = auth()->user()?->name ?? 'System';

        match (true) {
            $m instanceof Event => $m->is_public && $m->status !== 'Cancelled'
                ? Notifier::everyone('📅 New event: '.$m->title, trim(($m->start_date ? $m->start_date->format('D, M j \a\t g:i A') : '').($m->location ? " · {$m->location}" : '')), 'info', '/member-portal?tab=events')
                : Notifier::staff('Event created', "{$m->title} was created by {$by}.", 'info', '/events'),
            $m instanceof Announcement => $m->is_published ? $this->announce($m) : null,
            // Public sermon archive: members no longer open the staff /sermons page (F02).
            $m instanceof Sermon => $m->is_published ? Notifier::everyone('🎧 New sermon: '.$m->title, trim(($m->speaker_name ?? '').($m->scripture_reference ? " · {$m->scripture_reference}" : '')), 'info', '/church/sermons') : null,
            $m instanceof Document => $m->is_public ? Notifier::members('📄 New document: '.$m->title, 'A new church document is available.', 'info', '/member-portal?tab=documents') : null,
            $m instanceof Tithe, $m instanceof Offering, $m instanceof Donation => $this->thankGiver($m),
            $m instanceof Expense => $m->status === 'Pending'
                ? Notifier::permission('expenses.update', '💳 Expense awaiting approval', "{$m->title} — ".Money::format((float) $m->amount, $m->currency)." (submitted by {$by}).", 'warning', '/expenses')
                : null,
            // F04: no name or care type in the alert, and only the pastoral team gets it.
            $m instanceof PastoralCare => Notifier::permission(self::carePermission($m), '🤝 New pastoral care case', 'A new '.($m->priority ? strtolower($m->priority).' priority ' : '').'case was opened.', $m->priority === 'Urgent' ? 'urgent' : 'info', '/pastoral-care'),
            $m instanceof Baptism => $this->baptism($m, $by),
            $m instanceof Wedding => Notifier::staff('💍 Wedding recorded', "{$m->groom_name} & {$m->bride_name}".($m->wedding_date ? ' on '.Carbon::parse($m->wedding_date)->format('M j, Y') : '').'.', 'info', '/weddings'),
            $m instanceof Funeral => Notifier::staff('🕊️ Funeral recorded', "{$m->deceased_name}".($m->funeral_date ? ' — service on '.Carbon::parse($m->funeral_date)->format('M j, Y') : '').'.', 'info', '/funerals'),
            $m instanceof AttendanceSession => Notifier::staff('✅ Attendance recorded', ($m->title ?: 'Service').' — '.(int) $m->total_present." present (by {$by}).", 'info', '/attendance'),
            $m instanceof DepartmentMember => $this->joined($m, $m->department?->name, 'department'),
            $m instanceof MinistryMember => $this->joined($m, $m->ministry?->name, 'ministry'),
            $m instanceof BoardMember => $this->joined($m, $m->board?->name, 'board'),
            $m instanceof CommitteeMember => $this->joined($m, $m->committee?->name, 'committee'),
            default => null,
        };
    }

    public function updated(Model $m): void
    {
        if ($m instanceof Announcement && $m->wasChanged('is_published') && $m->is_published) {
            $this->announce($m);
        } elseif ($m instanceof Event && $m->wasChanged('status') && $m->status === 'Cancelled') {
            Notifier::everyone('⚠️ Event cancelled: '.$m->title, 'This event will no longer take place.', 'warning', '/member-portal?tab=events');
        } elseif ($m instanceof Event && $m->wasChanged('start_date') && $m->is_public) {
            Notifier::everyone('📅 Event rescheduled: '.$m->title, 'New date: '.$m->start_date?->format('D, M j \a\t g:i A'), 'info', '/member-portal?tab=events');
        } elseif ($m instanceof Sermon && $m->wasChanged('is_published') && $m->is_published) {
            Notifier::everyone('🎧 New sermon: '.$m->title, (string) $m->speaker_name, 'info', '/church/sermons');
        } elseif ($m instanceof Expense && $m->wasChanged('status') && in_array($m->status, ['Approved', 'Rejected', 'Paid'], true)) {
            Notifier::permission('expenses.view', "Expense {$m->status}", "{$m->title} — ".Money::format((float) $m->amount, $m->currency).' was marked '.strtolower($m->status).' by '.(auth()->user()?->name ?? 'System').'.', $m->status === 'Rejected' ? 'warning' : 'success', '/expenses');
        } elseif ($m instanceof PastoralCare && $m->wasChanged('status')) {
            Notifier::permission(self::carePermission($m), 'Pastoral care update', "A case is now {$m->status}.", 'info', '/pastoral-care');
        }
    }

    /** Confidential cases only alert people who may see them. */
    private static function carePermission(PastoralCare $care): string
    {
        return $care->is_confidential ? 'pastoral-care.confidential' : 'pastoral-care.view';
    }

    private function announce(Announcement $a): void
    {
        $type = $a->priority === 'Urgent' ? 'urgent' : 'info';
        Notifier::everyone('📢 '.$a->title, mb_strimwidth((string) $a->content, 0, 180, '…'), $type, '/member-portal?tab=announcements');
    }

    /** Thank a named giver; basket collections have no single giver. */
    private function thankGiver(Model $g): void
    {
        $member = $g->member_id ? Member::find($g->member_id) : null;
        if (! $member || ($g instanceof Offering && $g->is_collection)) {
            return;
        }
        $kind = $g instanceof Tithe ? 'tithe' : ($g instanceof Donation ? 'donation' : 'offering');
        Notifier::member($member, 'Thank you for your '.$kind, 'Your '.$kind.' of '.Money::format((float) $g->amount, $g->currency).' has been recorded'.($g->receipt_number ? " (receipt {$g->receipt_number})" : '').'. God bless you!', 'success', '/member-portal?tab=giving');
    }

    private function baptism(Baptism $b, string $by): void
    {
        Notifier::staff('🕊️ Baptism recorded', "{$b->candidate_name}".($b->baptism_date ? ' on '.Carbon::parse($b->baptism_date)->format('M j, Y') : '')." (by {$by}).", 'info', '/baptisms');
        if ($b->member_id && ($member = Member::find($b->member_id))) {
            Notifier::member($member, 'Your baptism has been recorded', 'Praise God! Your baptism is now part of your church record.', 'success', '/member-portal');
        }
    }

    private function joined(Model $pivot, ?string $group, string $kind): void
    {
        if ($group && $pivot->member_id && ($member = Member::find($pivot->member_id))) {
            Notifier::member($member, "Welcome to {$group}", "You have been added to the {$group} {$kind}.", 'success', '/member-portal');
        }
    }
}
