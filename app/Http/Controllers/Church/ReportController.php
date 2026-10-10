<?php

namespace App\Http\Controllers\Church;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AttendanceSession;
use App\Models\Baptism;
use App\Models\Communion;
use App\Models\Department;
use App\Models\DocumentRequest;
use App\Models\Donation;
use App\Models\Event;
use App\Models\Expense;
use App\Models\Funeral;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\Offering;
use App\Models\PastoralCare;
use App\Models\PrayerRequest;
use App\Models\Sermon;
use App\Models\Tithe;
use App\Models\Wedding;
use App\Support\ChurchLogo;
use App\Support\Csv;
use App\Support\Money;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Church reports. Each report is built once (build()) and rendered three
 * ways: on screen, in the letter-headed PDF template, or as CSV / Excel.
 */
class ReportController extends Controller
{
    public const TYPES = [
        'membership' => 'Membership Report',
        'finance' => 'Finance Report',
        'attendance' => 'Attendance Report',
        'sacraments' => 'Sacraments Report',
        'ministry' => 'Ministry & Pastoral Care Report',
        'events' => 'Events & Content Report',
    ];

    /** Rows listed in the "New members in period" table (the count above it covers all of them). */
    private const NEW_MEMBER_ROWS = 500;

    public const RANGES = [
        'this_month' => 'This Month', 'last_month' => 'Last Month', 'this_quarter' => 'This Quarter',
        'last_quarter' => 'Last Quarter', 'this_year' => 'This Year', 'last_year' => 'Last Year',
        'all_time' => 'All Time', 'custom' => 'Custom Range',
    ];

    public function index(Request $request): Response
    {
        [$type, $range, $from, $to] = $this->params($request);

        return Inertia::render('reports/index', [
            'type' => $type,
            'range' => $range,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'types' => self::TYPES,
            'ranges' => self::RANGES,
            'overview' => $this->overview($from, $to),
            'report' => $this->build($type, $from, $to, $range),
        ]);
    }

    /** The report inside the church letterhead, for viewing and printing. */
    public function pdf(Request $request)
    {
        [$type, $range, $from, $to] = $this->params($request);
        $report = $this->build($type, $from, $to, $range);
        $pdf = Pdf::loadView('pdf.report', [
            'report' => $report,
            'church' => config('church'),
            'logo' => ChurchLogo::dataUri(),
            'generatedBy' => $request->user()->name,
        ])->setPaper('a4', 'portrait');
        // "Page X of Y" in the bottom-right corner of every page.
        $pdf->render();
        $canvas = $pdf->getDomPDF()->getCanvas();
        $canvas->page_text($canvas->get_width() - 92, $canvas->get_height() - 30, 'Page {PAGE_NUM} of {PAGE_COUNT}',
            $pdf->getDomPDF()->getFontMetrics()->getFont('DejaVu Sans'), 7, [0.42, 0.45, 0.5]);

        $file = str($report['title'].' '.$report['period'])->slug().'.pdf';

        return $request->boolean('download') ? $pdf->download($file) : $pdf->stream($file);
    }

    public function export(Request $request): StreamedResponse
    {
        [$type, $range, $from, $to] = $this->params($request);
        $report = $this->build($type, $from, $to, $range);
        $excel = $request->query('format') === 'excel';
        $name = str($report['title'].' '.$report['period'])->slug();

        if ($excel) {
            // An HTML table saved as .xls opens directly in Excel with the formatting kept.
            return response()->streamDownload(function () use ($report) {
                echo view('pdf.report-excel', ['report' => $report, 'church' => config('church')])->render();
            }, "{$name}.xls", ['Content-Type' => 'application/vnd.ms-excel; charset=UTF-8']);
        }

        return response()->streamDownload(function () use ($report) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows L$ / ≈ correctly
            Csv::put($out, [config('church.name')]);
            Csv::put($out, [$report['title'], $report['period']]);
            Csv::put($out, []);
            foreach ($report['summary'] as $row) {
                Csv::put($out, [$row['label'], $row['value']]);
            }
            foreach ($report['sections'] as $section) {
                Csv::put($out, []);
                Csv::put($out, [strtoupper($section['title'])]);
                Csv::put($out, $section['columns']);
                foreach ($section['rows'] as $r) {
                    Csv::put($out, $r);
                }
            }
            fclose($out);
        }, "{$name}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /* ------------------------------------------------------------------ */

    private function params(Request $request): array
    {
        $type = array_key_exists($request->query('type'), self::TYPES) ? $request->query('type') : 'membership';
        $range = array_key_exists($request->query('range'), self::RANGES) ? $request->query('range') : 'this_year';
        $now = CarbonImmutable::now();

        [$from, $to] = match ($range) {
            'this_month' => [$now->startOfMonth(), $now->endOfMonth()],
            'last_month' => [$now->subMonthNoOverflow()->startOfMonth(), $now->subMonthNoOverflow()->endOfMonth()],
            'this_quarter' => [$now->startOfQuarter(), $now->endOfQuarter()],
            'last_quarter' => [$now->subQuarter()->startOfQuarter(), $now->subQuarter()->endOfQuarter()],
            'last_year' => [$now->subYear()->startOfYear(), $now->subYear()->endOfYear()],
            'all_time' => [CarbonImmutable::create(2000, 1, 1), $now->endOfDay()],
            'custom' => [
                CarbonImmutable::parse($request->query('from') ?: $now->startOfYear())->startOfDay(),
                CarbonImmutable::parse($request->query('to') ?: $now)->endOfDay(),
            ],
            default => [$now->startOfYear(), $now->endOfYear()],
        };
        if ($from->gt($to)) {
            [$from, $to] = [$to->startOfDay(), $from->endOfDay()];
        }

        return [$type, $range, $from, $to];
    }

    private function overview(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $income = $this->income($from, $to);
        $expenses = $this->expenses($from, $to);

        return [
            'members' => Member::whereIn('status', Member::ACCEPTED)->count(),
            'members_total' => Member::count(),
            'income' => $income,
            'expenses' => $expenses,
            'net' => round($income - $expenses, 2),
            'events' => Event::whereBetween('start_date', [$from, $to])->count(),
            'attendance' => (int) AttendanceSession::whereBetween('service_date', [$from->toDateString(), $to->toDateString()])->sum('total_present'),
            'baptisms' => Baptism::whereBetween('baptism_date', [$from->toDateString(), $to->toDateString()])->count(),
            'prayers' => PrayerRequest::whereBetween('created_at', [$from, $to])->count(),
        ];
    }

    private function income(CarbonImmutable $from, CarbonImmutable $to): float
    {
        $r = [$from->toDateString(), $to->toDateString()];

        return round(Money::sum(Tithe::whereBetween('tithe_date', $r)) + Money::sum(Offering::whereBetween('offering_date', $r)) + Money::sum(Donation::whereBetween('donation_date', $r)), 2);
    }

    private function expenses(CarbonImmutable $from, CarbonImmutable $to): float
    {
        return Money::sum(Expense::whereBetween('expense_date', [$from->toDateString(), $to->toDateString()])->whereIn('status', ['Paid', 'Approved']));
    }

    /**
     * @return array{type: string, title: string, period: string, summary: array<int, array{label: string, value: string}>, sections: array<int, array{title: string, columns: array<int, string>, rows: array<int, array<int, string>>}>}
     */
    public function build(string $type, CarbonImmutable $from, CarbonImmutable $to, string $range = 'custom'): array
    {
        $period = $range === 'all_time' ? 'All time' : $from->format('M j, Y').' – '.$to->format('M j, Y');
        [$summary, $sections] = match ($type) {
            'finance' => $this->finance($from, $to),
            'attendance' => $this->attendance($from, $to),
            'sacraments' => $this->sacraments($from, $to),
            'ministry' => $this->ministry($from, $to),
            'events' => $this->events($from, $to),
            default => $this->membership($from, $to),
        };

        return [
            'type' => $type,
            'title' => self::TYPES[$type],
            'range_label' => self::RANGES[$range] ?? 'Custom Range',
            'period' => $period,
            'generated_at' => now()->format('F j, Y g:i A'),
            'summary' => array_map(fn ($r) => ['label' => $r[0], 'value' => (string) $r[1]], $summary),
            'sections' => array_values(array_filter($sections, fn ($s) => $s !== null)),
        ];
    }

    private function section(string $title, array $columns, iterable $rows, string $empty = 'No records for this period.'): array
    {
        $rows = collect($rows)->map(fn ($r) => array_map(fn ($v) => $v === null || $v === '' ? '—' : (string) $v, array_values((array) $r)))->values()->all();

        return ['title' => $title, 'columns' => $columns, 'rows' => $rows, 'empty' => $empty];
    }

    private function d($v): string
    {
        return $v ? CarbonImmutable::parse($v)->format('M j, Y') : '—';
    }

    private function membership(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $all = Member::count();
        $active = Member::whereIn('status', Member::ACCEPTED)->count();
        // Count in SQL; list at most the latest NEW_MEMBER_ROWS so a busy period can't exhaust memory.
        $newCount = Member::whereBetween('created_at', [$from, $to])->count();
        $new = Member::whereBetween('created_at', [$from, $to])->orderByDesc('created_at')->limit(self::NEW_MEMBER_ROWS)
            ->get(['id', 'member_id', 'first_name', 'last_name', 'phone', 'status', 'created_at']);

        return [[
            ['Total members on record', $all],
            ['Active / approved members', $active],
            ['Pending approval', Member::where('status', 'Pending')->count()],
            ['Inactive members', Member::where('status', 'Inactive')->count()],
            ['New members in period', $newCount],
            ['Baptized members', Member::where('baptized', true)->count()],
        ], [
            $this->section('Members by status', ['Status', 'Members'], Member::select('status', DB::raw('count(*) as n'))->groupBy('status')->orderByDesc('n')->get()->map(fn ($r) => [$r->status, $r->n])),
            $this->section('Members by gender', ['Gender', 'Members'], Member::select('gender', DB::raw('count(*) as n'))->groupBy('gender')->orderByDesc('n')->get()->map(fn ($r) => [$r->gender ?: 'Not recorded', $r->n])),
            $this->section('Members by department', ['Department', 'Members'], Member::select('department', DB::raw('count(*) as n'))->whereNotNull('department')->groupBy('department')->orderByDesc('n')->get()->map(fn ($r) => [$r->department, $r->n])),
            $this->section('New members in period'.($newCount > $new->count() ? ' (latest '.$new->count().' of '.number_format($newCount).')' : ''), ['Member ID', 'Name', 'Phone', 'Status', 'Registered'], $new->map(fn (Member $m) => [$m->member_id, $m->full_name, $m->phone, $m->status, $this->d($m->created_at)])),
        ]];
    }

    private function finance(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $r = [$from->toDateString(), $to->toDateString()];
        $tithes = Money::sum(Tithe::whereBetween('tithe_date', $r));
        $offerings = Money::sum(Offering::whereBetween('offering_date', $r));
        $donations = Money::sum(Donation::whereBetween('donation_date', $r));
        $expenses = $this->expenses($from, $to);
        $income = $tithes + $offerings + $donations;
        $byCur = fn (string $class, string $field, string $cur) => (float) $class::where('currency', $cur)->whereBetween($field, $r)->sum('amount');

        return [[
            ['Default currency', Money::base().' (rate: $1 = L$'.number_format(Money::rate(), 2).')'],
            ['Tithes', Money::dual($tithes)],
            ['Offerings', Money::dual($offerings)],
            ['Donations', Money::dual($donations)],
            ['Total income', Money::dual($income)],
            ['Expenses (approved + paid)', Money::dual($expenses)],
            ['Net balance', Money::dual($income - $expenses)],
        ], [
            $this->section('Income received by currency (as paid)', ['Type', 'USD', 'LRD'], collect([['Tithes', Tithe::class, 'tithe_date'], ['Offerings', Offering::class, 'offering_date'], ['Donations', Donation::class, 'donation_date']])
                ->map(fn ($x) => [$x[0], Money::format($byCur($x[1], $x[2], 'USD'), 'USD'), Money::format($byCur($x[1], $x[2], 'LRD'), 'LRD')])),
            $this->section('Expenses by category ('.Money::base().')', ['Category', 'Amount'], Expense::whereBetween('expense_date', $r)->whereIn('status', ['Paid', 'Approved'])->toBase()
                ->selectRaw('category, sum('.Money::sql().') as total')->groupBy('category')->orderByDesc('total')->get()
                ->map(fn ($x) => [str($x->category)->replace('_', ' ')->title(), Money::format((float) $x->total)])),
            $this->section('Income by fund ('.Money::base().')', ['Fund', 'Amount'], collect([[Tithe::class, 'tithe_date'], [Offering::class, 'offering_date'], [Donation::class, 'donation_date']])
                ->flatMap(fn ($x) => $x[0]::whereBetween($x[1], $r)->toBase()->selectRaw('fund_name, sum('.Money::sql().') as total')->groupBy('fund_name')->get())
                ->groupBy('fund_name')->map(fn ($g, $fund) => [$fund, Money::format((float) $g->sum('total'))])->values()),
            $this->section('Top givers in period ('.Money::base().')', ['Name', 'Gifts', 'Total'], collect([[Tithe::class, 'tithe_date', 'member_name'], [Offering::class, 'offering_date', 'member_name'], [Donation::class, 'donation_date', 'donor_name']])
                // Aggregated in SQL (Phase 3, F07): one row per giver per table, not every gift in the period.
                ->flatMap(fn ($x) => $x[0]::whereBetween($x[1], $r)->whereNotNull($x[2])->toBase()
                    ->selectRaw("{$x[2]} as name, count(*) as gifts, sum(".Money::sql().') as total')->groupBy($x[2])->get())
                ->filter(fn ($g) => $g->name && ! in_array($g->name, ['Anonymous Donor', 'Congregation (plate offering)'], true) && ! str_starts_with($g->name, 'Service collection'))
                ->groupBy('name')->map(fn ($g, $name) => [$name, (int) $g->sum('gifts'), (float) $g->sum('total')])
                ->sortByDesc(fn ($x) => $x[2])->take(15)->map(fn ($x) => [$x[0], $x[1], Money::format($x[2])])->values()),
        ]];
    }

    private function attendance(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $sessions = AttendanceSession::whereBetween('service_date', [$from->toDateString(), $to->toDateString()])->orderBy('service_date')->get();
        $label = fn ($s) => $s->service_type instanceof \BackedEnum ? str($s->service_type->value)->headline()->toString() : str((string) $s->service_type)->headline()->toString();
        $best = $sessions->sortByDesc('total_present')->first();

        return [[
            ['Services recorded', $sessions->count()],
            ['Total attendance', (int) $sessions->sum('total_present')],
            ['Average attendance per service', $sessions->count() ? round($sessions->avg('total_present'), 1) : 0],
            ['Highest attendance', $best ? $best->total_present.' ('.$this->d($best->service_date).')' : '—'],
            ['Total late arrivals', (int) $sessions->sum('total_late')],
            ['Total absences recorded', (int) $sessions->sum('total_absent')],
        ], [
            $this->section('By service type', ['Service', 'Sessions', 'Total present', 'Average'], $sessions->groupBy($label)->map(fn ($g, $k) => [$k, $g->count(), (int) $g->sum('total_present'), round($g->avg('total_present'), 1)])->values()),
            $this->section('Services', ['Date', 'Service', 'Preacher', 'Present', 'Late', 'Absent'], $sessions->map(fn ($s) => [$this->d($s->service_date), $s->title ?: $label($s), $s->preacher, (int) $s->total_present, (int) $s->total_late, (int) $s->total_absent])),
        ]];
    }

    private function sacraments(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $r = [$from->toDateString(), $to->toDateString()];
        $baptisms = Baptism::whereBetween('baptism_date', $r)->orderBy('baptism_date')->get();
        $communions = Communion::whereBetween('service_date', $r)->orderBy('service_date')->get();
        $weddings = Wedding::whereBetween('wedding_date', $r)->orderBy('wedding_date')->get();
        $funerals = Funeral::whereBetween('funeral_date', $r)->orderBy('funeral_date')->get();

        return [[
            ['Baptisms', $baptisms->count()],
            ['Communion services', $communions->count().' ('.(int) $communions->sum('attendance_count').' participants)'],
            ['Weddings', $weddings->count()],
            ['Funerals', $funerals->count()],
            ['Certificates & letters issued', DocumentRequest::where('status', 'Approved')->whereBetween('updated_at', [$from, $to])->count()],
        ], [
            $this->section('Baptisms', ['Date', 'Candidate', 'Type', 'Officiant', 'Certificate'], $baptisms->map(fn ($b) => [$this->d($b->baptism_date), $b->candidate_name, $b->baptism_type, $b->officiant, $b->certificate_number])),
            $this->section('Communion services', ['Date', 'Service', 'Officiant', 'Participants'], $communions->map(fn ($c) => [$this->d($c->service_date), $c->service_name, $c->officiant, (int) $c->attendance_count])),
            $this->section('Weddings', ['Date', 'Couple', 'Location', 'Officiant'], $weddings->map(fn ($w) => [$this->d($w->wedding_date), "{$w->groom_name} & {$w->bride_name}", $w->location, $w->officiant])),
            $this->section('Funerals', ['Date', 'Deceased', 'Location', 'Officiant'], $funerals->map(fn ($f) => [$this->d($f->funeral_date), $f->deceased_name, $f->location, $f->officiant])),
        ]];
    }

    private function ministry(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $prayers = PrayerRequest::whereBetween('created_at', [$from, $to]);
        $care = PastoralCare::whereBetween('created_at', [$from, $to]);

        return [[
            ['Active departments', Department::where('is_active', true)->count()],
            ['Active ministries', Ministry::where('is_active', true)->count()],
            ['Prayer requests received', (clone $prayers)->count()],
            ['Prayer requests answered', (clone $prayers)->where('status', 'Answered')->count()],
            ['Pastoral care cases opened', (clone $care)->count()],
            ['Pastoral care cases closed', (clone $care)->whereIn('status', ['Closed', 'Completed', 'Resolved'])->count()],
        ], [
            $this->section('Departments', ['Department', 'Leader', 'Members'], Department::where('is_active', true)->withCount('members')->orderBy('name')->get()
                ->map(fn ($d) => [$d->name, $d->leader_name, max((int) $d->members_count, (int) $d->member_count)])),
            $this->section('Ministries', ['Ministry', 'Leader', 'Members'], Ministry::where('is_active', true)->orderBy('name')->get()->map(fn ($m) => [$m->name, $m->leader_name, (int) $m->member_count])),
            $this->section('Prayer requests by status', ['Status', 'Requests'], (clone $prayers)->select('status', DB::raw('count(*) as n'))->groupBy('status')->get()->map(fn ($x) => [$x->status, $x->n])),
            $this->section('Pastoral care by type', ['Type', 'Cases'], (clone $care)->select('care_type', DB::raw('count(*) as n'))->groupBy('care_type')->get()->map(fn ($x) => [$x->care_type, $x->n])),
        ]];
    }

    private function events(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $events = Event::whereBetween('start_date', [$from, $to])->orderBy('start_date')->get();
        $sermons = Sermon::whereBetween('sermon_date', [$from->toDateString(), $to->toDateString()])->orderBy('sermon_date')->get();

        return [[
            ['Events', $events->count()],
            ['Completed events', $events->where('status', 'Completed')->count()],
            ['Upcoming events', $events->where('status', 'Upcoming')->count()],
            ['Registrations', (int) $events->sum('registered_count')],
            ['Sermons', $sermons->count()],
            ['Announcements posted', Announcement::whereBetween('created_at', [$from, $to])->count()],
        ], [
            $this->section('Events', ['Date', 'Event', 'Type', 'Location', 'Status', 'Registered'], $events->map(fn ($e) => [$this->d($e->start_date), $e->title, $e->event_type, $e->location, $e->status, $e->max_attendees ? "{$e->registered_count}/{$e->max_attendees}" : (int) $e->registered_count])),
            $this->section('Sermons', ['Date', 'Title', 'Speaker', 'Scripture', 'Views'], $sermons->map(fn ($s) => [$this->d($s->sermon_date), $s->title, $s->speaker_name, $s->scripture_reference, (int) $s->view_count])),
        ]];
    }
}
