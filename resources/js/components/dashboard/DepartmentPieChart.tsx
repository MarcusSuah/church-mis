import {
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import Tip from './Tip';
import { CHART_COLORS } from './types';
import type { DeptSlice } from './types';

export default function DepartmentPieChart({ data }: { data: DeptSlice[] }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (!data.length)
        return (
            <div className="flex h-[220px] items-center justify-center text-center text-sm text-muted-foreground">
                No department members yet.
            </div>
        );
    return (
        <ResponsiveContainer width="100%" height={260}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                >
                    {data.map((d, i) => (
                        <Cell
                            key={d.name}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                    ))}
                </Pie>
                <Tooltip
                    content={({ active, payload }) =>
                        active && payload?.length ? (
                            <Tip
                                title={String(payload[0].name)}
                                rows={[
                                    {
                                        name: 'Members',
                                        value: `${payload[0].value} (${Math.round((Number(payload[0].value) / total) * 100)}%)`,
                                    },
                                ]}
                            />
                        ) : null
                    }
                />
                <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                    formatter={(v) => (
                        <span
                            style={{ color: 'var(--color-muted-foreground)' }}
                        >
                            {v}
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
