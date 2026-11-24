import type { ReactNode } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { fmtCompact, fmtMoney } from '@/lib/finance';
import type { ChartDatum, ExtraChart, ReportCharts } from './types';

const PALETTE = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ef4444',
    '#14b8a6',
    '#ec4899',
    '#6366f1',
    '#84cc16',
    '#f97316',
];
const TICK = { fontSize: 11, fill: 'currentColor' };

type Series = { key: string; name: string; color: string };
type Row = Record<string, string | number>;

const valueFmt = (currency?: string) => (v: number) =>
    currency ? fmtMoney(v, currency, 0) : v.toLocaleString('en-US');
const axisFmt = (currency?: string) => (v: number) =>
    currency ? fmtCompact(v, currency) : v.toLocaleString('en-US');

function ChartCard({
    title,
    empty,
    children,
}: {
    title: string;
    empty: boolean;
    children: ReactNode;
}) {
    return (
        <div className="break-inside-avoid rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <div className="mt-3 h-64 w-full text-muted-foreground">
                {empty ? (
                    <p className="flex h-full items-center justify-center text-sm">
                        No data for this period
                    </p>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

function Donut({
    title,
    data,
    currency,
}: {
    title: string;
    data: ChartDatum[];
    currency?: string;
}) {
    const f = valueFmt(currency);
    return (
        <ChartCard title={title} empty={data.every((d) => !d.value)}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="label"
                        innerRadius="55%"
                        outerRadius="80%"
                        paddingAngle={2}
                        isAnimationActive={false}
                    >
                        {data.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(v) => f(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

function Bars({
    title,
    data,
    series,
    currency,
    horizontal = false,
    stacked = false,
}: {
    title: string;
    data: Row[];
    series: Series[];
    currency?: string;
    horizontal?: boolean;
    stacked?: boolean;
}) {
    const f = valueFmt(currency);
    const axis = axisFmt(currency);
    return (
        <ChartCard title={title} empty={data.length === 0}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                    data={data}
                    layout={horizontal ? 'vertical' : 'horizontal'}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        strokeOpacity={0.15}
                    />
                    <XAxis
                        type={horizontal ? 'number' : 'category'}
                        dataKey={horizontal ? undefined : 'label'}
                        tick={TICK}
                        tickFormatter={horizontal ? axis : undefined}
                    />
                    <YAxis
                        type={horizontal ? 'category' : 'number'}
                        dataKey={horizontal ? 'label' : undefined}
                        width={horizontal ? 110 : 56}
                        tick={TICK}
                        tickFormatter={horizontal ? undefined : axis}
                    />
                    <Tooltip formatter={(v) => f(Number(v))} />
                    {series.length > 1 && (
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                    )}
                    {series.map((s, i) => (
                        <Bar
                            key={s.key}
                            dataKey={s.key}
                            name={s.name}
                            fill={s.color}
                            stackId={stacked ? 'stack' : undefined}
                            radius={
                                stacked && i < series.length - 1
                                    ? [0, 0, 0, 0]
                                    : horizontal
                                      ? [0, 4, 4, 0]
                                      : [4, 4, 0, 0]
                            }
                            isAnimationActive={false}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

function Lines({
    title,
    data,
    series,
}: {
    title: string;
    data: Row[];
    series: Series[];
}) {
    return (
        <ChartCard title={title} empty={data.length === 0}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart
                    data={data}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        strokeOpacity={0.15}
                    />
                    <XAxis dataKey="label" tick={TICK} />
                    <YAxis tick={TICK} width={40} allowDecimals={false} />
                    <Tooltip />
                    {series.length > 1 && (
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                    )}
                    {series.map((s) => (
                        <Line
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            name={s.name}
                            stroke={s.color}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            isAnimationActive={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

function Growth({
    title,
    data,
    dataKey,
    name,
    color,
}: {
    title: string;
    data: Row[];
    dataKey: string;
    name: string;
    color: string;
}) {
    return (
        <ChartCard title={title} empty={data.length === 0}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart
                    data={data}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        strokeOpacity={0.15}
                    />
                    <XAxis dataKey="label" tick={TICK} />
                    <YAxis tick={TICK} width={48} allowDecimals={false} />
                    <Tooltip />
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        name={name}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.2}
                        strokeWidth={2}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

/** A chart from the generic `extra` list, drawn with the matching chart above. */
function Extra({ chart, currency }: { chart: ExtraChart; currency: string }) {
    const money = chart.money ? currency : undefined;
    const series = chart.series.map((s, i) => ({
        ...s,
        color: PALETTE[i % PALETTE.length],
    }));

    if (chart.kind === 'donut') {
        return (
            <Donut
                title={chart.title}
                data={chart.data as unknown as ChartDatum[]}
                currency={money}
            />
        );
    }
    if (chart.kind === 'lines') {
        return <Lines title={chart.title} data={chart.data} series={series} />;
    }
    if (chart.kind === 'area' && series[0]) {
        return (
            <Growth
                title={chart.title}
                data={chart.data}
                dataKey={series[0].key}
                name={series[0].name}
                color={series[0].color}
            />
        );
    }

    return (
        <Bars
            title={chart.title}
            data={chart.data}
            series={series}
            currency={money}
            horizontal={chart.horizontal}
            stacked={chart.stacked}
        />
    );
}

const GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2';

export default function ReportChartsSection({
    charts: c,
    currency,
}: {
    charts: ReportCharts;
    currency: string;
}) {
    const extra = (c.extra ?? []).filter((x) => x.data.length > 0);
    const hasMembership = [
        c.membership_growth,
        c.gender,
        c.age_groups,
        c.departments,
        c.attendance_trend,
    ].some(Boolean);
    const hasFinance = [
        c.income_by_category,
        c.expense_by_category,
        c.monthly_financials,
        c.budget_vs_actual,
    ].some(Boolean);

    if (!hasMembership && !hasFinance && extra.length === 0) return null;

    return (
        <section className="space-y-6">
            {hasMembership && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">
                        Membership charts
                    </h2>
                    <div className={GRID}>
                        {c.membership_growth && (
                            <Growth
                                title="Membership growth"
                                data={c.membership_growth}
                                dataKey="members"
                                name="Members"
                                color={PALETTE[0]}
                            />
                        )}
                        {c.gender && (
                            <Donut
                                title="Male and female membership"
                                data={c.gender}
                            />
                        )}
                        {c.age_groups && (
                            <Bars
                                title="Membership by age group"
                                data={c.age_groups}
                                series={[
                                    {
                                        key: 'value',
                                        name: 'Members',
                                        color: PALETTE[2],
                                    },
                                ]}
                            />
                        )}
                        {c.departments && (
                            <Bars
                                title="Membership by department"
                                data={c.departments}
                                horizontal
                                series={[
                                    {
                                        key: 'value',
                                        name: 'Members',
                                        color: PALETTE[3],
                                    },
                                ]}
                            />
                        )}
                        {c.attendance_trend && (
                            <Lines
                                title="Monthly attendance trend"
                                data={c.attendance_trend}
                                series={[
                                    {
                                        key: 'attendance',
                                        name: 'Attendance',
                                        color: PALETTE[1],
                                    },
                                ]}
                            />
                        )}
                    </div>
                </div>
            )}

            {hasFinance && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">
                        Financial charts
                    </h2>
                    <div className={GRID}>
                        {c.income_by_category && (
                            <Donut
                                title="Income distribution"
                                data={c.income_by_category}
                                currency={currency}
                            />
                        )}
                        {c.expense_by_category && (
                            <Donut
                                title="Expenditure distribution"
                                data={c.expense_by_category}
                                currency={currency}
                            />
                        )}
                        {c.monthly_financials && (
                            <Bars
                                title="Monthly income vs expenditure"
                                data={c.monthly_financials}
                                currency={currency}
                                series={[
                                    {
                                        key: 'income',
                                        name: 'Income',
                                        color: '#10b981',
                                    },
                                    {
                                        key: 'expense',
                                        name: 'Expenditure',
                                        color: '#ef4444',
                                    },
                                ]}
                            />
                        )}
                        {c.budget_vs_actual && (
                            <Bars
                                title="Budget vs actual expenditure"
                                data={c.budget_vs_actual}
                                currency={currency}
                                series={[
                                    {
                                        key: 'budget',
                                        name: 'Budget',
                                        color: '#6366f1',
                                    },
                                    {
                                        key: 'actual',
                                        name: 'Actual',
                                        color: '#f59e0b',
                                    },
                                ]}
                            />
                        )}
                    </div>
                </div>
            )}

            {extra.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">
                        {hasMembership || hasFinance ? 'More charts' : 'Charts'}
                    </h2>
                    <div className={GRID}>
                        {extra.map((x) => (
                            <Extra key={x.key} chart={x} currency={currency} />
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
