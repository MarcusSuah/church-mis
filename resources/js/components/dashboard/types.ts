export type DashboardKpis = {
    active_members: number;
    new_this_month: number;
    pending: number;
    giving: number;
    giving_change: number | null;
    attendance: number;
    attendance_date: string | null;
    attendance_rate: number | null;
    prayers_open: number;
    prayers_unassigned: number;
    events_week: number;
    next_event: string | null;
};
export type GrowthPoint = {
    month: string;
    label: string;
    active: number;
    new: number;
};
export type DeptSlice = { name: string; value: number };
export type AttendancePoint = {
    label: string;
    service: string;
    present: number;
    late: number;
    absent: number;
};
export type GivingPoint = {
    month: string;
    label: string;
    actual: number;
    budget: number | null;
};
export type ActivityItem = {
    id: string;
    action: string;
    module: string | null;
    description: string | null;
    by: string;
    by_name: string;
    at: string;
};
export type EventItem = {
    id: string;
    title: string;
    start: string;
    location: string | null;
    type: string;
    registered: number;
    capacity: number | null;
};
export type BirthdayItem = {
    id: string;
    name: string;
    initials: string;
    photo_url: string | null;
    department: string | null;
    next_birthday: string;
    days_until: number;
    turning: number;
};

export function timeAgo(iso: string): string {
    const s = Math.max(
        1,
        Math.round((Date.now() - new Date(iso).getTime()) / 1000),
    );
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    const d = Math.round(h / 24);
    return d === 1 ? 'yesterday' : `${d} days ago`;
}

export const CHART_COLORS = [
    'var(--color-primary)',
    'var(--color-accent)',
    'var(--color-success)',
    '#7c3aed',
    '#0891b2',
    '#db2777',
    '#ea580c',
    'var(--color-muted-foreground)',
];
