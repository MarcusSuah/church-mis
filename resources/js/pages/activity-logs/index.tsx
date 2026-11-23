import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import type { LaravelPage } from '@/components/ssbcms/Pagination';
import {
    Paginator,
    ServerPaginator,
    usePagination,
} from '@/components/ssbcms/Pagination';
import {
    Field,
    inputCls,
    Kpi,
    Modal,
    SaveButton,
} from '@/components/ssbcms/records-ui';

type Activity = {
    id: number;
    user_id: number | null;
    user_name: string | null;
    email: string | null;
    event: string;
    description: string | null;
    method: string | null;
    url: string | null;
    ip_address: string | null;
    device: string | null;
    browser: string | null;
    platform: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    is_suspicious: boolean;
    user_agent: string | null;
    created_at: string;
};
type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    avatar: string | null;
    blocked: boolean;
    blocked_reason: string | null;
    last_login_at: string | null;
    last_ip: string | null;
    device: string | null;
    location: string | null;
    online: boolean;
    sessions: number;
    failed_logins_7d: number;
    must_change_password: boolean;
};
type BlockedIp = {
    id: number;
    ip_address: string;
    reason: string | null;
    blocked_by: string | null;
    expires_at: string | null;
    active: boolean;
    created_at: string;
};
type Suspicious = {
    ip_address: string;
    failures: number;
    last_attempt: string;
    emails: number;
    country: string | null;
    city: string | null;
    blocked: boolean;
};
type Filters = {
    search?: string;
    event?: string;
    device?: string;
    user?: string;
    suspicious?: string;
    from?: string;
    to?: string;
};
type Props = {
    activities: LaravelPage<Activity>;
    filters: Filters;
    tab: string;
    stats: {
        today: number;
        active_users: number;
        failed_logins: number;
        blocked: number;
    };
    users: UserRow[];
    blockedIps: BlockedIp[];
    suspicious: Suspicious[];
    events: string[];
    can: { manage: boolean };
};

const EVENT: Record<string, { label: string; cls: string; icon: string }> = {
    login: {
        label: 'Sign in',
        cls: 'bg-green-100 text-green-700',
        icon: 'ArrowRightOnRectangleIcon',
    },
    logout: {
        label: 'Sign out',
        cls: 'bg-gray-100 text-gray-700',
        icon: 'ArrowLeftOnRectangleIcon',
    },
    login_failed: {
        label: 'Failed sign-in',
        cls: 'bg-red-100 text-red-700',
        icon: 'ExclamationTriangleIcon',
    },
    password_changed: {
        label: 'Password changed',
        cls: 'bg-purple-100 text-purple-700',
        icon: 'KeyIcon',
    },
    page_view: {
        label: 'Page view',
        cls: 'bg-slate-100 text-slate-700',
        icon: 'EyeIcon',
    },
    create: {
        label: 'Create',
        cls: 'bg-emerald-100 text-emerald-700',
        icon: 'PlusCircleIcon',
    },
    update: {
        label: 'Update',
        cls: 'bg-blue-100 text-blue-700',
        icon: 'PencilSquareIcon',
    },
    delete: {
        label: 'Delete',
        cls: 'bg-rose-100 text-rose-700',
        icon: 'TrashIcon',
    },
    blocked: {
        label: 'Access control',
        cls: 'bg-amber-100 text-amber-800',
        icon: 'NoSymbolIcon',
    },
};
const DEVICE_ICON: Record<string, string> = {
    Desktop: 'ComputerDesktopIcon',
    Mobile: 'DevicePhoneMobileIcon',
    Tablet: 'DeviceTabletIcon',
    Bot: 'CpuChipIcon',
};
const fmtDT = (d: string | null) =>
    d
        ? new Date(d).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : '—';
const place = (a: {
    city: string | null;
    region: string | null;
    country: string | null;
}) => [a.city, a.region, a.country].filter(Boolean).join(', ') || '—';
const opts = { preserveScroll: true, preserveState: true };

type Tab = 'activity' | 'users' | 'suspicious' | 'blocked';

export default function ActivityLogs(props: Props) {
    const {
        activities,
        filters,
        stats,
        users,
        blockedIps,
        suspicious,
        events,
        can,
    } = props;
    const [tab, setTab] = useState<Tab>(
        (['activity', 'users', 'suspicious', 'blocked'].includes(props.tab)
            ? props.tab
            : 'activity') as Tab,
    );
    const [blockUser, setBlockUser] = useState<UserRow | null>(null);
    const [blockIp, setBlockIp] = useState<{
        ip: string;
        reason?: string;
    } | null>(null);
    const [detail, setDetail] = useState<Activity | null>(null);

    const switchTab = (t: Tab) => {
        setTab(t);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', t);
        window.history.replaceState(window.history.state, '', url);
    };

    const tabs: { id: Tab; label: string; icon: string; count?: number }[] = [
        {
            id: 'activity',
            label: 'Activity',
            icon: 'ClipboardDocumentListIcon',
        },
        {
            id: 'users',
            label: 'Users & Devices',
            icon: 'UsersIcon',
            count: users.filter((u) => u.online).length,
        },
        {
            id: 'suspicious',
            label: 'Suspicious',
            icon: 'ShieldExclamationIcon',
            count: suspicious.filter((s) => !s.blocked).length,
        },
        {
            id: 'blocked',
            label: 'Blocked IPs',
            icon: 'NoSymbolIcon',
            count: blockedIps.filter((b) => b.active).length,
        },
    ];

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Activity Log" />
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Activity Log
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Monitor who is using the system, from which devices and
                        locations — and block suspicious access
                    </p>
                </div>
                {can.manage && (
                    <button
                        type="button"
                        onClick={() => setBlockIp({ ip: '' })}
                        className="btn-outline text-sm"
                    >
                        <Icon name="NoSymbolIcon" size={16} />
                        Block an IP
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    flip
                    label="Events Today"
                    value={stats.today}
                    icon="BoltIcon"
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <Kpi
                    flip
                    label="Active Users (24h)"
                    value={stats.active_users}
                    icon="UsersIcon"
                    color="text-success"
                    bg="bg-success/10"
                />
                <Kpi
                    flip
                    label="Failed Sign-ins (24h)"
                    value={stats.failed_logins}
                    icon="ExclamationTriangleIcon"
                    color="text-warning"
                    bg="bg-warning/10"
                />
                <Kpi
                    flip
                    label="Blocked Users & IPs"
                    value={stats.blocked}
                    icon="NoSymbolIcon"
                    color="text-danger"
                    bg="bg-danger/10"
                />
            </div>

            <div className="flex scrollbar-thin items-center gap-1 overflow-x-auto border-b border-border">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => switchTab(t.id)}
                        className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <Icon name={t.icon} size={15} />
                        {t.label}
                        {!!t.count && (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-xs font-bold text-white ${t.id === 'users' ? 'bg-success' : 'bg-danger'}`}
                            >
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {tab === 'activity' && (
                <ActivityTab
                    activities={activities}
                    filters={filters}
                    events={events}
                    users={users}
                    onDetail={setDetail}
                    onBlockIp={
                        can.manage ? (ip) => setBlockIp({ ip }) : undefined
                    }
                />
            )}
            {tab === 'users' && (
                <UsersTab
                    users={users}
                    canManage={can.manage}
                    onBlock={setBlockUser}
                    onBlockIp={(ip) => setBlockIp({ ip })}
                />
            )}
            {tab === 'suspicious' && (
                <SuspiciousTab
                    rows={suspicious}
                    canManage={can.manage}
                    onBlock={(s) =>
                        setBlockIp({
                            ip: s.ip_address,
                            reason: `${s.failures} failed sign-ins in 24 hours`,
                        })
                    }
                />
            )}
            {tab === 'blocked' && (
                <BlockedTab rows={blockedIps} canManage={can.manage} />
            )}


            {detail && (
                <Modal
                    wide={true}
                    title="Activity Detail"
                    onClose={() => setDetail(null)}
                    footer={
                        <button
                            type="button"
                            onClick={() => setDetail(null)}
                            className="btn-outline text-sm"
                        >
                            Close
                        </button>
                    }
                >
                    <div className="space-y-5">
                        {/* Activity Information */}
                        <div className="divide-y divide-border">
                            {[
                                ['When', fmtDT(detail.created_at)],
                                [
                                    'User',
                                    detail.user_name
                                        ? `${detail.user_name} (${detail.email})`
                                        : detail.email || 'Guest',
                                ],
                                [
                                    'Event',
                                    EVENT[detail.event]?.label ?? detail.event,
                                ],
                                ['Description', detail.description || '—'],
                                [
                                    'Request',
                                    `${detail.method ?? ''} ${detail.url ?? ''}`.trim() || '—',
                                ],
                                ['IP Address', detail.ip_address || '—'],
                                [
                                    'Device',
                                    [
                                        detail.device,
                                        detail.browser,
                                        detail.platform,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ') || '—',
                                ],
                                ['Location', place(detail)],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-4 py-3 sm:grid-cols-[130px_minmax(0,1fr)]"
                                >
                                    <span className="text-sm text-muted-foreground">
                                        {label}
                                    </span>

                                    <span className="min-w-0 text-right text-sm font-medium break-words text-foreground">
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* User Agent */}
                        <div className="rounded-xl border border-border bg-muted/30 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                    <Icon
                                        name="CodeBracketIcon"
                                        size={16}
                                        className="text-primary"
                                    />
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        User Agent
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Browser and device identification
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-border bg-card p-3">
                                <p className="font-mono text-xs leading-6 break-all whitespace-pre-wrap text-muted-foreground">
                                    {detail.user_agent || 'User agent information unavailable'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {blockUser && (
                <BlockUserModal
                    user={blockUser}
                    onClose={() => setBlockUser(null)}
                />
            )}
            {blockIp && (
                <BlockIpModal
                    ip={blockIp.ip}
                    reason={blockIp.reason}
                    onClose={() => setBlockIp(null)}
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */

function ActivityTab({
    activities,
    filters,
    events,
    users,
    onDetail,
    onBlockIp,
}: {
    activities: LaravelPage<Activity>;
    filters: Filters;
    events: string[];
    users: UserRow[];
    onDetail: (a: Activity) => void;
    onBlockIp?: (ip: string) => void;
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const first = useRef(true);
    const apply = (next: Filters) =>
        router.get(
            '/activity-logs',
            { ...filters, ...next, tab: 'activity', page: undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const t = setTimeout(() => apply({ search: search || undefined }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const sel =
        'rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none';
    const exportUrl = `/activity-logs/export?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString()}`;

    return (
        <div className="space-y-4">
            <div className="flex flex-col flex-wrap gap-3 lg:flex-row">
                <div className="relative min-w-[220px] flex-1">
                    <Icon
                        name="MagnifyingGlassIcon"
                        size={16}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search user, email, IP, location, action..."
                        className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                </div>
                <select
                    value={filters.event ?? ''}
                    onChange={(e) =>
                        apply({ event: e.target.value || undefined })
                    }
                    className={sel}
                >
                    <option value="">All Events</option>
                    {events.map((e) => (
                        <option key={e} value={e}>
                            {EVENT[e]?.label ?? e}
                        </option>
                    ))}
                </select>
                <select
                    value={filters.user ?? ''}
                    onChange={(e) =>
                        apply({ user: e.target.value || undefined })
                    }
                    className={sel}
                >
                    <option value="">All Users</option>
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>
                <select
                    value={filters.device ?? ''}
                    onChange={(e) =>
                        apply({ device: e.target.value || undefined })
                    }
                    className={sel}
                >
                    <option value="">All Devices</option>
                    {['Desktop', 'Mobile', 'Tablet', 'Bot'].map((d) => (
                        <option key={d}>{d}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={filters.from ?? ''}
                    onChange={(e) =>
                        apply({ from: e.target.value || undefined })
                    }
                    className={sel}
                    aria-label="From date"
                />
                <input
                    type="date"
                    value={filters.to ?? ''}
                    onChange={(e) => apply({ to: e.target.value || undefined })}
                    className={sel}
                    aria-label="To date"
                />
                <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                        type="checkbox"
                        checked={filters.suspicious === '1'}
                        onChange={(e) =>
                            apply({
                                suspicious: e.target.checked ? '1' : undefined,
                            })
                        }
                        className="rounded border-border"
                    />
                    Suspicious only
                </label>
                <a href={exportUrl} className="btn-outline text-sm">
                    <Icon name="ArrowDownTrayIcon" size={15} />
                    CSV
                </a>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="scrollbar-thin overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                {[
                                    'When',
                                    'User',
                                    'Event',
                                    'Description',
                                    'Device',
                                    'IP / Location',
                                    '',
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activities.data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-12 text-center text-muted-foreground"
                                    >
                                        No activity found
                                    </td>
                                </tr>
                            ) : (
                                activities.data.map((a) => {
                                    const ev = EVENT[a.event] ?? {
                                        label: a.event,
                                        cls: 'bg-muted text-muted-foreground',
                                        icon: 'BoltIcon',
                                    };
                                    return (
                                        <tr
                                            key={a.id}
                                            className={`border-b border-border transition-colors hover:bg-muted/30 ${a.is_suspicious ? 'bg-danger/5' : ''}`}
                                        >
                                            <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                                                {fmtDT(a.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-medium text-foreground">
                                                    {a.user_name || 'Guest'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {a.email || '—'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${ev.cls}`}
                                                >
                                                    <Icon
                                                        name={ev.icon}
                                                        size={12}
                                                    />
                                                    {ev.label}
                                                </span>
                                                {a.is_suspicious && (
                                                    <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                                                        Suspicious
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                className="max-w-[240px] truncate px-4 py-3 text-foreground"
                                                title={a.description ?? ''}
                                            >
                                                {a.description || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1.5">
                                                    <Icon
                                                        name={
                                                            DEVICE_ICON[
                                                            a.device ?? ''
                                                            ] ??
                                                            'ComputerDesktopIcon'
                                                        }
                                                        size={14}
                                                    />
                                                    {[a.browser, a.platform]
                                                        .filter(Boolean)
                                                        .join(' · ') || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-mono text-xs text-foreground">
                                                    {a.ip_address || '—'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {place(a)}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onDetail(a)
                                                        }
                                                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        aria-label="Details"
                                                    >
                                                        <Icon
                                                            name="EyeIcon"
                                                            size={14}
                                                        />
                                                    </button>
                                                    {onBlockIp &&
                                                        a.ip_address && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    onBlockIp(
                                                                        a.ip_address!,
                                                                    )
                                                                }
                                                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                                                                title="Block this IP"
                                                            >
                                                                <Icon
                                                                    name="NoSymbolIcon"
                                                                    size={14}
                                                                />
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <ServerPaginator meta={activities} />
            </div>
        </div>
    );
}

function UsersTab({
    users,
    canManage,
    onBlock,
    onBlockIp,
}: {
    users: UserRow[];
    canManage: boolean;
    onBlock: (u: UserRow) => void;
    onBlockIp: (ip: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('All');
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return users.filter(
            (u) =>
                (!q ||
                    u.name.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    (u.last_ip ?? '').includes(q) ||
                    (u.location ?? '').toLowerCase().includes(q)) &&
                (status === 'All' ||
                    (status === 'Online' && u.online) ||
                    (status === 'Blocked' && u.blocked) ||
                    (status === 'Failed sign-ins' && u.failed_logins_7d > 0)),
        );
    }, [users, search, status]);
    const pager = usePagination(filtered, 15);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Icon
                        name="MagnifyingGlassIcon"
                        size={16}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, email, IP, location..."
                        className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
                >
                    {['All', 'Online', 'Blocked', 'Failed sign-ins'].map(
                        (s) => (
                            <option key={s}>{s}</option>
                        ),
                    )}
                </select>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="scrollbar-thin overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                {[
                                    'User',
                                    'Status',
                                    'Last Sign-in',
                                    'Device',
                                    'IP / Location',
                                    'Security',
                                    '',
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pager.pageItems.map((u) => (
                                <tr
                                    key={u.id}
                                    className={`border-b border-border transition-colors hover:bg-muted/30 ${u.blocked ? 'bg-danger/5' : ''}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="gradient-gold flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white">
                                                    {u.avatar ? (
                                                        <img
                                                            src={u.avatar}
                                                            alt=""
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        u.name
                                                            .split(' ')
                                                            .map((p) => p[0])
                                                            .slice(0, 2)
                                                            .join('')
                                                    )}
                                                </div>
                                                <span
                                                    className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-card ${u.online ? 'bg-success' : 'bg-muted-foreground/40'}`}
                                                />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">
                                                    {u.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {u.email} ·{' '}
                                                    {u.role ?? 'No role'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.blocked ? (
                                            <span
                                                className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger"
                                                title={u.blocked_reason ?? ''}
                                            >
                                                Blocked
                                            </span>
                                        ) : u.online ? (
                                            <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                                                Online · {u.sessions} session
                                                {u.sessions === 1 ? '' : 's'}
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                Offline
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {fmtDT(u.last_login_at)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {u.device || '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-mono text-xs text-foreground">
                                            {u.last_ip || '—'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {u.location || '—'}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        {u.failed_logins_7d > 0 && (
                                            <p className="text-warning">
                                                {u.failed_logins_7d} failed
                                                sign-in
                                                {u.failed_logins_7d === 1
                                                    ? ''
                                                    : 's'}{' '}
                                                (7d)
                                            </p>
                                        )}
                                        {u.must_change_password && (
                                            <p className="text-muted-foreground">
                                                On default password
                                            </p>
                                        )}
                                        {!u.failed_logins_7d &&
                                            !u.must_change_password && (
                                                <p className="text-success">
                                                    OK
                                                </p>
                                            )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.get(
                                                        '/activity-logs',
                                                        {
                                                            user: u.id,
                                                            tab: 'activity',
                                                        },
                                                    )
                                                }
                                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                title="View activity"
                                            >
                                                <Icon
                                                    name="ClipboardDocumentListIcon"
                                                    size={14}
                                                />
                                            </button>
                                            {canManage && (
                                                <>
                                                    {u.online && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                router.post(
                                                                    `/activity-logs/users/${u.id}/sign-out`,
                                                                    {},
                                                                    opts,
                                                                )
                                                            }
                                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            title="Sign out of all devices"
                                                        >
                                                            <Icon
                                                                name="ArrowLeftOnRectangleIcon"
                                                                size={14}
                                                            />
                                                        </button>
                                                    )}
                                                    {u.last_ip && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onBlockIp(
                                                                    u.last_ip!,
                                                                )
                                                            }
                                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                                                            title="Block last IP"
                                                        >
                                                            <Icon
                                                                name="GlobeAltIcon"
                                                                size={14}
                                                            />
                                                        </button>
                                                    )}
                                                    {u.blocked ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                router.post(
                                                                    `/activity-logs/users/${u.id}/unblock`,
                                                                    {},
                                                                    opts,
                                                                )
                                                            }
                                                            className="rounded-lg px-2 py-1 text-xs font-medium text-success hover:bg-success/10"
                                                        >
                                                            Unblock
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onBlock(u)
                                                            }
                                                            className="rounded-lg px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10"
                                                        >
                                                            Block
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Paginator {...pager} />
            </div>
        </div>
    );
}

function SuspiciousTab({
    rows,
    canManage,
    onBlock,
}: {
    rows: Suspicious[];
    canManage: boolean;
    onBlock: (s: Suspicious) => void;
}) {
    if (!rows.length) {
        return (
            <div className="card p-12 text-center">
                <Icon
                    name="ShieldCheckIcon"
                    size={40}
                    className="mx-auto mb-3 text-success/60"
                />
                <p className="font-medium text-foreground">
                    No suspicious activity in the last 24 hours
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    IP addresses with repeated failed sign-ins show up here.
                </p>
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {rows.map((s) => (
                <div
                    key={s.ip_address}
                    className="card flex flex-col gap-3 border-danger/30 p-4 sm:flex-row sm:items-center"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10">
                        <Icon
                            name="ShieldExclamationIcon"
                            size={20}
                            className="text-danger"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-semibold text-foreground">
                            {s.ip_address}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {s.failures} failed sign-ins · {s.emails} account
                            {s.emails === 1 ? '' : 's'} tried ·{' '}
                            {[s.city, s.country].filter(Boolean).join(', ') ||
                                'Unknown location'}{' '}
                            · last {fmtDT(s.last_attempt)}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                router.get('/activity-logs', {
                                    search: s.ip_address,
                                    tab: 'activity',
                                })
                            }
                            className="btn-outline px-3 py-1.5 text-xs"
                        >
                            View attempts
                        </button>
                        {s.blocked ? (
                            <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                                Blocked
                            </span>
                        ) : (
                            canManage && (
                                <button
                                    type="button"
                                    onClick={() => onBlock(s)}
                                    className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:bg-danger/90"
                                >
                                    Block IP
                                </button>
                            )
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function BlockedTab({
    rows,
    canManage,
}: {
    rows: BlockedIp[];
    canManage: boolean;
}) {
    const pager = usePagination(rows, 15);
    if (!rows.length)
        return (
            <div className="card p-12 text-center text-sm text-muted-foreground">
                No IP addresses are blocked.
            </div>
        );
    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/40">
                        {[
                            'IP Address',
                            'Reason',
                            'Blocked By',
                            'Since',
                            'Expires',
                            '',
                        ].map((h) => (
                            <th
                                key={h}
                                className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {pager.pageItems.map((b) => (
                        <tr
                            key={b.id}
                            className={`border-b border-border ${b.active ? '' : 'opacity-50'}`}
                        >
                            <td className="px-4 py-3 font-mono text-xs text-foreground">
                                {b.ip_address}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                {b.reason || '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                {b.blocked_by || '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                {fmtDT(b.created_at)}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                {b.expires_at ? fmtDT(b.expires_at) : 'Never'}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {canManage && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.delete(
                                                `/activity-logs/blocked-ips/${b.id}`,
                                                opts,
                                            )
                                        }
                                        className="rounded-lg px-2 py-1 text-xs font-medium text-success hover:bg-success/10"
                                    >
                                        Unblock
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Paginator {...pager} />
        </div>
    );
}

function BlockUserModal({
    user,
    onClose,
}: {
    user: UserRow;
    onClose: () => void;
}) {
    const form = useForm({ reason: '' });
    return (
        <Modal
            wide={false}
            title={`Block ${user.name}?`}
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline text-sm"
                    >
                        Cancel
                    </button>
                    <SaveButton
                        saving={form.processing}
                        label="Block User"
                        onClick={() =>
                            form.post(`/activity-logs/users/${user.id}/block`, {
                                ...opts,
                                onSuccess: onClose,
                            })
                        }
                    />
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    They will be signed out of every device immediately and
                    won't be able to sign in until you unblock them.
                </p>
                <Field label="Reason (internal)" error={form.errors.reason}>
                    <textarea
                        rows={3}
                        className={`${inputCls} resize-none`}
                        value={form.data.reason}
                        onChange={(e) => form.setData('reason', e.target.value)}
                        placeholder="e.g. Suspicious sign-ins from unknown devices"
                    />
                </Field>
            </div>
        </Modal>
    );
}

function BlockIpModal({
    ip,
    reason,
    onClose,
}: {
    ip: string;
    reason?: string;
    onClose: () => void;
}) {
    const form = useForm({ ip_address: ip, reason: reason ?? '', hours: '' });
    return (
        <Modal
            wide={false}
            title="Block IP Address"
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline text-sm"
                    >
                        Cancel
                    </button>
                    <SaveButton
                        saving={form.processing}
                        disabled={!form.data.ip_address}
                        label="Block IP"
                        onClick={() =>
                            form.post('/activity-logs/blocked-ips', {
                                ...opts,
                                onSuccess: onClose,
                            })
                        }
                    />
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Nobody — signed in or not — can open the website from this
                    address while it is blocked.
                </p>
                <Field label="IP Address *" error={form.errors.ip_address}>
                    <input
                        className={`${inputCls} font-mono`}
                        value={form.data.ip_address}
                        onChange={(e) =>
                            form.setData('ip_address', e.target.value)
                        }
                        placeholder="203.0.113.45"
                    />
                </Field>
                <Field label="Duration" error={form.errors.hours}>
                    <select
                        className={inputCls}
                        value={form.data.hours}
                        onChange={(e) => form.setData('hours', e.target.value)}
                    >
                        <option value="">Until I unblock it</option>
                        <option value="1">1 hour</option>
                        <option value="24">24 hours</option>
                        <option value="168">7 days</option>
                        <option value="720">30 days</option>
                    </select>
                </Field>
                <Field label="Reason" error={form.errors.reason}>
                    <textarea
                        rows={2}
                        className={`${inputCls} resize-none`}
                        value={form.data.reason}
                        onChange={(e) => form.setData('reason', e.target.value)}
                        placeholder="e.g. Repeated failed sign-ins"
                    />
                </Field>
            </div>
        </Modal>
    );
}
