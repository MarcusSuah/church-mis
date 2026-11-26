import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import Tip from './Tip';
import { CHART_COLORS } from './types';
import type { DeptSlice } from './types';

const RADIAN = Math.PI / 180;

/** Percentage drawn on the ring; hidden on slices too small to hold the text. */
function SliceLabel({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
}: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
}) {
    if (
        cx === undefined ||
        cy === undefined ||
        midAngle === undefined ||
        innerRadius === undefined ||
        outerRadius === undefined ||
        percent === undefined ||
        percent < 0.06
    )
        return null;
    const r = innerRadius + (outerRadius - innerRadius) / 2;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="#fff"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontWeight={600}
        >
            {Math.round(percent * 100)}%
        </text>
    );
}

export default function DepartmentPieChart({ data }: { data: DeptSlice[] }) {
    const total = data.reduce((s, d) => s + d.value, 0);

    if (!data.length)
        return (
            <div className="flex h-[220px] items-center justify-center text-center text-sm text-muted-foreground">
                No department members yet.
            </div>
        );

    return (
        <div>
            {/* Fixed-height box: the ring is at exactly 50% / 50%. */}
            <div className="relative h-[200px]">
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl leading-none font-bold text-foreground tabular-nums">
                        {total}
                    </span>
                    <span className="mt-1 text-[10px] text-muted-foreground">
                        Total members
                    </span>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            labelLine={false}
                            label={SliceLabel}
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
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend outside the chart, so it can't move the ring. */}
            <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px]">
                {data.map((d, i) => (
                    <li
                        key={d.name}
                        className="flex items-center gap-1.5 text-muted-foreground"
                    >
                        <span
                            className="size-2.5 shrink-0 rounded-sm"
                            style={{
                                background:
                                    CHART_COLORS[i % CHART_COLORS.length],
                            }}
                        />
                        {d.name}
                        <strong className="text-foreground tabular-nums">
                            {d.value}
                        </strong>
                    </li>
                ))}
            </ul>
        </div>
    );
}
