import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { fmtCompact, fmtMoney, useMoney } from '@/lib/finance';
import Tip from './Tip';
import type { GivingPoint } from './types';

export default function GivingTrendsChart({ data }: { data: GivingPoint[] }) {
    const { base, equiv } = useMoney();
    const hasBudget = data.some((d) => d.budget !== null);
    return (
        <ResponsiveContainer width="100%" height={220}>
            <LineChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
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
                    width={56}
                    tickFormatter={(v: number) => fmtCompact(v, base)}
                    tick={{
                        fontSize: 11,
                        fill: 'var(--color-muted-foreground)',
                    }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as GivingPoint;
                        return (
                            <Tip
                                title={row.label}
                                rows={payload.map((p) => ({
                                    name: String(p.name),
                                    value: fmtMoney(Number(p.value), base, 0),
                                    color: p.color,
                                }))}
                                footer={{
                                    name: 'Actual in other currency',
                                    value: equiv(row.actual).replace('≈ ', ''),
                                }}
                            />
                        );
                    }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Giving"
                    stroke="var(--color-accent)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--color-accent)' }}
                    activeDot={{ r: 5 }}
                />
                {hasBudget && (
                    <Line
                        type="monotone"
                        dataKey="budget"
                        name="Budget Target"
                        stroke="var(--color-muted-foreground)"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                        dot={false}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    );
}
