<?php

namespace App\Http\Controllers\Church;

use App\Http\Controllers\Controller;
use App\Models\AttendanceSession;
use App\Models\AuditLog;
use App\Models\Baptism;
use App\Models\Department;
use App\Models\Donation;
use App\Models\Event;
use App\Models\FinanceFund;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\Offering;
use App\Models\PrayerRequest;
use App\Models\Tithe;
use App\Models\User;
use App\Support\Birthdays;
use App\Support\Money;
use App\Support\SqlDate;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

/** Staff dashboard — every widget is built from live data. */
class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        // Fallback for when the scheduler isn't running: first dashboard visit of the day sends the birthday notice.
        Birthdays::notifyStaff();

        $now = CarbonImmutable::now();
        $monthStart = $now->startOfMonth();
        $active = Member::whereIn('status', Member::ACCEPTED)->count();
        $lastSession = AttendanceSession::where('service_type', 'sunday_worship')->orderByDesc('service_date')->first()
            ?? AttendanceSession::orderByDesc('service_date')->first();
        $givingByMonth = $this->givingByMonth($now->subMonths(11)->startOfMonth(), $now->endOfMonth());
        $givingThis = $givingByMonth[$now->format('Y-m')] ?? 0.0;
        $givingPrev = $givingByMonth[$now->subMonth()->format('Y-m')] ?? 0.0;
        $weekEvents = Event::whereBetween('start_date', [$now->startOfDay(), $now->addDays(7)->endOfDay()])->orderBy('start_date')->get();
        $birthdays = Birthdays::upcoming(10);

        return Inertia::render('dashboard', [
            'kpis' => [
                'active_members' => $active,
                'new_this_month' => Member::where('created_at', '>=', $monthStart)->whereIn('status', Member::ACCEPTED)->count(),
                'pending' => Member::where('status', 'Pending')->count(),
                'giving' => $givingThis,
                'giving_change' => $givingPrev > 0 ? round((($givingThis - $givingPrev) / $givingPrev) * 100, 1) : null,
                'attendance' => (int) ($lastSession?->total_present ?? 0),
                'attendance_date' => $lastSession?->service_date?->format('M j'),
                'attendance_rate' => $active && $lastSession ? round(($lastSession->total_present / $active) * 100, 1) : null,
                'prayers_open' => PrayerRequest::where('status', 'Active')->count(),
                'prayers_unassigned' => PrayerRequest::where('status', 'Active')->whereNull('assigned_to')->whereNull('assigned_pastor_id')->count(),
                'events_week' => $weekEvents->count(),
                'next_event' => $weekEvents->first() ? $weekEvents->first()->title.', '.$weekEvents->first()->start_date->format('M j') : null,
            ],
            'membershipGrowth' => $this->membershipGrowth($now),
            'departments' => $this->departments(),
            'attendance' => AttendanceSession::orderByDesc('service_date')->limit(7)->get()->reverse()->values()->map(fn ($s) => [
                'label' => $s->service_date?->format('M j'),
                'service' => $s->title ?: ($s->service_type instanceof \BackedEnum ? str($s->service_type->value)->headline()->toString() : (string) $s->service_type),
                'present' => (int) $s->total_present,
                'late' => (int) $s->total_late,
                'absent' => (int) $s->total_absent,
            ]),
            'givingTrend' => $this->givingTrend($now, $givingByMonth),
            'activity' => AuditLog::latest('created_at')->limit(7)->get()->map(fn (AuditLog $l) => [
                'by_name' => $l->performed_by_name ?? User::where('email', $l->performed_by)->value('name') ?? ($l->performed_by === 'system' ? 'System' : $l->performed_by),
                'id' => $l->id,
                'action' => $l->action,
                'module' => $l->module,
                'description' => $l->description,
                'by' => $l->performed_by,
                'at' => $l->created_at?->toIso8601String(),
            ]),
            'events' => Event::where('start_date', '>=', $now->startOfDay())->where('status', '!=', 'Cancelled')->orderBy('start_date')->limit(5)->get()
                ->map(fn (Event $e) => [
                    'id' => $e->id, 'title' => $e->title, 'start' => $e->start_date?->toIso8601String(),
                    'location' => $e->location, 'type' => $e->event_type,
                    'registered' => (int) $e->registered_count, 'capacity' => $e->max_attendees,
                ]),
            'birthdays' => [
                'today' => $birthdays->where('days_until', 0)->values(),
                'upcoming' => $birthdays->where('days_until', '>', 0)->take(6)->values(),
            ],
            'quick' => [
                'departments' => Department::count(),
                'ministries' => Ministry::count(),
                'boards' => Schema::hasTable('ministry_boards') ? DB::table('ministry_boards')->where('is_active', true)->count() : 0,
                'baptisms_ytd' => Baptism::whereYear('baptism_date', $now->year)->count(),
            ],
            // No bcrypt check on every load (F01/F15): the flag already says whether a new password is required.
            'mustChangePassword' => (bool) $request->user()->must_change_credentials,
        ]);
    }

    /**
     * Tithes + offerings + donations in the base currency, per "YYYY-MM",
     * with one grouped query per table (uses the *_live_date indexes).
     *
     * @return array<string, float>
     */
    private function givingByMonth(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $range = [$from->toDateString(), $to->toDateString()];
        $totals = [];

        foreach ([[Tithe::class, 'tithe_date'], [Offering::class, 'offering_date'], [Donation::class, 'donation_date']] as [$model, $column]) {
            $rows = $model::query()->whereBetween($column, $range)->toBase()
                ->selectRaw(SqlDate::yearMonth($column).' as ym, SUM('.Money::sql().') as total')
                ->groupBy('ym')
                ->pluck('total', 'ym');

            foreach ($rows as $month => $total) {
                $totals[$month] = ($totals[$month] ?? 0.0) + (float) $total;
            }
        }

        return array_map(fn (float $total) => round($total, 2), $totals);
    }

    /** Accepted members at the end of each of the last 12 months, plus joiners that month (counted in SQL). */
    private function membershipGrowth(CarbonImmutable $now): array
    {
        $joined = 'COALESCE(date_joined, DATE(created_at))';
        $windowStart = $now->subMonths(11)->startOfMonth()->toDateString();
        $windowEnd = $now->addMonth()->startOfMonth()->toDateString();

        $accepted = fn () => Member::query()->whereIn('status', Member::ACCEPTED);
        $before = $accepted()->whereRaw("{$joined} < ?", [$windowStart])->count();
        $perMonth = $accepted()
            ->whereRaw("{$joined} >= ?", [$windowStart])
            ->whereRaw("{$joined} < ?", [$windowEnd])
            ->toBase()
            ->selectRaw(SqlDate::yearMonth($joined).' as ym, COUNT(*) as n')
            ->groupBy('ym')
            ->pluck('n', 'ym');

        $running = $before;

        return collect(range(11, 0))->map(function (int $i) use ($now, $perMonth, &$running) {
            $m = $now->subMonths($i);
            $new = (int) ($perMonth[$m->format('Y-m')] ?? 0);
            $running += $new;

            return [
                'month' => $m->format('M'),
                'label' => $m->format('F Y'),
                'active' => $running,
                'new' => $new,
            ];
        })->all();
    }

    private function departments(): array
    {
        $rows = DB::table('departments')
            ->leftJoin('department_members', 'department_members.department_id', '=', 'departments.id')
            ->where('departments.is_active', true)
            ->groupBy('departments.id', 'departments.name', 'departments.member_count')
            // CASE instead of MySQL-only GREATEST(), so the same SQL runs on every supported database.
            ->selectRaw('departments.name, CASE WHEN COUNT(department_members.id) > COALESCE(departments.member_count, 0) THEN COUNT(department_members.id) ELSE COALESCE(departments.member_count, 0) END as total')
            ->orderByDesc('total')->get()
            ->map(fn ($r) => ['name' => $r->name, 'value' => (int) $r->total])->filter(fn ($r) => $r['value'] > 0)->values();

        if ($rows->count() > 8) {
            $rows = $rows->take(7)->push(['name' => 'Other', 'value' => $rows->slice(7)->sum('value')]);
        }

        return ['items' => $rows->all(), 'count' => Department::where('is_active', true)->count()];
    }

    /** Monthly giving (default currency) vs the monthly share of fund targets. */
    /** @param  array<string, float>  $givingByMonth */
    private function givingTrend(CarbonImmutable $now, array $givingByMonth): array
    {
        $target = Money::sum(FinanceFund::where('is_active', true), 'target_amount', null) / 12;

        return collect(range(11, 0))->map(function ($i) use ($now, $target, $givingByMonth) {
            $m = $now->subMonths($i);

            return [
                'month' => $m->format('M'),
                'label' => $m->format('F Y'),
                'actual' => $givingByMonth[$m->format('Y-m')] ?? 0.0,
                'budget' => $target > 0 ? round($target, 2) : null,
            ];
        })->all();
    }
}
