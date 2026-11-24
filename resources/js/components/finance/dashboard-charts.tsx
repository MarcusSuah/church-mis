import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    PolarAngleAxis,
    RadialBar,
    RadialBarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CAT_LABELS } from '@/lib/finance';
import {
    AXIS_TICK,
    axisMoney,
    CHART_COLORS,
    ChartCard,
    ChartGrid,
    GRID_STROKE,
    MoneyTooltip,
    shortMonth,
    SliceLegend,
} from './charts';
import type { ChartMonth, ChartSlice } from './charts';

const LEGEND_STYLE = { fontSize: 11 };
const hasValues = (rows: ChartMonth[], keys: string[]) =>
    rows.some((r) => keys.some((k) => Number(r[k]) > 0));

/* ------------------------------------------------------------- Tithes */

export type TitheChartData = {
    monthly: ChartMonth[];
    by_method: ChartSlice[];
};

/** Tithes: 12-month area trend + ranked bars by payment method. */
export function TitheCharts({
    charts,
    currency,
}: {
    charts?: TitheChartData;
    currency: string;
}) {
    if (!charts) {
        return null;
    }

    return (
        <ChartGrid>
            <ChartCard
                title="Tithe Trend"
                subtitle={`Tithes received per month (${currency}) — last 12 months`}
                empty={!hasValues(charts.monthly, ['total'])}
            >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart
                        data={charts.monthly}
                        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient
                                id="titheFill"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-primary)"
                                    stopOpacity={0.35}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-primary)"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={GRID_STROKE}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="label"
                            tickFormatter={shortMonth}
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            width={56}
                            tickFormatter={axisMoney(currency)}
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            content={(p) => (
                                <MoneyTooltip {...p} currency={currency} />
                            )}
                        />
                        <Area
                            type="monotone"
                            dataKey="total"
                            name="Tithes"
                            stroke="var(--color-primary)"
                            strokeWidth={2}
                            fill="url(#titheFill)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </ChartCard>
            <ChartCard
                title="How Tithes Are Paid"
                subtitle="Total per payment method — last 12 months"
                empty={charts.by_method.length === 0}
            >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                        data={charts.by_method}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                        barSize={18}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={GRID_STROKE}
                            horizontal={false}
                        />
                        <XAxis
                            type="number"
                            tickFormatter={axisMoney(currency)}
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="label"
                            width={100}
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--color-muted)' }}
                            content={(p) => (
                                <MoneyTooltip {...p} currency={currency} />
                            )}
                        />
                        <Bar dataKey="value" name="Total" radius={[0, 4, 4, 0]}>
                            {charts.by_method.map((d, i) => (
                                <Cell
                                    key={d.label}
                                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
        </ChartGrid>
    );
}

/* ---------------------------------------------------------- Donations */

export type DonationChartData = {
    monthly: ChartMonth[];
    by_fund: ChartSlice[];
};

/** Donations: one-time vs recurring lines + donut by fund. */
export function DonationCharts({
    charts,
    currency,
}: {
    charts?: DonationChartData;
    currency: string;
}) {
    if (!charts) {
        return null;
    }

    return (
        <ChartGrid>
            <ChartCard
                title="Donations by Month"
                subtitle={`One-time and recurring gifts (${currency}) — last 12 months`}
                empty={!hasValues(charts.monthly, ['one_time', 'recurring'])}
            >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart
                        data={charts.monthly}
                        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={GRID_STROKE}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="label"
                            tickFormatter={shortMonth}
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            width={56}
                            tickFormatter={axisMoney(currency)}
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            content={(p) => (
                                <MoneyTooltip {...p} currency={currency} />
                            )}
                        />
                        <Legend wrapperStyle={LEGEND_STYLE} />
                        <Line
                            type="monotone"
                            dataKey="one_time"
                            name="One-time"
                            stroke="var(--color-success)"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="recurring"
                            name="Recurring"
                            stroke="var(--color-accent)"
                            strokeWidth={2}
                            strokeDasharray="5 3"
                            dot={{ r: 3 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>
            <ChartCard
                title="Donations by Fund"
                subtitle="Where gifts went — last 12 months"
                empty={charts.by_fund.length === 0}
                height={190}
                footer={
                    <SliceLegend data={charts.by_fund} currency={currency} />
                }
            >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                        <Pie
                            data={charts.by_fund}
                            dataKey="value"
                            nameKey="label"
                            innerRadius="58%"
                            outerRadius="90%"
                            paddingAngle={2}
                            stroke="var(--color-card)"
                        >
                            {charts.by_fund.map((d, i) => (
                                <Cell
                                    key={d.label}
                                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            content={(p) => (
                                <MoneyTooltip {...p} currency={currency} />
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </ChartCard>
        </ChartGrid>
    );
}

/* ----------------------------------------------------------- Expenses */

export type ExpenseChartData = {
    monthly: ChartMonth[];
    by_category: ChartSlice[];
};

/** Expenses: stacked bars by status per month + full pie by category. */
export function ExpenseCharts({
    charts,
    currency,
}: {
    charts?: ExpenseChartData;
    currency: string;
}) {
    if (!charts) {
        return null;
    }
    const statuses = [
        { key: 'paid', name: 'Paid', color: 'var(--color-success)' },
        { key: 'approved', name: 'Approved', color: 'var(--color-info)' },
        { key: 'pending', name: 'Pending', color: 'var(--color-warning)' },
    ];

    return (
        <ChartGrid>
            <ChartCard
                title="Monthly Spending"
                subtitle={`Expenses per month by status (${currency}) — last 12 months`}
                empty={
                    !hasValues(
                        charts.monthly,
                        statuses.map((s) => s.key),
                    )
                }
            >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                        data={charts.monthly}
                        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                        barSize={18}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={GRID_STROKE}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="label"
                            tickFormatter={shortMonth}
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            width={56}
                            tickFormatter={axisMoney(currency)}
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--color-muted)' }}
                            content={(p) => (
                                <MoneyTooltip {...p} currency={currency} />
                            )}
                        />
                        <Legend wrapperStyle={LEGEND_STYLE} />
                        {statuses.map((s, i) => (
                            <Bar
                                key={s.key}
                                dataKey={s.key}
                                name={s.name}
                                stackId="status"
                                fill={s.color}
                                radius={
                                    i === statuses.length - 1
                                        ? [4, 4, 0, 0]
                                        : [0, 0, 0, 0]
                                }
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
            <ChartCard
                title="Spending by Category"
                subtitle="Approved and paid expenses — last 12 months"
                empty={charts.by_category.length === 0}
                height={190}
                footer={
                    <SliceLegend
                        data={charts.by_category}
                        currency={currency}
                    />
                }
            >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                        <Pie
                            data={charts.by_category}
                            dataKey="value"
                            nameKey="label"
                            outerRadius="92%"
                            stroke="var(--color-card)"
                            strokeWidth={2}
                        >
                            {charts.by_category.map((d, i) => (
                                <Cell
                                    key={d.label}
                                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            content={(p) => (
                                <MoneyTooltip {...p} currency={currency} />
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </ChartCard>
        </ChartGrid>
    );
}

/* ------------------------------------------------------------ Budgets */

type BudgetLine = {
    category: string;
    allocated_base: number;
    spent_amount: number;
    is_active: boolean;
};

/** Budgets: allocated vs spent bars with a % used line + radial gauges. */
export function BudgetCharts({
    budgets,
    currency,
    year,
}: {
    budgets: BudgetLine[];
    currency: string;
    year: number;
}) {
    const rows = budgets
        .filter((b) => b.is_active)
        .map((b) => ({
            label: CAT_LABELS[b.category] ?? b.category,
            allocated: Math.round(b.allocated_base * 100) / 100,
            spent: Math.round(b.spent_amount * 100) / 100,
            used:
                b.allocated_base > 0
                    ? Math.round((b.spent_amount / b.allocated_base) * 100)
                    : 0,
        }));
    // Gauges are capped at 100% so an overspent line doesn't wrap the ring.
    const gauges = rows.map((r, i) => ({
        ...r,
        gauge: Math.min(r.used, 100),
        fill:
            r.used > 100
                ? 'var(--color-destructive)'
                : CHART_COLORS[i % CHART_COLORS.length],
    }));

    if (rows.length === 0) {
        return null;
    }

    return (
        <ChartGrid>
            <ChartCard
                title="Allocated vs Spent"
                subtitle={`Each category's ${year} budget and spending (${currency}), with % used`}
                empty={false}
                height={260}
            >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <ComposedChart
                        data={rows}
                        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={GRID_STROKE}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="label"
                            tick={AXIS_TICK}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={56}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            yAxisId="money"
                            width={56}
                            tickFormatter={axisMoney(currency)}
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            yAxisId="pct"
                            orientation="right"
                            width={40}
                            unit="%"
                            tick={AXIS_TICK}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'var(--color-muted)' }}
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) {
                                    return null;
                                }
                                const r = payload[0]
                                    .payload as (typeof rows)[number];

                                return (
                                    <MoneyTooltip
                                        active
                                        label={`${label} — ${r.used}% used`}
                                        payload={payload.filter(
                                            (p) => p.dataKey !== 'used',
                                        )}
                                        currency={currency}
                                    />
                                );
                            }}
                        />
                        <Legend wrapperStyle={LEGEND_STYLE} />
                        <Bar
                            yAxisId="money"
                            dataKey="allocated"
                            name="Allocated"
                            fill="var(--color-primary)"
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar
                            yAxisId="money"
                            dataKey="spent"
                            name="Spent"
                            fill="var(--color-warning)"
                            radius={[4, 4, 0, 0]}
                        />
                        <Line
                            yAxisId="pct"
                            type="monotone"
                            dataKey="used"
                            name="% used"
                            stroke="var(--color-destructive)"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartCard>
            <ChartCard
                title="Budget Used"
                subtitle="Share of each category's budget already spent (red = over budget)"
                empty={false}
                height={200}
                footer={
                    <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                        {gauges.map((g) => (
                            <li
                                key={g.label}
                                className="flex min-w-0 items-center gap-2"
                            >
                                <span
                                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ background: g.fill }}
                                />
                                <span className="truncate text-muted-foreground">
                                    {g.label}
                                </span>
                                <span
                                    className={`ml-auto shrink-0 font-medium tabular-nums ${g.used > 100 ? 'text-danger' : 'text-foreground'}`}
                                >
                                    {g.used}%
                                </span>
                            </li>
                        ))}
                    </ul>
                }
            >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <RadialBarChart
                        data={gauges}
                        innerRadius="20%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                        barSize={8}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            tick={false}
                        />
                        <RadialBar
                            dataKey="gauge"
                            background={{ fill: 'var(--color-muted)' }}
                            cornerRadius={4}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) {
                                    return null;
                                }
                                const g = payload[0]
                                    .payload as (typeof gauges)[number];

                                return (
                                    <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-elevated">
                                        <p className="font-semibold text-foreground">
                                            {g.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {g.used}% of budget used
                                        </p>
                                    </div>
                                );
                            }}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
            </ChartCard>
        </ChartGrid>
    );
}
