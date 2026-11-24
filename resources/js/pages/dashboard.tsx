import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import AttendanceChart from '@/components/dashboard/AttendanceChart';
import BirthdayWidget from '@/components/dashboard/BirthdayWidget';
import DashboardKPIGrid from '@/components/dashboard/DashboardKPIGrid';
import DepartmentPieChart from '@/components/dashboard/DepartmentPieChart';
import GivingTrendsChart from '@/components/dashboard/GivingTrendsChart';
import MembershipGrowthChart from '@/components/dashboard/MembershipGrowthChart';
import type {
    ActivityItem,
    AttendancePoint,
    BirthdayItem,
    DashboardKpis,
    DeptSlice,
    EventItem,
    GivingPoint,
    GrowthPoint,
} from '@/components/dashboard/types';
import UpcomingEventsWidget from '@/components/dashboard/UpcomingEventsWidget';
import Icon from '@/components/ssbcms/AppIcon';
import { usePermissions } from '@/hooks/use-permissions';

type Props = {
    kpis: DashboardKpis;
    membershipGrowth: GrowthPoint[];
    departments: { items: DeptSlice[]; count: number };
    attendance: AttendancePoint[];
    givingTrend: GivingPoint[];
    activity: ActivityItem[];
    events: EventItem[];
    birthdays: { today: BirthdayItem[]; upcoming: BirthdayItem[] };
    quick: {
        departments: number;
        ministries: number;
        boards: number;
        board_members: number;
        baptisms_ytd: number;
    };
    mustChangePassword: boolean;
};

export default function Dashboard(props: Props) {
    const {
        kpis,
        membershipGrowth,
        departments,
        attendance,
        givingTrend,
        activity,
        events,
        birthdays,
        quick,
        mustChangePassword,
    } = props;
    const { church } = usePage<{ church: { name: string } }>().props;
    const { can } = usePermissions();
    const [months, setMonths] = useState(12);
    const [hideNotice, setHideNotice] = useState(false);
    // Set after mount: the server render and the browser may be in different time zones (hydration mismatch).
    const [today, setToday] = useState('');
    useEffect(
        () =>
            setToday(
                new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                }),
            ),
        [],
    );
    const avgAttendance = attendance.length
        ? Math.round(
              attendance.reduce((s, a) => s + a.present, 0) / attendance.length,
          )
        : 0;

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Dashboard" />
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {church.name} — {today}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs text-success">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                        Live data
                    </div>
                    <a
                        href="/public-member-registration"
                        className="btn-accent"
                    >
                        <Icon name="UserPlusIcon" size={16} />
                        New Registration
                    </a>
                </div>
            </div>

            {mustChangePassword && !hideNotice && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                    <Icon
                        name="ExclamationTriangleIcon"
                        size={18}
                        className="mt-0.5 shrink-0 text-warning"
                    />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-warning">
                            Security Notice
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            An administrator has asked you to set a new
                            password.{' '}
                            <Link
                                href="/change-password"
                                className="font-medium text-warning underline"
                            >
                                Change your password now
                            </Link>{' '}
                            to secure your account.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setHideNotice(true)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Dismiss"
                    >
                        <Icon name="XMarkIcon" size={16} />
                    </button>
                </div>
            )}

            <section className="mb-6">
                <DashboardKPIGrid kpis={kpis} />
            </section>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="card p-5 lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <div>
                            <h2 className="section-header">
                                Membership Growth
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Active members over the last{' '}
                                {months === 12
                                    ? '12 months'
                                    : `${months} months`}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            {[
                                ['3M', 3],
                                ['6M', 6],
                                ['1Y', 12],
                            ].map(([l, n]) => (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => setMonths(n as number)}
                                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${months === n ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                    <MembershipGrowthChart
                        data={membershipGrowth}
                        months={months}
                    />
                </div>
                <div className="card p-5">
                    <div className="mb-4">
                        <h2 className="section-header">
                            Department Distribution
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Members across {departments.count} departments
                        </p>
                    </div>
                    <DepartmentPieChart data={departments.items} />
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="card p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <div>
                            <h2 className="section-header">
                                Service Attendance
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Last {attendance.length || 7} services recorded
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                            Avg {avgAttendance}
                        </span>
                    </div>
                    <AttendanceChart data={attendance} />
                </div>
                <div className="card p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <div>
                            <h2 className="section-header">Giving vs Budget</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Monthly tithes, offerings & donations — last 12
                                months
                            </p>
                        </div>
                        <Link
                            href="/finance-management"
                            className="shrink-0 text-xs font-medium text-accent hover:underline"
                        >
                            View Finance →
                        </Link>
                    </div>
                    <GivingTrendsChart data={givingTrend} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="card p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="section-header">Recent Activity</h2>
                        <Link
                            href="/audit-logs"
                            className="text-xs font-medium text-accent hover:underline"
                        >
                            View all
                        </Link>
                    </div>
                    <ActivityFeed items={activity} />
                </div>
                <div className="card p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="section-header">Upcoming Events</h2>
                        <Link
                            href="/events"
                            className="text-xs font-medium text-accent hover:underline"
                        >
                            View all
                        </Link>
                    </div>
                    <UpcomingEventsWidget events={events} />
                </div>
                <div className="card p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="section-header">Birthdays</h2>
                        {can('birthdays.view') && (
                            <Link
                                href="/birthdays"
                                className="text-xs font-medium text-accent hover:underline"
                            >
                                Send wishes →
                            </Link>
                        )}
                    </div>
                    <BirthdayWidget
                        today={birthdays.today}
                        upcoming={birthdays.upcoming}
                        canSend={can('birthdays.send')}
                    />
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                    {
                        id: 'qs-depts',
                        label: 'Departments',
                        value: quick.departments,
                        icon: 'BuildingOffice2Icon',
                        href: '/departments',
                    },
                    {
                        id: 'qs-ministries',
                        label: 'Ministries',
                        value: quick.ministries,
                        icon: 'HeartIcon',
                        href: '/ministries',
                    },
                    {
                        id: 'qs-boards',
                        label: 'Active Boards',
                        value: quick.boards,
                        sub: `${quick.board_members} board member${quick.board_members === 1 ? '' : 's'}`,
                        icon: 'BriefcaseIcon',
                        href: '/boards',
                    },
                    {
                        id: 'qs-baptisms',
                        label: 'Baptisms (YTD)',
                        value: quick.baptisms_ytd,
                        icon: 'SparklesIcon',
                        href: '/baptisms',
                    },
                ].map((s) => (
                    <Link
                        key={s.id}
                        href={s.href}
                        className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-elevated"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon
                                name={s.icon}
                                size={18}
                                className="text-muted-foreground"
                            />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground tabular-nums">
                                {s.value}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {s.label}
                            </p>
                            {'sub' in s && s.sub && (
                                <p className="text-[11px] text-muted-foreground/80">
                                    {s.sub}
                                </p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
