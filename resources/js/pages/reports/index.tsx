import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import { PdfButton } from '@/components/ssbcms/PdfViewer';
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
    generated_at: string;
    summary: { label: string; value: string }[];
    sections: Section[];
};
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
};
type Props = {
    type: string;
    range: string;
    from: string;
    to: string;
    types: Record<string, string>;
    ranges: Record<string, string>;
    overview: Overview;
    report: Report;
};

const TYPE_STYLE: Record<string, { icon: string; color: string }> = {
    membership: { icon: 'UsersIcon', color: 'bg-blue-500' },
    finance: { icon: 'BanknotesIcon', color: 'bg-green-500' },
    attendance: { icon: 'CalendarDaysIcon', color: 'bg-purple-500' },
    sacraments: { icon: 'SparklesIcon', color: 'bg-amber-500' },
    ministry: { icon: 'HeartIcon', color: 'bg-rose-500' },
    events: { icon: 'CalendarIcon', color: 'bg-indigo-500' },
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
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${color}`}
            >
                <Icon name={icon} size={22} className="text-white" />
            </div>
            <div className="min-w-0">
                <p className="truncate text-xl font-bold text-foreground sm:text-2xl">
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

export default function Reports({
    type,
    range,
    from,
    to,
    types,
    ranges,
    overview,
    report,
}: Props) {
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;
    const { base, equiv } = useMoney();
    const [custom, setCustom] = useState({ from, to });
    const [loading, setLoading] = useState(false);

    const query = (extra: Record<string, string> = {}) => {
        const q: Record<string, string> = { type, range, ...extra };
        if ((extra.range ?? range) === 'custom')
            Object.assign(q, { from: custom.from, to: custom.to });
        return q;
    };
    const go = (extra: Record<string, string>) =>
        router.get('/reports', query(extra), {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setLoading(true),
            onFinish: () => setLoading(false),
        });
    const url = (path: string, extra: Record<string, string> = {}) =>
        `${path}?${new URLSearchParams(query(extra)).toString()}`;

    const style = TYPE_STYLE[type] ?? TYPE_STYLE.membership;

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Reports" />
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Reports
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Generate, view, print and export church reports on the
                        church letterhead
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={range}
                        onChange={(e) => go({ range: e.target.value })}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    >
                        {Object.entries(ranges).map(([k, l]) => (
                            <option key={k} value={k}>
                                {l}
                            </option>
                        ))}
                    </select>
                    {range === 'custom' && (
                        <div className="flex items-center gap-1.5">
                            <input
                                type="date"
                                value={custom.from}
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
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                        <a
                            href={url('/reports/export', { format: 'csv' })}
                            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Icon name="DocumentTextIcon" size={14} />
                            CSV
                        </a>
                        <a
                            href={url('/reports/export', { format: 'excel' })}
                            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Icon name="TableCellsIcon" size={14} />
                            Excel
                        </a>
                        <PdfButton
                            url={url('/reports/pdf')}
                            title={`${report.title} — ${report.period}`}
                            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <Icon name="PrinterIcon" size={14} />
                            PDF
                        </PdfButton>
                    </div>
                </div>
            </div>

            <div
                className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-4 ${loading ? 'opacity-60' : ''}`}
            >
                <KPICard
                    label="Active Members"
                    value={overview.members}
                    icon="UsersIcon"
                    color="bg-blue-500"
                    sub={`${overview.members_total} on record`}
                />
                <KPICard
                    label="Income"
                    value={fmtMoney(overview.income, base, 0)}
                    icon="BanknotesIcon"
                    color="bg-green-500"
                    sub={equiv(overview.income)}
                />
                <KPICard
                    label="Expenses"
                    value={fmtMoney(overview.expenses, base, 0)}
                    icon="ArrowTrendingDownIcon"
                    color="bg-red-500"
                    sub={equiv(overview.expenses)}
                />
                <KPICard
                    label="Net Balance"
                    value={fmtMoney(overview.net, base, 0)}
                    icon="ChartBarIcon"
                    color="bg-emerald-600"
                    sub={equiv(overview.net)}
                />
                <KPICard
                    label="Events"
                    value={overview.events}
                    icon="CalendarIcon"
                    color="bg-indigo-500"
                />
                <KPICard
                    label="Attendance"
                    value={overview.attendance}
                    icon="CalendarDaysIcon"
                    color="bg-purple-500"
                    sub="Total present at services"
                />
                <KPICard
                    label="Baptisms"
                    value={overview.baptisms}
                    icon="SparklesIcon"
                    color="bg-amber-500"
                />
                <KPICard
                    label="Prayer Requests"
                    value={overview.prayers}
                    icon="HandRaisedIcon"
                    color="bg-rose-500"
                />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Object.entries(types).map(([id, label]) => {
                    const s = TYPE_STYLE[id];
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => go({ type: id })}
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

            <div
                className={`grid grid-cols-1 gap-6 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}
            >
                <div className="space-y-4 lg:col-span-2">
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                            <div
                                className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.color}`}
                            >
                                <Icon
                                    name={style.icon}
                                    size={16}
                                    className="text-white"
                                />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    {report.title} — {report.range_label}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {report.period}
                                </p>
                            </div>
                        </div>
                        <table className="w-full text-sm">
                            <tbody>
                                {report.summary.map((r, i) => (
                                    <tr
                                        key={r.label}
                                        className={
                                            i % 2 === 0 ? 'bg-muted/30' : ''
                                        }
                                    >
                                        <td className="px-5 py-3 text-muted-foreground">
                                            {r.label}
                                        </td>
                                        <td className="px-5 py-3 text-right font-medium text-foreground">
                                            {r.value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {report.sections.map((s) => (
                        <div
                            key={s.title}
                            className="overflow-hidden rounded-xl border border-border bg-card"
                        >
                            <div className="flex items-center justify-between border-b border-border px-5 py-3">
                                <h3 className="text-sm font-semibold text-foreground">
                                    {s.title}
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {s.rows.length} row
                                    {s.rows.length === 1 ? '' : 's'}
                                </span>
                            </div>
                            {s.rows.length === 0 ? (
                                <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                                    {s.empty}
                                </p>
                            ) : (
                                <div className="max-h-96 scrollbar-thin overflow-auto">
                                    <table className="w-full min-w-[480px] text-sm">
                                        <thead className="sticky top-0 bg-muted/60">
                                            <tr>
                                                {s.columns.map((c) => (
                                                    <th
                                                        key={c}
                                                        className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                                                    >
                                                        {c}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {s.rows.map((r, i) => (
                                                <tr
                                                    key={i}
                                                    className="border-t border-border"
                                                >
                                                    {r.map((v, j) => (
                                                        <td
                                                            key={j}
                                                            className="px-4 py-2 text-foreground"
                                                        >
                                                            {v}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="mb-3 font-semibold text-foreground">
                            Report Summary
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            This report covers <strong>{report.period}</strong>.
                            It is built live from the church records and printed
                            on the official church letterhead (name, logo,
                            address, email and phone from Church Settings).
                        </p>
                        <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                            <strong>Report type:</strong> {report.title}
                            <br />
                            <strong>Period:</strong> {report.range_label}
                            <br />
                            <strong>Currency:</strong> {base} (equivalents
                            shown)
                            <br />
                            <strong>Generated:</strong> {report.generated_at}
                            <br />
                            <strong>Generated by:</strong> {auth.user.name}
                        </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="mb-3 font-semibold text-foreground">
                            View, print & export
                        </h3>
                        <div className="space-y-2">
                            {[
                                {
                                    href: url('/reports/pdf'),
                                    label: 'View / print on letterhead',
                                    icon: 'PrinterIcon',
                                    pdf: true,
                                },
                                {
                                    href: url('/reports/pdf', {
                                        download: '1',
                                    }),
                                    label: 'Download PDF',
                                    icon: 'DocumentArrowDownIcon',
                                    pdf: true,
                                    download: true,
                                },
                                {
                                    href: url('/reports/export', {
                                        format: 'excel',
                                    }),
                                    label: 'Export as Excel',
                                    icon: 'TableCellsIcon',
                                },
                                {
                                    href: url('/reports/export', {
                                        format: 'csv',
                                    }),
                                    label: 'Export as CSV',
                                    icon: 'DocumentTextIcon',
                                },
                            ].map((x) => {
                                const cls =
                                    'flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50';
                                const inner = (
                                    <>
                                        <Icon
                                            name={x.icon}
                                            size={16}
                                            className="text-muted-foreground"
                                        />
                                        {x.label}
                                        <Icon
                                            name="ArrowDownTrayIcon"
                                            size={14}
                                            className="ml-auto text-muted-foreground"
                                        />
                                    </>
                                );
                                return x.pdf ? (
                                    <PdfButton
                                        key={x.label}
                                        url={x.href}
                                        title={`${report.title} — ${report.period}`}
                                        download={x.download}
                                        className={cls}
                                    >
                                        {inner}
                                    </PdfButton>
                                ) : (
                                    <a
                                        key={x.label}
                                        href={x.href}
                                        className={cls}
                                    >
                                        {inner}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
