import { Head, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import { PdfButton } from '@/components/ssbcms/PdfViewer';
import ApprovalSection from '@/components/ssbcms/reports/ApprovalSection';
import LedgerTable from '@/components/ssbcms/reports/LedgerTable';
import ReportChartsSection from '@/components/ssbcms/reports/ReportCharts';
import ReportLetterhead from '@/components/ssbcms/reports/ReportLetterhead';
import type {
    Approvals,
    Ledger,
    ReportCharts,
} from '@/components/ssbcms/reports/types';
import { fmtMoney, useMoney } from '@/lib/finance';

type Section = {
    title: string;
    columns: string[];
    rows: string[][];
    empty: string;
};
type Report = {
    type: string;
    title: string;
    range_label: string;
    period: string;
    /** "Gender: Male · Department: Youth", or '' for the whole report. */
    filters: string;
    generated_at: string;
    summary: { label: string; value: string }[];
    sections: Section[];
};
/** A filter the report offers (App\Support\ReportFilters::definitions()). */
type FilterOption = { label: string; options: Record<string, string> };
type Overview = {
    members: number;
    members_total: number;
    income: number;
    expenses: number;
    net: number;
    events: number;
    attendance: number;
    baptisms: number;
    prayers: number;
    members_new?: number | null;
    members_growth?: number | null;
    members_growth_pct?: number | null;
    attendance_avg?: number | null;
    closing_balance?: number | null;
};
type Props = {
    type: string;
    range: string;
    from: string;
    to: string;
    types: Record<string, string>;
    ranges: Record<string, string>;
    filterOptions: Record<string, FilterOption>;
    filters: Record<string, string>;
    overview: Overview;
    report: Report;
    charts?: ReportCharts | null;
    ledger?: Ledger | null;
    approvals?: Approvals | null;
};

const TYPE_STYLE: Record<string, { icon: string; color: string }> = {
    membership: { icon: 'UsersIcon', color: 'bg-blue-500' },
    finance: { icon: 'BanknotesIcon', color: 'bg-green-500' },
    full: { icon: 'ChartBarIcon', color: 'bg-teal-600' },
    attendance: { icon: 'CalendarDaysIcon', color: 'bg-purple-500' },
    sacraments: { icon: 'SparklesIcon', color: 'bg-amber-500' },
    ministry: { icon: 'HeartIcon', color: 'bg-rose-500' },
    events: { icon: 'CalendarIcon', color: 'bg-indigo-500' },
};
const FALLBACK_STYLE = { icon: 'ChartBarIcon', color: 'bg-slate-500' };

type KpiKey =
    | 'members_total'
    | 'members'
    | 'members_new'
    | 'growth'
    | 'attendance'
    | 'attendance_avg'
    | 'income'
    | 'expenses'
    | 'net'
    | 'closing_balance'
    | 'events'
    | 'baptisms'
    | 'prayers';

/** The headline figures that belong to each report, in reading order. */
const KPI_SETS: Record<string, KpiKey[]> = {
    membership: ['members_total', 'members', 'members_new', 'growth'],
    finance: ['income', 'expenses', 'net', 'closing_balance'],
    full: [
        'members_total',
        'members',
        'members_new',
        'growth',
        'income',
        'expenses',
        'net',
        'closing_balance',
    ],
    attendance: ['attendance', 'attendance_avg', 'members', 'events'],
    sacraments: ['baptisms', 'members_total', 'members', 'members_new'],
    ministry: ['prayers', 'members', 'events', 'attendance_avg'],
    events: ['events', 'attendance', 'attendance_avg', 'members'],
};

function KPICard({
    label,
    value,
    icon,
    color,
    sub,
}: {
    label: string;
    value: string | number;
    icon: string;
    color: string;
    sub?: string;
}) {
    return (
        <div className="flex break-inside-avoid items-center gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${color}`}
            >
                <Icon name={icon} size={22} className="text-white" />
            </div>
            <div className="min-w-0">
                <p className="truncate text-xl font-bold text-foreground tabular-nums sm:text-2xl">
                    {value}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                    {label}
                </p>
                {sub && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

const NUMERIC = /^[-+]?\(?[A-Za-z$£€]{0,4}\s?-?[\d,]+(\.\d+)?\)?%?$/;

function isNumericColumn(rows: string[][], j: number) {
    const vals = rows
        .map((r) => (r[j] ?? '').trim())
        .filter((v) => v && v !== '—' && v !== '-');
    return vals.length > 0 && vals.every((v) => NUMERIC.test(v));
}

/** Structured table: numeric columns right-aligned, zebra rows, bold total rows, no inner scrolling. */
function DataTable({ s, n }: { s: Section; n: string }) {
    const numeric = s.columns.map((_, j) => isNumericColumn(s.rows, j));
    return (
        <section className="break-inside-avoid overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                    <span className="mr-2 text-muted-foreground">{n}</span>
                    {s.title}
                </h3>
                <span className="text-xs text-muted-foreground">
                    {s.rows.length} row{s.rows.length === 1 ? '' : 's'}
                </span>
            </div>
            {s.rows.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                    {s.empty}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-120 border-collapse text-sm print:text-xs">
                        <thead>
                            <tr className="border-b-2 border-border bg-muted/60">
                                <th className="w-10 px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                                    #
                                </th>
                                {s.columns.map((c, j) => (
                                    <th
                                        key={c}
                                        className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-muted-foreground ${numeric[j] ? 'text-right' : 'text-left'}`}
                                    >
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {s.rows.map((r, i) => {
                                const isTotal = /^(grand\s+)?total/i.test(
                                    (r[0] ?? '').trim(),
                                );
                                return (
                                    <tr
                                        key={i}
                                        className={`break-inside-avoid border-t border-border ${isTotal ? 'border-t-2 bg-muted/50 font-semibold' : 'even:bg-muted/20'}`}
                                    >
                                        <td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
                                            {isTotal ? '' : i + 1}
                                        </td>
                                        {r.map((v, j) => (
                                            <td
                                                key={j}
                                                className={`px-4 py-2 text-foreground ${numeric[j] ? 'text-right tabular-nums' : 'text-left'}`}
                                            >
                                                {v}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

/** Numbered part of the report document ("1. Summary", "2. Charts and graphs" …). */
function Part({
    n,
    title,
    subtitle,
    children,
}: {
    n: number;
    title: string;
    subtitle?: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-3">
            <div className="border-b-2 border-primary/20 pb-2">
                <h2 className="text-lg font-semibold text-foreground">
                    <span className="mr-2 text-primary">{n}.</span>
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
            </div>
            {children}
        </section>
    );
}

export default function Reports({
    type,
    range,
    from,
    to,
    types,
    ranges,
    filterOptions,
    filters,
    overview,
    report,
    charts,
    ledger,
    approvals,
}: Props) {
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;
    const { base, equiv } = useMoney();
    const [custom, setCustom] = useState({ from, to });
    const [loading, setLoading] = useState(false);
    const filtered = Object.keys(filters).length > 0;

    /**
     * Query for the page, the PDF and the exports. The current filters are
     * kept, except when switching to another report type (its filters differ);
     * an empty value removes a filter.
     */
    const query = (extra: Record<string, string> = {}) => {
        const keep = 'type' in extra ? {} : filters;
        const q: Record<string, string> = { type, range, ...keep, ...extra };
        if ((extra.range ?? range) === 'custom')
            Object.assign(q, { from: custom.from, to: custom.to });
        return Object.fromEntries(
            Object.entries(q).filter(([, v]) => v !== ''),
        );
    };
    const clearFilters = () =>
        go(Object.fromEntries(Object.keys(filters).map((k) => [k, ''])));
    const go = (extra: Record<string, string>) =>
        router.get('/reports', query(extra), {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    const url = (path: string, extra: Record<string, string> = {}) =>
        `${path}?${new URLSearchParams(query(extra)).toString()}`;

    const growth = overview.members_growth;
    const money = (v: number) => fmtMoney(v, base, 0);
    const kpi: Record<KpiKey, Parameters<typeof KPICard>[0] | null> = {
        members_total: {
            label: 'Total Members',
            value: overview.members_total.toLocaleString(),
            icon: 'UsersIcon',
            color: 'bg-blue-600',
        },
        members: {
            label: 'Active Members',
            value: overview.members.toLocaleString(),
            icon: 'UserGroupIcon',
            color: 'bg-blue-500',
        },
        members_new:
            overview.members_new != null
                ? {
                      label: 'New Members',
                      value: overview.members_new.toLocaleString(),
                      icon: 'UserPlusIcon',
                      color: 'bg-teal-500',
                      sub: 'Joined in this period',
                  }
                : null,
        growth:
            growth != null
                ? {
                      label: 'Membership Growth',
                      value: `${growth >= 0 ? '+' : ''}${growth.toLocaleString()}`,
                      icon: 'ArrowTrendingUpIcon',
                      color: 'bg-cyan-600',
                      sub:
                          overview.members_growth_pct != null
                              ? `${overview.members_growth_pct >= 0 ? '+' : ''}${overview.members_growth_pct.toFixed(1)}% on the opening count`
                              : undefined,
                  }
                : null,
        attendance: {
            label: 'Attendance',
            value: overview.attendance.toLocaleString(),
            icon: 'CalendarDaysIcon',
            color: 'bg-purple-500',
            sub: 'Total present at services',
        },
        attendance_avg:
            overview.attendance_avg != null
                ? {
                      label: 'Average Attendance',
                      value: overview.attendance_avg,
                      icon: 'ChartBarIcon',
                      color: 'bg-violet-500',
                      sub: 'Per service',
                  }
                : null,
        income: {
            label: 'Income',
            value: money(overview.income),
            icon: 'BanknotesIcon',
            color: 'bg-green-500',
            sub: equiv(overview.income),
        },
        expenses: {
            label: 'Expenses',
            value: money(overview.expenses),
            icon: 'ArrowTrendingDownIcon',
            color: 'bg-red-500',
            sub: equiv(overview.expenses),
        },
        net: {
            label: 'Net Balance',
            value: money(overview.net),
            icon: 'ScaleIcon',
            color: overview.net >= 0 ? 'bg-emerald-600' : 'bg-red-600',
            sub: 'Income less expenses in this period',
        },
        closing_balance:
            overview.closing_balance != null
                ? {
                      label: 'Closing Balance',
                      value: money(overview.closing_balance),
                      icon: 'BuildingLibraryIcon',
                      color: 'bg-emerald-700',
                      sub: 'All income less all spending to date',
                  }
                : null,
        events: {
            label: 'Events',
            value: overview.events.toLocaleString(),
            icon: 'CalendarIcon',
            color: 'bg-indigo-500',
        },
        baptisms: {
            label: 'Baptisms',
            value: overview.baptisms.toLocaleString(),
            icon: 'SparklesIcon',
            color: 'bg-amber-500',
        },
        prayers: {
            label: 'Prayer Requests',
            value: overview.prayers.toLocaleString(),
            icon: 'HandRaisedIcon',
            color: 'bg-rose-500',
        },
    };
    const kpis = (KPI_SETS[type] ?? KPI_SETS.membership)
        .map((k) => kpi[k])
        .filter((k): k is NonNullable<typeof k> => k !== null);

    // Parts are numbered in the order they appear.
    let part = 0;
    const next = () => ++part;
    const exportCls =
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Reports" />

            {/* Controls — never printed. */}
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Reports
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Choose a report and period, then view, print or export
                        it on the church letterhead
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={range}
                        onChange={(e) => go({ range: e.target.value })}
                        aria-label="Report period"
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    >
                        {Object.entries(ranges).map(([k, l]) => (
                            <option key={k} value={k}>
                                {l}
                            </option>
                        ))}
                    </select>
                    {range === 'custom' && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <input
                                type="date"
                                value={custom.from}
                                aria-label="From"
                                onChange={(e) =>
                                    setCustom((c) => ({
                                        ...c,
                                        from: e.target.value,
                                    }))
                                }
                                className="rounded-lg border border-border bg-card px-2 py-2 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">
                                to
                            </span>
                            <input
                                type="date"
                                value={custom.to}
                                aria-label="To"
                                onChange={(e) =>
                                    setCustom((c) => ({
                                        ...c,
                                        to: e.target.value,
                                    }))
                                }
                                className="rounded-lg border border-border bg-card px-2 py-2 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => go({ range: 'custom' })}
                                className="btn-outline px-3 py-2 text-xs"
                            >
                                Apply
                            </button>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
                        <PdfButton
                            url={url('/reports/pdf')}
                            title={`${report.title} — ${report.period}`}
                            className={exportCls}
                        >
                            <Icon name="PrinterIcon" size={14} />
                            View / Print
                        </PdfButton>
                        <PdfButton
                            url={url('/reports/pdf', { download: '1' })}
                            title={`${report.title} — ${report.period}`}
                            download
                            className={exportCls}
                        >
                            <Icon name="DocumentArrowDownIcon" size={14} />
                            PDF
                        </PdfButton>
                        <a
                            href={url('/reports/export', { format: 'excel' })}
                            className={exportCls}
                        >
                            <Icon name="TableCellsIcon" size={14} />
                            Excel
                        </a>
                        <a
                            href={url('/reports/export', { format: 'csv' })}
                            className={exportCls}
                        >
                            <Icon name="DocumentTextIcon" size={14} />
                            CSV
                        </a>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 print:hidden">
                {Object.entries(types).map(([id, label]) => {
                    const s = TYPE_STYLE[id] ?? FALLBACK_STYLE;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => go({ type: id })}
                            aria-pressed={type === id}
                            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${type === id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}
                        >
                            <div
                                className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}
                            >
                                <Icon
                                    name={s.icon}
                                    size={18}
                                    className="text-white"
                                />
                            </div>
                            <span className="text-center text-xs leading-tight font-medium text-foreground">
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {Object.keys(filterOptions).length > 0 && (
                <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 print:hidden">
                    <div className="flex items-center gap-2 self-center text-sm font-medium text-foreground">
                        <Icon name="FunnelIcon" size={16} />
                        Filter this report
                    </div>
                    {Object.entries(filterOptions).map(([key, f]) => (
                        <label key={key} className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">
                                {f.label}
                            </span>
                            <select
                                value={filters[key] ?? ''}
                                onChange={(e) => go({ [key]: e.target.value })}
                                className={`min-w-40 rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none ${filters[key] ? 'border-primary' : 'border-border'}`}
                            >
                                <option value="">All</option>
                                {Object.entries(f.options).map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ))}
                    {filtered && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="btn-ghost px-3 py-2 text-xs"
                        >
                            <Icon name="XMarkIcon" size={14} />
                            Clear filters
                        </button>
                    )}
                    <p className="w-full text-xs text-muted-foreground">
                        Filters apply to the figures, charts, tables, print, PDF
                        and exports.
                    </p>
                </div>
            )}

            {/* The report document. */}
            <article
                className={`mx-auto max-w-6xl space-y-8 transition-opacity ${loading ? 'opacity-60' : ''}`}
            >
                <ReportLetterhead
                    title={report.title}
                    rangeLabel={report.range_label}
                    period={report.period}
                    generatedAt={report.generated_at}
                />

                {report.filters && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                        <Icon
                            name="FunnelIcon"
                            size={16}
                            className="text-primary"
                        />
                        <span className="font-medium text-foreground">
                            Filtered by:
                        </span>
                        <span className="text-foreground">
                            {report.filters}
                        </span>
                    </div>
                )}

                {kpis.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
                        {kpis.map((k) => (
                            <KPICard key={k.label} {...k} />
                        ))}
                    </div>
                )}

                <Part
                    n={next()}
                    title="Summary"
                    subtitle={`${report.title} · ${report.period}${report.filters ? ` · ${report.filters}` : ''} · amounts in ${base}`}
                >
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-border bg-muted/60">
                                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                                        Measure
                                    </th>
                                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.summary.map((r) => (
                                    <tr
                                        key={r.label}
                                        className="break-inside-avoid border-t border-border even:bg-muted/20"
                                    >
                                        <td className="px-5 py-2.5 text-muted-foreground">
                                            {r.label}
                                        </td>
                                        <td className="px-5 py-2.5 text-right font-medium text-foreground tabular-nums">
                                            {r.value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Part>

                {charts && (
                    <Part
                        n={next()}
                        title="Charts and graphs"
                        subtitle="Drawn from the same records as the tables below"
                    >
                        <ReportChartsSection charts={charts} currency={base} />
                    </Part>
                )}

                {report.sections.length > 0 && (
                    <Part
                        n={next()}
                        title="Detailed tables"
                        subtitle={`${report.sections.length} table${report.sections.length === 1 ? '' : 's'}`}
                    >
                        <div className="space-y-5">
                            {report.sections.map((s, i) => (
                                <DataTable
                                    key={s.title}
                                    s={s}
                                    n={`${part}.${i + 1}`}
                                />
                            ))}
                        </div>
                    </Part>
                )}

                {ledger && (
                    <Part
                        n={next()}
                        title="Financial ledger"
                        subtitle={`Opening balance ${fmtMoney(ledger.opening_balance, base)} → closing balance ${fmtMoney(ledger.closing_balance, base)}`}
                    >
                        <LedgerTable ledger={ledger} currency={base} />
                    </Part>
                )}

                {approvals ? (
                    <Part n={next()} title="Approval">
                        <ApprovalSection
                            approvals={approvals}
                            type={type}
                            from={from}
                            to={to}
                        />
                    </Part>
                ) : (
                    filtered && (
                        <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground print:hidden">
                            Approval signatures are for the whole report.{' '}
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="font-medium text-primary hover:underline"
                            >
                                Clear the filters
                            </button>{' '}
                            to sign it.
                        </p>
                    )
                )}

                <footer className="border-t border-border pt-3 text-center text-xs text-muted-foreground">
                    {report.title} · {report.period}
                    {report.filters ? ` · ${report.filters}` : ''} · generated{' '}
                    {report.generated_at} by {auth.user.name}
                </footer>
            </article>
        </div>
    );
}
