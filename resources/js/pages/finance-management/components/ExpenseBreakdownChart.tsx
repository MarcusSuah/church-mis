import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { CAT_LABELS, fmtCompact, fmtMoney, useCurrency } from '@/lib/finance';

const COLORS = [
    'var(--color-primary)',
    'var(--color-accent)',
    'var(--color-success)',
    '#7c3aed',
    '#0891b2',
    '#db2777',
    '#ea580c',
    'var(--color-muted-foreground)',
];

export default function ExpenseBreakdownChart({
    data,
}: {
    data: { category: string; amount: number }[];
}) {
    const c = useCurrency();
    const rows = data.map((d) => ({
        ...d,
        name: CAT_LABELS[d.category] ?? d.category,
    }));
    if (!rows.length) {
        return (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No expenses recorded for this period.
            </div>
        );
    }
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart
                data={rows}
                margin={{ top: 8, right: 8, left: 0, bottom: 40 }}
                barSize={28}
            >
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                />
                <XAxis
                    dataKey="name"
                    tick={{
                        fontSize: 10,
                        fill: 'var(--color-muted-foreground)',
                    }}
                    axisLine={false}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                />
                <YAxis
                    tickFormatter={(v: number) => fmtCompact(v, c)}
                    tick={{
                        fontSize: 11,
                        fill: 'var(--color-muted-foreground)',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                />
                <Tooltip
                    content={({ active, payload }) =>
                        active && payload?.length ? (
                            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-elevated">
                                <p className="font-semibold text-foreground">
                                    {
                                        (payload[0].payload as { name: string })
                                            .name
                                    }
                                </p>
                                <p className="text-muted-foreground tabular-nums">
                                    {fmtMoney(Number(payload[0].value), c, 0)}
                                </p>
                            </div>
                        ) : null
                    }
                />
                <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                    {rows.map((r, i) => (
                        <Cell
                            key={r.category}
                            fill={COLORS[i % COLORS.length]}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
