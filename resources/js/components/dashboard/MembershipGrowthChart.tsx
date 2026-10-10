import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import Tip from './Tip';
import type { GrowthPoint } from './types';

export default function MembershipGrowthChart({
    data,
    months = 12,
}: {
    data: GrowthPoint[];
    months?: number;
}) {
    const rows = data.slice(-months);
    return (
        <div>
            <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                    data={rows}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient
                            id="gradActive"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor="var(--color-primary)"
                                stopOpacity={0.25}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--color-primary)"
                                stopOpacity={0.02}
                            />
                        </linearGradient>
                        <linearGradient
                            id="gradNew"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor="var(--color-accent)"
                                stopOpacity={0.35}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--color-accent)"
                                stopOpacity={0.02}
                            />
                        </linearGradient>
                    </defs>
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
                        allowDecimals={false}
                        tick={{
                            fontSize: 11,
                            fill: 'var(--color-muted-foreground)',
                        }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        content={({ active, payload }) =>
                            active && payload?.length ? (
                                <Tip
                                    title={
                                        (payload[0].payload as GrowthPoint)
                                            .label
                                    }
                                    rows={payload.map((p) => ({
                                        name: String(p.name),
                                        value: String(p.value),
                                        color: p.color,
                                    }))}
                                />
                            ) : null
                        }
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Area
                        type="monotone"
                        dataKey="active"
                        name="Active Members"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        fill="url(#gradActive)"
                    />
                    <Area
                        type="monotone"
                        dataKey="new"
                        name="New Members"
                        stroke="var(--color-accent)"
                        strokeWidth={2}
                        fill="url(#gradNew)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
