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
import Tip from './Tip';
import type { AttendancePoint } from './types';

export default function AttendanceChart({ data }: { data: AttendancePoint[] }) {
    if (!data.length)
        return (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No attendance recorded yet.
            </div>
        );
    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                barSize={16}
                barGap={2}
            >
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                />
                <XAxis
                    dataKey="label"
                    tick={{
                        fontSize: 10,
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
                    content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as AttendancePoint;
                        return (
                            <Tip
                                title={`${row.service} — ${row.label}`}
                                rows={payload.map((p) => ({
                                    name: String(p.name),
                                    value: String(p.value),
                                    color: p.color,
                                }))}
                                footer={{
                                    name: 'Recorded',
                                    value: String(
                                        row.present + row.late + row.absent,
                                    ),
                                }}
                            />
                        );
                    }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar
                    dataKey="present"
                    name="Present"
                    fill="var(--color-primary)"
                    radius={[3, 3, 0, 0]}
                />
                <Bar
                    dataKey="late"
                    name="Late"
                    fill="var(--color-accent)"
                    radius={[3, 3, 0, 0]}
                />
                <Bar
                    dataKey="absent"
                    name="Absent"
                    fill="var(--color-muted-foreground)"
                    radius={[3, 3, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
