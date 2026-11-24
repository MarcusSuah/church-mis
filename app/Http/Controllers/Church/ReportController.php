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
use App\Models\ReportSignature;
use App\Models\Sermon;
use App\Models\Tithe;
use App\Models\Wedding;
use App\Services\ReportDatasets;
use App\Support\ChurchLogo;
use App\Support\Csv;
use App\Support\Money;
use App\Support\ReportFilters;
use App\Support\StatsCache;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Church reports. Each report is built once (build()) and rendered three
 * ways: on screen, in the letter-headed PDF template, or as CSV / Excel.
 * Optional filters (ReportFilters) narrow every part of a report the same way.
 */
class ReportController extends Controller
{
    public const TYPES = [
        'membership' => 'Membership Report',
        'finance' => 'Finance Report',
        'full' => 'Membership & Financial Report',
        'attendance' => 'Attendance Report',
        'sacraments' => 'Sacraments Report',
        'ministry' => 'Ministry & Pastoral Care Report',
        'events' => 'Events & Content Report',
    ];

    /** Rows listed in the "New members in period" table (the count above it covers all of them). */
    private const NEW_MEMBER_ROWS = 500;

    /** Rows listed in the filtered member list (e.g. all male members). */
    private const MEMBER_LIST_ROWS = 1000;

    /** @var list<class-string> */
    private const GIVING_MODELS = [Tithe::class, Offering::class, Donation::class];

    /** @var list<array{0: string, 1: class-string, 2: string, 3: string, 4: string}> source, model, date column, giver column, label */
    private const GIFTS = [
        ['tithes', Tithe::class, 'tithe_date', 'member_name', 'Tithes'],
        ['offerings', Offering::class, 'offering_date', 'member_name', 'Offerings'],
        ['donations', Donation::class, 'donation_date', 'donor_name', 'Donations'],
    ];

    public const RANGES = [
        'this_month' => 'This Month',
        'last_month' => 'Last Month',
        'this_quarter' => 'This Quarter',
        'last_quarter' => 'Last Quarter',
        'this_year' => 'This Year',
        'last_year' => 'Last Year',
        'all_time' => 'All Time',
        'custom' => 'Custom Range',
    ];

    /** Reports that include the income / expenditure ledger. */
    private const LEDGER_TYPES = ['finance', 'full'];

    public function __construct(private ReportDatasets $datasets) {}

    public function index(Request $request): Response
    {
        [$type, $range, $from, $to, $filters] = $this->params($request);
        $report = $this->build($type, $from, $to, $range, $filters);
        $ledger = in_array($type, self::LEDGER_TYPES, true) ? $this->datasets->ledger($from, $to, $filters) : null;

        return Inertia::render('reports/index', [
            'type' => $type,
            'range' => $range,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'types' => self::TYPES,
            'ranges' => self::RANGES,
            'filterOptions' => ReportFilters::definitions($type),
            'filters' => (object) $filters->values(),
            'overview' => [...$this->overview($from, $to, $filters), ...$this->datasets->overviewExtras($from, $to, $ledger, $filters)],
            'report' => $report,
            'charts' => $this->datasets->charts($type, $from, $to, $filters),
            'ledger' => $ledger,
            // A filtered view is a working copy; only the whole report is signed.
            'approvals' => $filters->isEmpty()
                ? ReportSignature::approvalsFor($type, $from->toDateString(), $to->toDateString(), $request->user(), ReportSignature::fingerprint($report))
                : null,
        ]);
    }

    /**
     * Fingerprint of a report's figures (always the unfiltered report), used
     * when a position signs it (ReportSignatureController) and to flag
     * signatures made before the figures changed.
     */
    public function fingerprint(string $type, string $from, string $to): string
    {
        $type = array_key_exists($type, self::TYPES) ? $type : 'membership';

        return ReportSignature::fingerprint(
            $this->build($type, CarbonImmutable::parse($from)->startOfDay(), CarbonImmutable::parse($to)->endOfDay())
        );
    }

    /** The report inside the church letterhead, for viewing and printing. */
    public function pdf(Request $request)
    {
        [$type, $range, $from, $to, $filters] = $this->params($request);
        $report = $this->build($type, $from, $to, $range, $filters);
        $signatures = $filters->isEmpty()
            ? ReportSignature::where('report_type', $type)
                ->whereDate('period_from', $from->toDateString())->whereDate('period_to', $to->toDateString())
                ->get()->keyBy('position')
            : collect();
        $pdf = Pdf::loadView('pdf.report', [
            'report' => $report,
            'church' => config('church'),
            'logo' => ChurchLogo::dataUri(),
            'generatedBy' => $request->user()->name,
            'charts' => $this->datasets->forPdf($this->datasets->charts($type, $from, $to, $filters)),
            'ledger' => in_array($type, self::LEDGER_TYPES, true) ? $this->datasets->ledger($from, $to, $filters) : null,
            'signatories' => collect(ReportSignature::POSITIONS)->map(fn (string $label, string $key) => [
                'position' => $label,
                'name' => $signatures->get($key)?->signer_name,
                'image' => $signatures->get($key)?->dataUri(),
                'signed_at' => $signatures->get($key)?->signed_at?->format('M j, Y'),
            ])->values()->all(),
        ])->setPaper('a4', 'portrait');
        // "Page X of Y" in the bottom-right corner of every page.
        $pdf->render();
        $canvas = $pdf->getDomPDF()->getCanvas();
        $canvas->page_text(
            $canvas->get_width() - 92,
            $canvas->get_height() - 30,
            'Page {PAGE_NUM} of {PAGE_COUNT}',
            $pdf->getDomPDF()->getFontMetrics()->getFont('DejaVu Sans'),
            7,
            [0.42, 0.45, 0.5]
        );

        $file = $this->fileName($report).'.pdf';

        return $request->boolean('download') ? $pdf->download($file) : $pdf->stream($file);
    }

    public function export(Request $request): StreamedResponse
    {
        [$type, $range, $from, $to, $filters] = $this->params($request);
        $report = $this->build($type, $from, $to, $range, $filters);
        $excel = $request->query('format') === 'excel';
        $name = $this->fileName($report);

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
            if ($report['filters'] !== '') {
                Csv::put($out, ['Filtered by', $report['filters']]);
            }
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

    /** @return array{0: string, 1: string, 2: CarbonImmutable, 3: CarbonImmutable, 4: ReportFilters} */
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

        return [$type, $range, $from, $to, ReportFilters::fromRequest($request, $type)];
    }

    /** "membership-report-jan-1-2026-dec-31-2026-gender-male". */
    private function fileName(array $report): string
    {
        return (string) str($report['title'].' '.$report['period'].' '.$report['filters'])->slug();
    }

    private function overview(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $income = $this->income($from, $to, $f);
        $expenses = $this->expenses($from, $to, $f);

        return [
            'members' => $f->members(Member::query())->whereIn('status', Member::ACCEPTED)->count(),
            'members_total' => $f->members(Member::query())->count(),
            'income' => $income,
            'expenses' => $expenses,
            'net' => round($income - $expenses, 2),
            'events' => $f->events(Event::whereBetween('start_date', [$from, $to]))->count(),
            'attendance' => (int) $f->sessions(AttendanceSession::whereBetween('service_date', [$from->toDateString(), $to->toDateString()]))->sum('total_present'),
            'baptisms' => $f->includesSacrament('baptisms') ? Baptism::whereBetween('baptism_date', [$from->toDateString(), $to->toDateString()])->count() : 0,
            'prayers' => $f->prayers(PrayerRequest::whereBetween('created_at', [$from, $to]))->count(),
        ];
    }

    private function income(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): float
    {
        $r = [$from->toDateString(), $to->toDateString()];

        // Cached per period and filter until a gift changes (StatsCache), so reopening the report is instant.
        return StatsCache::rememberFor(self::GIVING_MODELS, "income:{$r[0]}:{$r[1]}:{$f->hash()}", fn () => round(
            array_sum(array_map(fn ($g) => Money::sum($f->gifts($g[1]::whereBetween($g[2], $r), $g[0])), self::GIFTS)),
            2
        ));
    }

    /**
     * The 15 biggest givers in the period across tithes, offerings and donations,
     * ranked entirely in SQL (one UNION, grouped and limited), so only 15 rows
     * ever reach PHP however many gifts there are.
     *
     * @param  array{0: string, 1: string}  $r
     * @return Collection<int, object{name: string, gifts: int, total: float}>
     */
    private function topGivers(array $r, ReportFilters $f): Collection
    {
        $parts = array_map(fn ($g) => $f->gifts($g[1]::whereBetween($g[2], $r)->whereNotNull($g[3]), $g[0])->toBase()
            ->selectRaw("{$g[3]} as name, ".Money::sql().' as amount'), self::GIFTS);
        $gifts = $parts[0]->unionAll($parts[1])->unionAll($parts[2]);

        return DB::query()->fromSub($gifts, 'gifts')
            ->selectRaw('name, COUNT(*) as gifts, SUM(amount) as total')
            ->whereNotIn('name', ['', 'Anonymous Donor', 'Congregation (plate offering)'])
            ->where('name', 'not like', 'Service collection%')
            ->groupBy('name')->orderByDesc('total')->limit(15)
            ->get();
    }

    private function expenses(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): float
    {
        $r = [$from->toDateString(), $to->toDateString()];

        return StatsCache::rememberFor([Expense::class], "expenses:{$r[0]}:{$r[1]}:{$f->hash()}",
            fn () => Money::sum($f->expenses(Expense::whereBetween('expense_date', $r)->whereIn('status', ReportDatasets::SPENT))));
    }

    /**
     * @return array{type: string, title: string, range_label: string, period: string, filters: string, generated_at: string, summary: array<int, array{label: string, value: string}>, sections: array<int, array{title: string, columns: array<int, string>, rows: array<int, array<int, string>>, empty: string}>}
     */
    public function build(string $type, CarbonImmutable $from, CarbonImmutable $to, string $range = 'custom', ?ReportFilters $filters = null): array
    {
        $f = $filters ?? ReportFilters::none($type);
        $period = $range === 'all_time' ? 'All time' : $from->format('M j, Y').' – '.$to->format('M j, Y');
        [$summary, $sections] = match ($type) {
            'finance' => $this->finance($from, $to, $f),
            'full' => $this->full($from, $to, $f),
            'attendance' => $this->attendance($from, $to, $f),
            'sacraments' => $this->sacraments($from, $to, $f),
            'ministry' => $this->ministry($from, $to, $f),
            'events' => $this->events($from, $to, $f),
            default => $this->membership($from, $to, $f),
        };

        return [
            'type' => $type,
            'title' => self::TYPES[$type],
            'range_label' => self::RANGES[$range] ?? 'Custom Range',
            'period' => $period,
            'filters' => $f->describe(),
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

    private function membership(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $members = fn () => $f->members(Member::query());
        $all = $members()->count();
        $active = $members()->whereIn('status', Member::ACCEPTED)->count();
        // Count in SQL; list at most the latest NEW_MEMBER_ROWS so a busy period can't exhaust memory.
        $newCount = $members()->whereBetween('created_at', [$from, $to])->count();
        $new = $members()->whereBetween('created_at', [$from, $to])->orderByDesc('created_at')->limit(self::NEW_MEMBER_ROWS)
            ->get(['id', 'member_id', 'first_name', 'last_name', 'phone', 'status', 'created_at']);
        $grouped = fn (string $column, string $empty) => $members()->select($column, DB::raw('count(*) as n'))->groupBy($column)->orderByDesc('n')->get()
            ->map(fn ($r) => [$r->{$column} ?: $empty, $r->n]);

        // Filtered to e.g. male members: list them, as well as the counts.
        $list = null;
        if ($f->filtersMembers()) {
            $rows = $members()->orderBy('last_name')->orderBy('first_name')->limit(self::MEMBER_LIST_ROWS)
                ->get(['member_id', 'first_name', 'last_name', 'gender', 'status', 'department', 'phone', 'date_joined', 'created_at']);
            $list = $this->section(
                'Member list — '.$f->describe().($all > $rows->count() ? ' (first '.$rows->count().' of '.number_format($all).')' : ''),
                ['Member ID', 'Name', 'Gender', 'Status', 'Department', 'Phone', 'Joined'],
                $rows->map(fn (Member $m) => [$m->member_id, $m->full_name, ucfirst((string) $m->gender), $m->status, $m->department, $m->phone, $this->d($m->date_joined ?? $m->created_at)]),
                'No members match these filters.',
            );
        }

        return [[
            ['Total members on record', $all],
            ['Active / approved members', $active],
            ['Pending approval', $members()->where('status', 'Pending')->count()],
            ['Inactive members', $members()->where('status', 'Inactive')->count()],
            ['New members in period', $newCount],
            ['Baptized members', $members()->where('baptized', true)->count()],
        ], [
            $list,
            $this->section('Members by status', ['Status', 'Members'], $grouped('status', 'Not recorded')),
            $this->section('Members by gender', ['Gender', 'Members'], $grouped('gender', 'Not recorded')->map(fn ($r) => [ucfirst((string) $r[0]), $r[1]])),
            $this->section('Members by department', ['Department', 'Members'], $grouped('department', 'No department')),
            $this->section('New members in period'.($newCount > $new->count() ? ' (latest '.$new->count().' of '.number_format($newCount).')' : ''), ['Member ID', 'Name', 'Phone', 'Status', 'Registered'], $new->map(fn (Member $m) => [$m->member_id, $m->full_name, $m->phone, $m->status, $this->d($m->created_at)])),
        ]];
    }

    /** Membership and finance in one report: both summaries, then both sets of tables. */
    private function full(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        [$memberSummary, $memberSections] = $this->membership($from, $to, $f);
        [$financeSummary, $financeSections] = $this->finance($from, $to, $f);

        return [[...$memberSummary, ...$financeSummary], [...$memberSections, ...$financeSections]];
    }

    private function finance(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $r = [$from->toDateString(), $to->toDateString()];

        return StatsCache::rememberFor([...self::GIVING_MODELS, Expense::class], "finance-report:{$r[0]}:{$r[1]}:{$f->hash()}", fn () => $this->buildFinance($from, $to, $f));
    }

    private function buildFinance(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $r = [$from->toDateString(), $to->toDateString()];
        $sources = array_values(array_filter(self::GIFTS, fn ($g) => $f->includesIncome($g[0])));
        $totals = array_map(fn ($g) => Money::sum($f->gifts($g[1]::whereBetween($g[2], $r), $g[0])), $sources);
        $income = array_sum($totals);
        $expenses = $this->expenses($from, $to, $f);
        $byCur = fn (array $g, string $cur) => (float) $f->gifts($g[1]::where('currency', $cur)->whereBetween($g[2], $r), $g[0])->sum('amount');

        return [[
            ['Default currency', Money::base().' (rate: $1 = L$'.number_format(Money::rate(), 2).')'],
            ...array_map(fn ($g, $total) => [$g[4], Money::dual($total)], $sources, $totals),
            ['Total income', Money::dual($income)],
            ['Expenses (approved + paid)', Money::dual($expenses)],
            ['Net balance', Money::dual($income - $expenses)],
        ], [
            $this->section('Income received by currency (as paid)', ['Type', 'USD', 'LRD'],
                array_map(fn ($g) => [$g[4], Money::format($byCur($g, 'USD'), 'USD'), Money::format($byCur($g, 'LRD'), 'LRD')], $sources)),
            $this->section('Expenses by category ('.Money::base().')', ['Category', 'Amount'], $f->expenses(Expense::whereBetween('expense_date', $r)->whereIn('status', ReportDatasets::SPENT))->toBase()
                ->selectRaw('category, sum('.Money::sql().') as total')->groupBy('category')->orderByDesc('total')->get()
                ->map(fn ($x) => [str($x->category)->replace('_', ' ')->title(), Money::format((float) $x->total)])),
            $this->section('Income by fund ('.Money::base().')', ['Fund', 'Amount'], collect($sources)
                ->flatMap(fn ($g) => $f->gifts($g[1]::whereBetween($g[2], $r), $g[0])->toBase()->selectRaw('fund_name, sum('.Money::sql().') as total')->groupBy('fund_name')->get())
                ->groupBy('fund_name')->map(fn ($g, $fund) => [$fund, Money::format((float) $g->sum('total'))])->values()),
            $this->section('Top givers in period ('.Money::base().')', ['Name', 'Gifts', 'Total'], $this->topGivers($r, $f)
                ->map(fn ($g) => [$g->name, (int) $g->gifts, Money::format((float) $g->total)])),
        ]];
    }

    private function attendance(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $sessions = $f->sessions(AttendanceSession::whereBetween('service_date', [$from->toDateString(), $to->toDateString()]))->orderBy('service_date')->get();
        $label = fn (AttendanceSession $s) => $s->typeLabel();
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
            $this->section('Services', ['Date', 'Service', 'Preacher', 'Present', 'Late', 'Absent'], $sessions->map(fn ($s) => [$this->d($s->service_date), $s->title ?: $label($s), $s->preacher, (int) $s->total_present, (int) $s->total_late, (int) $s->total_absent]),
                'No services recorded for this period.'),
        ]];
    }

    private function sacraments(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $r = [$from->toDateString(), $to->toDateString()];
        $load = fn (string $kind, string $class, string $field) => $f->includesSacrament($kind) ? $class::whereBetween($field, $r)->orderBy($field)->get() : null;
        $baptisms = $load('baptisms', Baptism::class, 'baptism_date');
        $communions = $load('communions', Communion::class, 'service_date');
        $weddings = $load('weddings', Wedding::class, 'wedding_date');
        $funerals = $load('funerals', Funeral::class, 'funeral_date');

        return [array_values(array_filter([
            $baptisms ? ['Baptisms', $baptisms->count()] : null,
            $communions ? ['Communion services', $communions->count().' ('.(int) $communions->sum('attendance_count').' participants)'] : null,
            $weddings ? ['Weddings', $weddings->count()] : null,
            $funerals ? ['Funerals', $funerals->count()] : null,
            $f->isEmpty() ? ['Certificates & letters issued', DocumentRequest::where('status', 'Approved')->whereBetween('updated_at', [$from, $to])->count()] : null,
        ])), [
            $baptisms ? $this->section('Baptisms', ['Date', 'Candidate', 'Type', 'Officiant', 'Certificate'], $baptisms->map(fn ($b) => [$this->d($b->baptism_date), $b->candidate_name, $b->baptism_type, $b->officiant, $b->certificate_number])) : null,
            $communions ? $this->section('Communion services', ['Date', 'Service', 'Officiant', 'Participants'], $communions->map(fn ($c) => [$this->d($c->service_date), $c->service_name, $c->officiant, (int) $c->attendance_count])) : null,
            $weddings ? $this->section('Weddings', ['Date', 'Couple', 'Location', 'Officiant'], $weddings->map(fn ($w) => [$this->d($w->wedding_date), "{$w->groom_name} & {$w->bride_name}", $w->location, $w->officiant])) : null,
            $funerals ? $this->section('Funerals', ['Date', 'Deceased', 'Location', 'Officiant'], $funerals->map(fn ($x) => [$this->d($x->funeral_date), $x->deceased_name, $x->location, $x->officiant])) : null,
        ]];
    }

    private function ministry(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $prayers = $f->prayers(PrayerRequest::whereBetween('created_at', [$from, $to]));
        $care = $f->care(PastoralCare::whereBetween('created_at', [$from, $to]));

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

    private function events(CarbonImmutable $from, CarbonImmutable $to, ReportFilters $f): array
    {
        $events = $f->events(Event::whereBetween('start_date', [$from, $to]))->orderBy('start_date')->get();
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
            // Event filters narrow the events; sermons are listed only on the unfiltered report.
            $f->isEmpty() ? $this->section('Sermons', ['Date', 'Title', 'Speaker', 'Scripture', 'Views'], $sermons->map(fn ($s) => [$this->d($s->sermon_date), $s->title, $s->speaker_name, $s->scripture_reference, (int) $s->view_count])) : null,
        ]];
    }
}
