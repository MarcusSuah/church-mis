import type { ReactNode } from 'react';
import { fmtCompact, fmtMoney } from '@/lib/finance';

/** One slice of a pie / one bar of a ranked chart, sent by the server. */
export type ChartSlice = { label: string; value: number };

/** One row of a monthly series: `label` ("Nov 2026") plus a value per series. */
export type ChartMonth = { period: string; label: string } & Record<
    string,
    string | number
>;

/** Theme colors (light and dark) for chart series, in a fixed order. */
export const CHART_COLORS = [
    'var(--color-primary)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-info)',
    'var(--color-accent)',
    'var(--color-destructive)',
    'var(--color-chart-3)',
    'var(--color-chart-5)',
];

export const AXIS_TICK = {
    fontSize: 11,
    fill: 'var(--color-muted-foreground)',
};

export const GRID_STROKE = 'var(--color-border)';

/** Money for axis ticks ("$12.5K"). */
export const axisMoney = (currency: string) => (v: number) =>
    fmtCompact(v, currency);

/** Short month for axis ticks: "Nov 2026" → "Nov". */
export const shortMonth = (label: string) => label.split(' ')[0] ?? label;

/** Card with a title, a subtitle and an empty state, sized for one chart. */
export function ChartCard({
    title,
    subtitle,
    empty,
    height = 240,
    footer,
    children,
}: {
    title: string;
    subtitle?: string;
    empty: boolean;
    height?: number;
    /** Shown under the chart, e.g. a legend. */
    footer?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="card min-w-0 p-5">
            <h2 className="section-header">{title}</h2>
            {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            <div className="mt-3 w-full" style={{ height }}>
                {empty ? (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No data yet
                    </p>
                ) : (
                    children
                )}
            </div>
            {!empty && footer}
        </div>
    );
}

/** Row of chart cards: side by side on wide screens, stacked on phones. */
export function ChartGrid({ children }: { children: ReactNode }) {
    return (
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {children}
        </div>
    );
}

type TooltipEntry = {
    name?: string | number;
    value?: unknown;
    color?: string;
    payload?: { label?: string; fill?: string };
};

/** Tooltip listing each series in the church currency. */
export function MoneyTooltip({
    active,
    payload,
    label,
    currency,
}: {
    active?: boolean;
    payload?: readonly TooltipEntry[];
    label?: string | number;
    currency: string;
}) {
    if (!active || !payload?.length) {
        return null;
    }
    const title = label ?? payload[0]?.payload?.label;

    return (
        <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-elevated">
            {title !== undefined && (
                <p className="mb-1 font-semibold text-foreground">{title}</p>
            )}
            {payload.map((p, i) => (
                <p
                    key={`${p.name}-${i}`}
                    className="flex items-center gap-2 text-xs"
                >
                    <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                            background: p.color ?? p.payload?.fill,
                        }}
                    />
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="ml-auto font-semibold text-foreground tabular-nums">
                        {fmtMoney(Number(p.value) || 0, currency)}
                    </span>
                </p>
            ))}
        </div>
    );
}

/** Legend as chips under a pie chart, with each slice's share. */
export function SliceLegend({
    data,
    currency,
}: {
    data: ChartSlice[];
    currency: string;
}) {
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

    return (
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {data.map((d, i) => (
                <li key={d.label} className="flex min-w-0 items-center gap-2">
                    <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                            background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                    />
                    <span className="truncate text-muted-foreground">
                        {d.label}
                    </span>
                    <span className="ml-auto shrink-0 font-medium text-foreground tabular-nums">
                        {fmtCompact(d.value, currency)} ·{' '}
                        {Math.round((d.value / total) * 100)}%
                    </span>
                </li>
            ))}
        </ul>
    );
}
