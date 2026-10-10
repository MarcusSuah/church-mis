import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { fmtCompact, fmtMoney, useCurrency } from '@/lib/finance';

export type GivingPoint = {
    month: string;
    label: string;
    tithes: number;
    offerings: number;
    donations: number;
};

export default function FinanceGivingChart({ data }: { data: GivingPoint[] }) {
    const c = useCurrency();
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barSize={14}
                barGap={2}
            >
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                />
                <XAxis
                    dataKey="month"
                    tick={{
                        fontSize: 11,
                        fill: 'var(--color-muted-foreground)',
                    }}
                    axisLine={false}
                    tickLine={false}
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
                    content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as GivingPoint;
                        const total = payload.reduce(
                            (s, p) => s + Number(p.value ?? 0),
                            0,
                        );
                        return (
                            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-elevated">
                                <p className="mb-2 font-semibold text-foreground">
                                    {row.label}
                                </p>
                                {payload.map((p) => (
                                    <div
                                        key={String(p.dataKey)}
                                        className="flex items-center justify-between gap-6"
                                    >
                                        <span className="flex items-center gap-1.5 text-muted-foreground">
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{
                                                    backgroundColor: p.color,
                                                }}
                                            />
                                            {p.name}
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            {fmtMoney(Number(p.value), c, 0)}
                                        </span>
                                    </div>
                                ))}
                                <div className="mt-2 flex justify-between border-t border-border pt-2">
                                    <span className="text-muted-foreground">
                                        Total
                                    </span>
                                    <span className="font-bold tabular-nums">
                                        {fmtMoney(total, c, 0)}
                                    </span>
                                </div>
                            </div>
                        );
                    }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar
                    dataKey="tithes"
                    name="Tithes"
                    fill="var(--color-primary)"
                    radius={[3, 3, 0, 0]}
                />
                <Bar
                    dataKey="offerings"
                    name="Offerings"
                    fill="var(--color-accent)"
                    radius={[3, 3, 0, 0]}
                />
                <Bar
                    dataKey="donations"
                    name="Donations"
                    fill="var(--color-success)"
                    radius={[3, 3, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
