import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    Clock,
    HandHeart,
    Loader2,
    Lock,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import {
    destroy,
    index,
    pray as prayRoute,
    status as statusRoute,
    store,
    update,
} from '@/routes/prayer-requests';

type Prayer = {
    id: string;
    subject: string;
    raw_subject: string | null;
    request_details: string;
    category: string;
    requester: string;
    requester_name: string | null;
    member_code: string | null;
    from_portal: boolean;
    is_anonymous: boolean;
    is_urgent: boolean;
    is_private: boolean;
    status: string;
    assigned_to: string | null;
    prayer_count: number;
    response: string | null;
    notes: string | null;
    resolved_at: string | null;
    created_at: string;
};

type Filters = {
    search: string | null;
    category: string | null;
    status: string | null;
};

type Props = {
    requests: Prayer[];
    total: number;
    limit: number;
    pageSize: number;
    filters: Filters;
    stats: { total: number; active: number; urgent: number; answered: number };
    categories: string[];
    statuses: string[];
    assignees: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const STATUS_STYLE: Record<string, string> = {
    Active: 'bg-info/10 text-info',
    Answered: 'bg-success/10 text-success',
    Closed: 'bg-muted text-muted-foreground',
};

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

function prayFetch(id: string) {
    const xsrf = decodeURIComponent(
        document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
    );
    return fetch(prayRoute.url(id), {
        method: 'POST',
        headers: {
            'X-XSRF-TOKEN': xsrf,
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
    })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null) as Promise<{
        prayer_count: number;
        already: boolean;
    } | null>;
}

function Badges({ p, size = 'sm' }: { p: Prayer; size?: 'sm' | 'md' }) {
    const pad = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5';
    return (
        <div className="flex flex-wrap items-center gap-2">
            {p.is_urgent && p.status === 'Active' && (
                <span
                    className={`flex items-center gap-1 rounded-full bg-danger/10 text-xs font-medium text-danger ${pad}`}
                >
                    <AlertTriangle size={10} />
                    Urgent
                </span>
            )}
            <span
                className={`rounded-full text-xs font-medium ${STATUS_STYLE[p.status] ?? STATUS_STYLE.Active} ${pad}`}
            >
                {p.status}
            </span>
            <span
                className={`rounded-full bg-muted text-xs text-muted-foreground ${pad}`}
            >
                {p.category}
            </span>
            {p.is_private && (
                <span
                    className={`flex items-center gap-1 rounded-full bg-muted text-xs text-muted-foreground ${pad}`}
                    title="Only the pastoral team should see this"
                >
                    <Lock size={10} />
                    Private
                </span>
            )}
        </div>
    );
}

export default function PrayerRequests({
    requests,
    total,
    limit,
    pageSize,
    filters,
    stats,
    categories,
    statuses,
    assignees,
    can,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editing, setEditing] = useState<Prayer | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Prayer | null>(null);
    const [busy, setBusy] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [prayed, setPrayed] = useState<Record<string, boolean>>({});
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selected = requests.find((r) => r.id === selectedId) ?? null;
    const prayerCount = (p: Prayer) => counts[p.id] ?? p.prayer_count;

    // Current filters as query params (empty ones dropped). Changing a filter starts again at the first page.
    const params = (over: Partial<Filters> = {}) => {
        const merged = {
            search: search || null,
            category: filters.category,
            status: filters.status,
            ...over,
        };
        return Object.fromEntries(
            Object.entries(merged).filter(
                ([, v]) => v !== null && v !== undefined && v !== '',
            ),
        );
    };

    const reload = (over: Partial<Filters> = {}) =>
        router.get(index.url(), params(over) as Record<string, string>, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });

    useEffect(() => {
        if (search === (filters.search ?? '')) return;
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(
            () => reload({ search: search || null }),
            350,
        );
        return () => {
            if (debounce.current) clearTimeout(debounce.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const loadMore = () => {
        setLoadingMore(true);
        router.get(
            index.url(),
            { ...params(), limit: limit + pageSize } as Record<
                string,
                string | number
            >,
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['requests', 'total', 'limit'],
                onFinish: () => setLoadingMore(false),
            },
        );
    };

    const pray = (p: Prayer) => {
        if (prayed[p.id]) return;
        setPrayed((x) => ({ ...x, [p.id]: true }));
        setCounts((c) => ({ ...c, [p.id]: prayerCount(p) + 1 }));
        prayFetch(p.id).then(
            (r) => r && setCounts((c) => ({ ...c, [p.id]: r.prayer_count })),
        );
    };

    const markAnswered = (p: Prayer) =>
        router.patch(
            statusRoute.url(p.id),
            { status: 'Answered' },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setSelectedId(null),
            },
        );

    const confirmDelete = () => {
        if (!deleting) return;
        setBusy(true);
        router.delete(destroy.url(deleting.id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                if (selectedId === deleting.id) setSelectedId(null);
                setDeleting(null);
            },
            onFinish: () => setBusy(false),
        });
    };

    const kpis = [
        {
            label: 'Total Requests',
            value: stats.total,
            Icon: HandHeart,
            color: 'text-primary',
        },
        {
            label: 'Active',
            value: stats.active,
            Icon: Clock,
            color: 'text-info',
        },
        {
            label: 'Urgent',
            value: stats.urgent,
            Icon: AlertTriangle,
            color: 'text-danger',
        },
        {
            label: 'Answered',
            value: stats.answered,
            Icon: CheckCircle2,
            color: 'text-success',
        },
    ];

    const remaining = total - requests.length;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-6">
            <Head title="Prayer Requests" />

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Prayer Requests
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage and intercede for congregation prayer needs
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Plus size={16} />
                        Add Request
                    </button>
                )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {kpis.map((k) => (
                    <div
                        key={k.label}
                        className="card flex items-center gap-4 p-5"
                    >
                        <k.Icon className={`size-5 shrink-0 ${k.color}`} />
                        <div>
                            <p className="text-2xl font-bold text-foreground tabular-nums">
                                {k.value}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {k.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search
                        size={16}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search prayer requests..."
                        className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                </div>
                <select
                    value={filters.category ?? ''}
                    onChange={(e) =>
                        reload({ category: e.target.value || null })
                    }
                    aria-label="Filter by category"
                    className="min-w-40 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
                >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                        <option key={c}>{c}</option>
                    ))}
                </select>
                <select
                    value={filters.status ?? ''}
                    onChange={(e) => reload({ status: e.target.value || null })}
                    aria-label="Filter by status"
                    className="min-w-32 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
                >
                    <option value="">All statuses</option>
                    {statuses.map((s) => (
                        <option key={s}>{s}</option>
                    ))}
                </select>
            </div>

            {/* List */}
            {requests.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                    <HandHeart size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No prayer requests found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map((p) => (
                        <div
                            key={p.id}
                            className={`card p-4 transition-shadow hover:shadow-sm ${p.is_urgent && p.status === 'Active' ? 'border-danger/30' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1">
                                        <Badges p={p} />
                                    </div>
                                    <h3
                                        className="cursor-pointer text-sm font-semibold text-foreground hover:text-primary"
                                        onClick={() => setSelectedId(p.id)}
                                    >
                                        {p.subject}
                                    </h3>
                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                        {p.request_details}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        <span>{p.requester}</span>
                                        <span>·</span>
                                        <span>{formatDate(p.created_at)}</span>
                                        {p.assigned_to && (
                                            <>
                                                <span>·</span>
                                                <span>
                                                    Assigned to {p.assigned_to}
                                                </span>
                                            </>
                                        )}
                                        {p.from_portal && (
                                            <>
                                                <span>·</span>
                                                <span className="text-accent">
                                                    via Member Portal
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                    <div className="flex gap-1">
                                        {can.update && (
                                            <button
                                                type="button"
                                                onClick={() => setEditing(p)}
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                aria-label="Edit request"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                        )}
                                        {can.delete && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleting(p)}
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                                                aria-label="Delete request"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => pray(p)}
                                        disabled={prayed[p.id]}
                                        title={
                                            prayed[p.id]
                                                ? 'You prayed for this'
                                                : 'I prayed for this'
                                        }
                                        className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-default disabled:opacity-70"
                                    >
                                        <HandHeart size={12} />
                                        Pray ({prayerCount(p)})
                                    </button>
                                    {can.update && p.status === 'Active' && (
                                        <button
                                            type="button"
                                            onClick={() => markAnswered(p)}
                                            className="flex items-center gap-1 rounded-lg bg-success/10 px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-success/20"
                                        >
                                            <CheckCircle2 size={11} />
                                            Mark Answered
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Load more */}
                    <div className="flex flex-col items-center gap-2 pt-2">
                        <p className="text-xs text-muted-foreground">
                            Showing {requests.length} of {total}
                        </p>
                        {remaining > 0 && (
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="btn-outline text-sm"
                            >
                                {loadingMore ? (
                                    <Loader2
                                        size={14}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <ChevronDown size={14} />
                                )}
                                Load {Math.min(pageSize, remaining)} more
                            </button>
                        )}
                    </div>
                </div>
            )}

            {selected && (
                <DetailDrawer
                    p={selected}
                    count={prayerCount(selected)}
                    prayed={!!prayed[selected.id]}
                    can={can}
                    onPray={() => pray(selected)}
                    onAnswered={() => markAnswered(selected)}
                    onEdit={() => {
                        setEditing(selected);
                        setSelectedId(null);
                    }}
                    onClose={() => setSelectedId(null)}
                />
            )}

            {editing && (
                <PrayerModal
                    prayer={editing === 'new' ? null : editing}
                    categories={categories}
                    statuses={statuses}
                    assignees={assignees}
                    onClose={() => setEditing(null)}
                />
            )}

            <ConfirmModal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Delete Prayer Request"
                message={
                    deleting
                        ? `Delete "${deleting.subject}"?${deleting.from_portal ? ' It will also disappear from the member’s portal.' : ''}`
                        : ''
                }
                confirmLabel="Yes, Delete"
                variant="danger"
                loading={busy}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */

function DetailDrawer({
    p,
    count,
    prayed,
    can,
    onPray,
    onAnswered,
    onEdit,
    onClose,
}: {
    p: Prayer;
    count: number;
    prayed: boolean;
    can: Props['can'];
    onPray: () => void;
    onAnswered: () => void;
    onEdit: () => void;
    onClose: () => void;
}) {
    useEffect(() => {
        const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
        >
            <div className="flex-1 bg-black/40 fade-in" onClick={onClose} />
            <div className="slide-up w-full max-w-md overflow-y-auto border-l border-border bg-background">
                <div className="flex items-center justify-between border-b border-border p-5">
                    <h2 className="text-base font-bold text-foreground">
                        Prayer Request Details
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="space-y-4 p-5">
                    <Badges p={p} size="md" />
                    <h3 className="text-lg font-bold text-foreground">
                        {p.subject}
                    </h3>
                    <div className="rounded-xl bg-muted/50 p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                            {p.request_details}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            {
                                label: 'Requested By',
                                value:
                                    p.requester +
                                    (p.member_code && !p.is_anonymous
                                        ? ` (${p.member_code})`
                                        : ''),
                            },
                            {
                                label: 'Date Submitted',
                                value: formatDate(p.created_at),
                            },
                            {
                                label: 'Assigned To',
                                value: p.assigned_to || 'Unassigned',
                            },
                            { label: 'Prayer Count', value: String(count) },
                        ].map((i) => (
                            <div
                                key={i.label}
                                className="rounded-lg bg-muted/50 p-3"
                            >
                                <p className="mb-0.5 text-xs text-muted-foreground">
                                    {i.label}
                                </p>
                                <p className="text-sm font-medium text-foreground">
                                    {i.value}
                                </p>
                            </div>
                        ))}
                    </div>
                    {p.response && (
                        <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                            <h4 className="mb-1 text-xs font-semibold text-success">
                                Response to Requester
                            </h4>
                            <p className="text-sm whitespace-pre-line text-foreground">
                                {p.response}
                            </p>
                        </div>
                    )}
                    {p.notes && (
                        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                            <h4 className="mb-1 text-xs font-semibold text-accent">
                                Pastoral Notes (internal)
                            </h4>
                            <p className="text-sm whitespace-pre-line text-muted-foreground">
                                {p.notes}
                            </p>
                        </div>
                    )}
                    {p.resolved_at && (
                        <p className="text-xs text-success">
                            Answered on {formatDate(p.resolved_at)}
                        </p>
                    )}
                    <div className="space-y-2 pt-2">
                        <button
                            type="button"
                            onClick={onPray}
                            disabled={prayed}
                            className="btn-primary w-full justify-center py-2.5 text-sm disabled:opacity-70"
                        >
                            <HandHeart size={16} />
                            {prayed
                                ? `You prayed for this (${count})`
                                : `Pray for This Request (${count})`}
                        </button>
                        {can.update && (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onEdit}
                                    className="btn-outline flex-1 justify-center py-2.5 text-sm"
                                >
                                    <Pencil size={14} />
                                    Edit
                                </button>
                                {p.status === 'Active' && (
                                    <button
                                        type="button"
                                        onClick={onAnswered}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-success/10 py-2.5 text-sm font-medium text-success hover:bg-success/20"
                                    >
                                        <CheckCircle2 size={14} />
                                        Mark Answered
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function PrayerModal({
    prayer,
    categories,
    statuses,
    assignees,
    onClose,
}: {
    prayer: Prayer | null;
    categories: string[];
    statuses: string[];
    assignees: string[];
    onClose: () => void;
}) {
    const form = useForm({
        requester_name: prayer?.requester_name ?? '',
        subject: prayer?.raw_subject ?? prayer?.subject ?? '',
        request_details: prayer?.request_details ?? '',
        category: prayer?.category ?? 'General',
        is_anonymous: prayer?.is_anonymous ?? false,
        is_urgent: prayer?.is_urgent ?? false,
        is_private: prayer?.is_private ?? false,
        status: prayer?.status ?? 'Active',
        assigned_to: prayer?.assigned_to ?? '',
        response: prayer?.response ?? '',
        notes: prayer?.notes ?? '',
    });

    // Keep a custom (non-leader) assignee selectable when editing.
    const assigneeOptions =
        form.data.assigned_to && !assignees.includes(form.data.assigned_to)
            ? [form.data.assigned_to, ...assignees]
            : assignees;

    const save = () => {
        form.transform((d) => ({
            ...d,
            requester_name: d.is_anonymous ? null : d.requester_name || null,
            assigned_to: d.assigned_to || null,
        }));
        const opts = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: onClose,
        };
        if (prayer) form.patch(update.url(prayer.id), opts);
        else form.post(store.url(), opts);
    };

    const label = 'mb-1 block text-xs font-medium text-muted-foreground';
    const err = (k: keyof typeof form.data) =>
        form.errors[k] && <p className="error-text">{form.errors[k]}</p>;
    const check = (
        k: 'is_anonymous' | 'is_urgent' | 'is_private',
        text: ReactNode,
    ) => (
        <label className="flex cursor-pointer items-center gap-2">
            <input
                type="checkbox"
                checked={form.data[k]}
                onChange={(e) => form.setData(k, e.target.checked)}
                className="size-4 rounded border-border"
            />
            <span className="text-sm text-foreground">{text}</span>
        </label>
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="scale-in relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-background shadow-xl">
                <div className="flex items-center justify-between border-b border-border p-5">
                    <h2 className="text-lg font-bold text-foreground">
                        {prayer ? 'Edit Prayer Request' : 'New Prayer Request'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="scrollbar-thin space-y-4 overflow-y-auto p-5">
                    <div className="flex flex-wrap gap-4">
                        {check('is_anonymous', 'Anonymous')}
                        {check('is_urgent', 'Urgent')}
                        {check(
                            'is_private',
                            <span className="flex items-center gap-1">
                                <Lock size={12} /> Private (pastoral team only)
                            </span>,
                        )}
                    </div>
                    {!form.data.is_anonymous && (
                        <div>
                            <label className={label}>Requester Name</label>
                            <input
                                value={form.data.requester_name}
                                onChange={(e) =>
                                    form.setData(
                                        'requester_name',
                                        e.target.value,
                                    )
                                }
                                placeholder="Full name"
                                className="input-field"
                            />
                            {err('requester_name')}
                        </div>
                    )}
                    <div>
                        <label className={label}>Subject *</label>
                        <input
                            value={form.data.subject}
                            onChange={(e) =>
                                form.setData('subject', e.target.value)
                            }
                            placeholder="Prayer request subject"
                            className="input-field"
                        />
                        {err('subject')}
                    </div>
                    <div>
                        <label className={label}>Request Details *</label>
                        <textarea
                            value={form.data.request_details}
                            onChange={(e) =>
                                form.setData('request_details', e.target.value)
                            }
                            rows={4}
                            placeholder="Describe the prayer need..."
                            className="input-field resize-none"
                        />
                        {err('request_details')}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={label}>Category</label>
                            <select
                                value={form.data.category}
                                onChange={(e) =>
                                    form.setData('category', e.target.value)
                                }
                                className="input-field"
                            >
                                {categories.map((c) => (
                                    <option key={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={label}>Status</label>
                            <select
                                value={form.data.status}
                                onChange={(e) =>
                                    form.setData('status', e.target.value)
                                }
                                className="input-field"
                            >
                                {statuses.map((s) => (
                                    <option key={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={label}>Assign To</label>
                        <select
                            value={form.data.assigned_to}
                            onChange={(e) =>
                                form.setData('assigned_to', e.target.value)
                            }
                            className="input-field"
                        >
                            <option value="">Unassigned</option>
                            {assigneeOptions.map((a) => (
                                <option key={a}>{a}</option>
                            ))}
                        </select>
                        {assignees.length === 0 && (
                            <p className="helper-text">
                                Add people under Church Structure → Leadership
                                to assign requests.
                            </p>
                        )}
                    </div>
                    {prayer?.from_portal && (
                        <div>
                            <label className={label}>
                                Response to Requester
                            </label>
                            <textarea
                                value={form.data.response}
                                onChange={(e) =>
                                    form.setData('response', e.target.value)
                                }
                                rows={2}
                                placeholder="Shown to the member in their portal..."
                                className="input-field resize-none"
                            />
                        </div>
                    )}
                    <div>
                        <label className={label}>Pastoral Notes</label>
                        <textarea
                            value={form.data.notes}
                            onChange={(e) =>
                                form.setData('notes', e.target.value)
                            }
                            rows={2}
                            placeholder="Internal pastoral notes (never shown to the requester)..."
                            className="input-field resize-none"
                        />
                    </div>
                </div>
                <div className="flex gap-3 border-t border-border p-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline flex-1 justify-center py-2.5 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={
                            form.processing ||
                            !form.data.subject.trim() ||
                            !form.data.request_details.trim()
                        }
                        className="btn-primary flex-1 justify-center py-2.5 text-sm"
                    >
                        {form.processing && (
                            <Loader2 size={14} className="animate-spin" />
                        )}
                        {prayer ? 'Save Changes' : 'Submit Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}

PrayerRequests.layout = {
    breadcrumbs: [{ title: 'Prayer Requests', href: index() }],
};
