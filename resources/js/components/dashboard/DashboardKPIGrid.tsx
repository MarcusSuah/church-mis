import { Link } from '@inertiajs/react';
import Icon from '@/components/ssbcms/AppIcon';
import { fmtMoney, useMoney } from '@/lib/finance';
import type { DashboardKpis } from './types';

export default function DashboardKPIGrid({ kpis }: { kpis: DashboardKpis }) {
    const { base, equiv } = useMoney();
    const cards = [
        {
            id: 'kpi-members',
            label: 'Active Members',
            value: kpis.active_members.toLocaleString(),
            change: `+${kpis.new_this_month} this month`,
            positive: true,
            icon: 'UsersIcon',
            href: '/member-management',
            color: 'bg-primary/5 border-primary/20',
            iconBg: 'bg-primary/10',
            iconColor: 'text-primary',
            span: 'col-span-2',
            featured: true,
        },
        {
            id: 'kpi-pending',
            label: 'Pending Approvals',
            value: String(kpis.pending),
            change: kpis.pending ? 'Waiting for review' : 'All caught up',
            positive: !kpis.pending,
            icon: 'ClockIcon',
            href: '/pending-registrations',
            color: 'bg-warning/5 border-warning/30',
            iconBg: 'bg-warning/10',
            iconColor: 'text-warning',
            alert: kpis.pending > 0,
        },
        {
            id: 'kpi-giving',
            label: 'Monthly Giving',
            value: fmtMoney(kpis.giving, base, 0),
            sub: equiv(kpis.giving),
            change:
                kpis.giving_change === null
                    ? 'This month'
                    : `${kpis.giving_change >= 0 ? '+' : ''}${kpis.giving_change}% vs last month`,
            positive: (kpis.giving_change ?? 0) >= 0,
            icon: 'BanknotesIcon',
            href: '/finance-management',
            color: 'bg-success/5 border-success/20',
            iconBg: 'bg-success/10',
            iconColor: 'text-success',
        },
        {
            id: 'kpi-attendance',
            label: 'Last Service Attendance',
            value: String(kpis.attendance),
            change:
                kpis.attendance_rate !== null
                    ? `${kpis.attendance_rate}% of members · ${kpis.attendance_date}`
                    : 'No services recorded yet',
            positive: true,
            icon: 'CalendarDaysIcon',
            href: '/attendance',
            color: 'bg-info/5 border-info/20',
            iconBg: 'bg-info/10',
            iconColor: 'text-info',
        },
        {
            id: 'kpi-prayer',
            label: 'Open Prayer Requests',
            value: String(kpis.prayers_open),
            change: `${kpis.prayers_unassigned} unassigned`,
            positive: !kpis.prayers_unassigned,
            icon: 'HandRaisedIcon',
            href: '/prayer-requests',
            color: 'bg-accent/5 border-accent/20',
            iconBg: 'bg-accent/10',
            iconColor: 'text-accent',
            alert: kpis.prayers_unassigned > 0,
        },
        {
            id: 'kpi-events',
            label: 'Events This Week',
            value: String(kpis.events_week),
            change: kpis.next_event
                ? `Next: ${kpis.next_event}`
                : 'Nothing scheduled',
            positive: true,
            icon: 'CalendarIcon',
            href: '/events',
            color: 'bg-secondary border-border',
            iconBg: 'bg-muted',
            iconColor: 'text-muted-foreground',
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((k) => (
                <Link
                    key={k.id}
                    href={k.href}
                    className={`card group border p-4 transition-all duration-200 hover:shadow-elevated ${k.color} ${k.span ?? ''}`}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    {k.label}
                                </span>
                                {k.alert && (
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
                                )}
                            </div>
                            <p
                                className={`font-bold text-foreground tabular-nums ${k.featured ? 'text-3xl' : 'text-2xl'}`}
                            >
                                {k.value}
                            </p>
                            {k.sub && (
                                <p className="text-xs text-muted-foreground tabular-nums">
                                    {k.sub}
                                </p>
                            )}
                            <p
                                className={`mt-1 truncate text-xs font-medium ${k.positive ? 'text-success' : 'text-warning'}`}
                            >
                                {k.change}
                            </p>
                        </div>
                        <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${k.iconBg}`}
                        >
                            <Icon
                                name={k.icon}
                                size={18}
                                className={k.iconColor}
                            />
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
