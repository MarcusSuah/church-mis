import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import { timeAgo } from '@/components/ssbcms/Topbar';

type Item = {
    id: string;
    title: string;
    message: string;
    type: string;
    recipient: string;
    recipient_label: string;
    link_url: string | null;
    created_by: string;
    sent_at: string | null;
    is_read: boolean;
    editable: boolean;
};

type Props = {
    notifications: Item[];
    types: string[];
    recipients: { value: string; label: string }[];
    can: { manage: boolean };
};

const TYPE_CONFIG: Record<
    string,
    { label: string; color: string; bg: string; icon: string }
> = {
    info: {
        label: 'Info',
        color: 'text-blue-700',
        bg: 'bg-blue-100',
        icon: 'InformationCircleIcon',
    },
    success: {
        label: 'Success',
        color: 'text-green-700',
        bg: 'bg-green-100',
        icon: 'CheckCircleIcon',
    },
    warning: {
        label: 'Warning',
        color: 'text-amber-700',
        bg: 'bg-amber-100',
        icon: 'ExclamationTriangleIcon',
    },
    error: {
        label: 'Error',
        color: 'text-red-700',
        bg: 'bg-red-100',
        icon: 'XCircleIcon',
    },
    prayer: {
        label: 'Prayer',
        color: 'text-purple-700',
        bg: 'bg-purple-100',
        icon: 'HandRaisedIcon',
    },
    event: {
        label: 'Event',
        color: 'text-indigo-700',
        bg: 'bg-indigo-100',
        icon: 'CalendarIcon',
    },
    finance: {
        label: 'Finance',
        color: 'text-emerald-700',
        bg: 'bg-emerald-100',
        icon: 'BanknotesIcon',
    },
    member: {
        label: 'Member',
        color: 'text-cyan-700',
        bg: 'bg-cyan-100',
        icon: 'UsersIcon',
    },
    system: {
        label: 'System',
        color: 'text-gray-700',
        bg: 'bg-gray-100',
        icon: 'Cog6ToothIcon',
    },
};

const opts = { preserveScroll: true, preserveState: true };

export default function Notifications({
    notifications,
    types,
    recipients,
    can,
}: Props) {
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>(
        'all',
    );
    const [editing, setEditing] = useState<Item | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Item | null>(null);
    const [busy, setBusy] = useState(false);

    const unread = notifications.filter((n) => !n.is_read).length;

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return notifications.filter(
            (n) =>
                (typeFilter === 'All' || n.type === typeFilter) &&
                (readFilter === 'all' ||
                    (readFilter === 'unread' ? !n.is_read : n.is_read)) &&
                (!q ||
                    n.title.toLowerCase().includes(q) ||
                    n.message.toLowerCase().includes(q)),
        );
    }, [notifications, search, typeFilter, readFilter]);

    const open = (n: Item) => {
        if (!n.is_read) router.post(`/notifications/${n.id}/read`, {}, opts);
        if (n.link_url) router.visit(n.link_url);
    };

    const confirmDelete = () => {
        if (!deleting) return;
        setBusy(true);
        router.delete(`/notifications/${deleting.id}`, {
            ...opts,
            onSuccess: () => setDeleting(null),
            onFinish: () => setBusy(false),
        });
    };

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Notifications" />

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                        Notifications
                        {unread > 0 && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
                                {unread}
                            </span>
                        )}
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {unread} unread of {notifications.length} total
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unread > 0 && (
                        <button
                            type="button"
                            onClick={() =>
                                router.post('/notifications/read-all', {}, opts)
                            }
                            className="btn-outline text-sm"
                        >
                            Mark All Read
                        </button>
                    )}
                    {can.manage && (
                        <button
                            type="button"
                            onClick={() => setEditing('new')}
                            className="btn-primary text-sm"
                        >
                            <Icon name="PlusIcon" size={16} />
                            New Notification
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Icon
                        name="MagnifyingGlassIcon"
                        size={16}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        type="text"
                        placeholder="Search notifications..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field pl-9"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="input-field sm:w-44"
                    aria-label="Filter by type"
                >
                    <option value="All">All Types</option>
                    {types.map((t) => (
                        <option key={t} value={t}>
                            {TYPE_CONFIG[t]?.label ?? t}
                        </option>
                    ))}
                </select>
                <div className="flex overflow-hidden rounded-lg border border-border bg-card">
                    {(['all', 'unread', 'read'] as const).map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setReadFilter(v)}
                            className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${readFilter === v ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="card p-12 text-center">
                    <Icon
                        name="BellSlashIcon"
                        size={40}
                        className="mx-auto mb-3 text-muted-foreground/40"
                    />
                    <p className="text-muted-foreground">
                        No notifications found
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((n) => {
                        const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
                        return (
                            <div
                                key={n.id}
                                className={`rounded-xl border bg-card transition-all ${n.is_read ? 'border-border opacity-75' : 'border-primary/30 shadow-sm'}`}
                            >
                                <div className="flex items-start gap-4 p-4">
                                    <div
                                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}
                                    >
                                        <Icon
                                            name={cfg.icon}
                                            size={18}
                                            className={cfg.color}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => open(n)}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3
                                                    className={`text-sm font-semibold ${n.is_read ? 'text-muted-foreground' : 'text-foreground'}`}
                                                >
                                                    {n.title}
                                                </h3>
                                                {!n.is_read && (
                                                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                                                )}
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                                                >
                                                    {cfg.label}
                                                </span>
                                                {can.manage && (
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                        {n.recipient_label}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {timeAgo(n.sent_at)}
                                            </span>
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                            {n.message}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground/60">
                                            By {n.created_by}
                                        </p>
                                    </button>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.post(
                                                    `/notifications/${n.id}/toggle-read`,
                                                    {},
                                                    opts,
                                                )
                                            }
                                            title={
                                                n.is_read
                                                    ? 'Mark unread'
                                                    : 'Mark read'
                                            }
                                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        >
                                            <Icon
                                                name={
                                                    n.is_read
                                                        ? 'EyeSlashIcon'
                                                        : 'EyeIcon'
                                                }
                                                size={15}
                                            />
                                        </button>
                                        {can.manage && n.editable && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditing(n)
                                                    }
                                                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    aria-label="Edit notification"
                                                >
                                                    <Icon
                                                        name="PencilSquareIcon"
                                                        size={15}
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleting(n)
                                                    }
                                                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                                                    aria-label="Delete notification"
                                                >
                                                    <Icon
                                                        name="TrashIcon"
                                                        size={15}
                                                    />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {editing && (
                <NotificationModal
                    item={editing === 'new' ? null : editing}
                    types={types}
                    recipients={recipients}
                    onClose={() => setEditing(null)}
                />
            )}

            <ConfirmModal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Delete Notification?"
                message="This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                loading={busy}
            />
        </div>
    );
}

function NotificationModal({
    item,
    types,
    recipients,
    onClose,
}: {
    item: Item | null;
    types: string[];
    recipients: Props['recipients'];
    onClose: () => void;
}) {
    const form = useForm({
        title: item?.title ?? '',
        message: item?.message ?? '',
        notification_type: item?.type ?? 'info',
        recipient: item?.recipient ?? 'all',
        link_url: item?.link_url ?? '',
    });

    const save = () => {
        const o = { ...opts, onSuccess: onClose };
        if (item) form.patch(`/notifications/${item.id}`, o);
        else form.post('/notifications', o);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 fade-in"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="scale-in w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="text-lg font-semibold text-foreground">
                        {item ? 'Edit Notification' : 'New Notification'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 transition-colors hover:bg-muted"
                        aria-label="Close"
                    >
                        <Icon
                            name="XMarkIcon"
                            size={18}
                            className="text-muted-foreground"
                        />
                    </button>
                </div>
                <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                    <div>
                        <label className="label-text">Title *</label>
                        <input
                            className="input-field"
                            value={form.data.title}
                            onChange={(e) =>
                                form.setData('title', e.target.value)
                            }
                            placeholder="Notification title"
                        />
                        {form.errors.title && (
                            <p className="error-text">{form.errors.title}</p>
                        )}
                    </div>
                    <div>
                        <label className="label-text">Message *</label>
                        <textarea
                            rows={4}
                            className="input-field resize-none"
                            value={form.data.message}
                            onChange={(e) =>
                                form.setData('message', e.target.value)
                            }
                            placeholder="Notification message..."
                        />
                        {form.errors.message && (
                            <p className="error-text">{form.errors.message}</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-text">Type</label>
                            <select
                                className="input-field"
                                value={form.data.notification_type}
                                onChange={(e) =>
                                    form.setData(
                                        'notification_type',
                                        e.target.value,
                                    )
                                }
                            >
                                {types.map((t) => (
                                    <option key={t} value={t}>
                                        {TYPE_CONFIG[t]?.label ?? t}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-text">Recipients</label>
                            <select
                                className="input-field"
                                value={form.data.recipient}
                                onChange={(e) =>
                                    form.setData('recipient', e.target.value)
                                }
                            >
                                {recipients.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="label-text">Link (optional)</label>
                        <input
                            className="input-field"
                            value={form.data.link_url}
                            onChange={(e) =>
                                form.setData('link_url', e.target.value)
                            }
                            placeholder="/member-portal or https://..."
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={
                            form.processing ||
                            !form.data.title ||
                            !form.data.message
                        }
                        className="btn-primary text-sm"
                    >
                        {form.processing
                            ? 'Saving...'
                            : item
                              ? 'Update'
                              : 'Send Notification'}
                    </button>
                </div>
            </div>
        </div>
    );
}
