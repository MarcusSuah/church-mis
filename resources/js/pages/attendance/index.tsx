import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    BarChart3,
    BookOpen,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock,
    HandHeart,
    Loader2,
    MinusCircle,
    Pencil,
    Plus,
    Search,
    Sun,
    Trash2,
    X,
    XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import { index } from '@/routes/attendance';
import {
    destroy,
    mark,
    markRemaining,
    store,
    update,
} from '@/routes/attendance/sessions';

type Status = 'present' | 'absent' | 'late' | 'excused';

type Session = {
    id: string;
    service_type: string;
    type_label: string;
    service_date: string;
    title: string | null;
    sermon_topic: string | null;
    preacher: string | null;
    notes: string | null;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number;
};

type RosterRow = {
    member_id: string;
    code: string | null;
    name: string;
    initials: string;
    department: string | null;
    photo_url: string | null;
    status: Status | null;
};

type Props = {
    type: string;
    types: { key: string; label: string }[];
    stats: {
        sessions: number;
        avg_present: number;
        avg_absent: number;
        avg_late: number;
        rate: number;
    };
    sessions: Session[];
    selected: (Session & { roster: RosterRow[]; notes: string | null }) | null;
    can: { create: boolean; update: boolean; delete: boolean };
};

const TYPE_ICONS: Record<string, typeof Sun> = {
    sunday_worship: Sun,
    bible_study: BookOpen,
    prayer_meeting: HandHeart,
    revival: Sun,
};

const STATUS_BUTTONS: {
    status: Status;
    label: string;
    Icon: typeof CheckCircle2;
    active: string;
}[] = [
    {
        status: 'present',
        label: 'Present',
        Icon: CheckCircle2,
        active: 'border-success text-success bg-success/5',
    },
    {
        status: 'absent',
        label: 'Absent',
        Icon: XCircle,
        active: 'border-danger text-danger bg-danger/5',
    },
    {
        status: 'late',
        label: 'Late',
        Icon: Clock,
        active: 'border-warning text-warning bg-warning/5',
    },
    {
        status: 'excused',
        label: 'Excused',
        Icon: MinusCircle,
        active: 'border-info text-info bg-info/5',
    },
];

const asDate = (d: string) => new Date(`${d}T00:00:00Z`);
const longDate = (d: string) =>
    asDate(d).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
const monthShort = (d: string) =>
    asDate(d)
        .toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
        .toUpperCase();
const dayNum = (d: string) => asDate(d).getUTCDate();

const visit = (params: Record<string, string>) =>
    router.get(index.url(), params, { preserveScroll: false });

function Modal({
    title,
    onClose,
    children,
    footer,
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer: ReactNode;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="scale-in flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-card shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border p-5">
                    <h2 className="font-semibold text-foreground">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-ghost p-1.5"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="scrollbar-thin overflow-y-auto p-5">
                    {children}
                </div>
                <div className="flex gap-3 border-t border-border p-5">
                    {footer}
                </div>
            </div>
        </div>
    );
}

export default function Attendance({
    type,
    types,
    stats,
    sessions,
    selected,
    can,
}: Props) {
    const [editing, setEditing] = useState<Session | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Session | null>(null);
    const [busy, setBusy] = useState(false);

    const TypeIcon = TYPE_ICONS[type] ?? CalendarDays;
    const typeLabel = types.find((t) => t.key === type)?.label ?? 'Sessions';

    const statCards = [
        {
            label: 'Sessions',
            value: String(stats.sessions),
            Icon: CalendarDays,
            color: 'text-foreground',
        },
        {
            label: 'Avg Present',
            value: String(stats.avg_present),
            Icon: CheckCircle2,
            color: 'text-success',
        },
        {
            label: 'Avg Absent',
            value: String(stats.avg_absent),
            Icon: XCircle,
            color: 'text-danger',
        },
        {
            label: 'Avg Late',
            value: String(stats.avg_late),
            Icon: Clock,
            color: 'text-warning',
        },
        {
            label: 'Attendance Rate',
            value: `${stats.rate}%`,
            Icon: BarChart3,
            color: 'text-accent',
        },
    ];

    const confirmDelete = () => {
        if (!deleting) return;
        setBusy(true);
        router.delete(destroy.url(deleting.id), {
            preserveScroll: true,
            onSuccess: () => {
                setDeleting(null);
                if (selected?.id === deleting.id) visit({ type });
            },
            onFinish: () => setBusy(false),
        });
    };

    return (
        <div className="flex flex-1 flex-col p-4 md:p-6">
            <Head
                title={
                    selected
                        ? `${typeLabel} — ${longDate(selected.service_date)}`
                        : 'Attendance'
                }
            />

            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Attendance</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Track attendance for all church services and meetings
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selected && (
                        <button
                            type="button"
                            onClick={() => visit({ type })}
                            className="btn-outline text-sm"
                        >
                            <ArrowLeft className="size-4" />
                            Back to Sessions
                        </button>
                    )}
                    {can.create && (
                        <button
                            type="button"
                            onClick={() => setEditing('new')}
                            className="btn-accent text-sm"
                        >
                            <Plus className="size-4" />
                            New Session
                        </button>
                    )}
                </div>
            </div>

            {/* Service type tabs */}
            <div className="mb-6 flex flex-wrap gap-2">
                {types.map((t) => {
                    const Icon = TYPE_ICONS[t.key] ?? CalendarDays;
                    const active = t.key === type;
                    return (
                        <button
                            type="button"
                            key={t.key}
                            onClick={() => visit({ type: t.key })}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                                active
                                    ? 'border-b-2 border-accent bg-accent/5 text-accent'
                                    : 'border-border bg-card text-foreground hover:bg-muted'
                            }`}
                        >
                            <Icon className="size-4" />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
                {statCards.map((s) => (
                    <div
                        key={s.label}
                        className="card flex items-center gap-4 p-5"
                    >
                        <s.Icon className={`size-5 shrink-0 ${s.color}`} />
                        <div>
                            <p className="text-xl font-bold text-foreground tabular-nums">
                                {s.value}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {s.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {selected ? (
                <SessionDetail
                    session={selected}
                    typeLabel={typeLabel}
                    TypeIcon={TypeIcon}
                    can={can}
                    onEdit={() => setEditing(selected)}
                    onDelete={() => setDeleting(selected)}
                />
            ) : (
                <div className="card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border px-6 py-5">
                        <h2 className="flex items-center gap-3 text-lg font-semibold text-foreground">
                            <TypeIcon className="size-4 text-accent" />
                            {typeLabel} Sessions
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {sessions.length}{' '}
                            {sessions.length === 1 ? 'session' : 'sessions'}
                        </span>
                    </div>
                    {sessions.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-16 text-center">
                            <CalendarDays className="size-8 text-muted-foreground" />
                            <p className="font-semibold text-foreground">
                                No {typeLabel.toLowerCase()} sessions yet
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Create a session to start taking attendance.
                            </p>
                            {can.create && (
                                <button
                                    type="button"
                                    onClick={() => setEditing('new')}
                                    className="btn-accent mt-2 text-sm"
                                >
                                    <Plus className="size-4" /> New Session
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {sessions.map((s) => (
                                <button
                                    type="button"
                                    key={s.id}
                                    onClick={() =>
                                        visit({ type, session: s.id })
                                    }
                                    className="flex w-full items-center gap-5 px-6 py-4 text-left transition-colors hover:bg-muted/30"
                                >
                                    <div className="w-10 shrink-0 text-center">
                                        <p className="text-xs font-semibold text-accent">
                                            {monthShort(s.service_date)}
                                        </p>
                                        <p className="text-lg leading-none font-bold text-accent">
                                            {dayNum(s.service_date)}
                                        </p>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-foreground">
                                            {longDate(s.service_date)}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {s.title ? (
                                                <>{s.title}</>
                                            ) : (
                                                'No title'
                                            )}
                                            {s.sermon_topic && (
                                                <> · {s.sermon_topic}</>
                                            )}
                                            {s.preacher && <> · {s.preacher}</>}
                                        </p>
                                    </div>
                                    <div className="hidden items-center gap-3 text-xs font-semibold sm:flex">
                                        <span className="flex items-center gap-1 text-success">
                                            <CheckCircle2 className="size-3.5" />
                                            {s.present}
                                        </span>
                                        <span className="flex items-center gap-1 text-danger">
                                            <XCircle className="size-3.5" />
                                            {s.absent}
                                        </span>
                                        <span className="flex items-center gap-1 text-warning">
                                            <Clock className="size-3.5" />
                                            {s.late}
                                        </span>
                                    </div>
                                    <div className="w-20 text-right">
                                        <p className="font-bold text-foreground tabular-nums">
                                            {s.rate}%
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            attendance
                                        </p>
                                    </div>
                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {editing && (
                <SessionModal
                    session={editing === 'new' ? null : editing}
                    type={type}
                    types={types}
                    onClose={() => setEditing(null)}
                />
            )}

            <ConfirmModal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Delete Session"
                message={
                    deleting
                        ? `Delete the ${deleting.type_label} session on ${longDate(deleting.service_date)}? All attendance marked for it will be removed.`
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

function SessionDetail({
    session,
    typeLabel,
    TypeIcon,
    can,
    onEdit,
    onDelete,
}: {
    session: NonNullable<Props['selected']>;
    typeLabel: string;
    TypeIcon: typeof Sun;
    can: Props['can'];
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | Status | 'unmarked'>('all');
    const [pending, setPending] = useState<Record<string, Status | null>>({});
    const [bulkBusy, setBulkBusy] = useState(false);

    const statusOf = (r: RosterRow) =>
        r.member_id in pending ? pending[r.member_id] : r.status;

    const counts = useMemo(() => {
        const c = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
        session.roster.forEach((r) => {
            const s = r.member_id in pending ? pending[r.member_id] : r.status;
            c[s ?? 'unmarked']++;
        });
        return c;
    }, [session.roster, pending]);

    const rows = useMemo(() => {
        const q = search.toLowerCase();
        return session.roster.filter((r) => {
            const s = r.member_id in pending ? pending[r.member_id] : r.status;
            if (
                filter === 'unmarked'
                    ? s !== null
                    : filter !== 'all' && s !== filter
            )
                return false;
            return (
                !q ||
                r.name.toLowerCase().includes(q) ||
                r.department?.toLowerCase().includes(q) ||
                r.code?.toLowerCase().includes(q)
            );
        });
    }, [session.roster, pending, search, filter]);

    const setMark = (r: RosterRow, status: Status) => {
        const current = statusOf(r);
        setPending((p) => ({
            ...p,
            [r.member_id]: current === status ? null : status,
        }));
        router.post(
            mark.url(session.id),
            { member_id: r.member_id, status },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['selected', 'sessions', 'stats'],
                onError: () => toast.error(`Could not update ${r.name}.`),
                onFinish: () =>
                    setPending((p) => {
                        const { [r.member_id]: _, ...rest } = p;
                        return rest;
                    }),
            },
        );
    };

    const markRest = (status: Status) => {
        setBulkBusy(true);
        router.post(
            markRemaining.url(session.id),
            { status },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setBulkBusy(false),
            },
        );
    };

    const filters: { key: typeof filter; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'present', label: 'Present' },
        { key: 'absent', label: 'Absent' },
        { key: 'late', label: 'Late' },
        { key: 'excused', label: 'Excused' },
        { key: 'unmarked', label: `Not marked (${counts.unmarked})` },
    ];

    return (
        <div className="space-y-5">
            {/* Session header */}
            <div className="card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-accent uppercase">
                        <TypeIcon className="size-3.5" />
                        {typeLabel}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-foreground">
                        {longDate(session.service_date)}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                            Title:
                        </span>{' '}
                        {session.title || '—'}
                        {session.sermon_topic && (
                            <>
                                {' · '}
                                <span className="font-medium text-foreground">
                                    Topic:
                                </span>{' '}
                                {session.sermon_topic}
                            </>
                        )}
                        {session.preacher && (
                            <>
                                {' · '}
                                <span className="font-medium text-foreground">
                                    Preacher:
                                </span>{' '}
                                {session.preacher}
                            </>
                        )}
                    </p>
                    {(can.update || can.delete) && (
                        <div className="mt-3 flex gap-2">
                            {can.update && (
                                <button
                                    type="button"
                                    onClick={onEdit}
                                    className="btn-outline px-3 py-1.5 text-xs"
                                >
                                    <Pencil className="size-3" /> Edit Session
                                </button>
                            )}
                            {can.delete && (
                                <button
                                    type="button"
                                    onClick={onDelete}
                                    className="btn-ghost px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                                >
                                    <Trash2 className="size-3" /> Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 gap-8 text-center">
                    {[
                        {
                            n: counts.present,
                            label: 'Present',
                            c: 'text-success',
                        },
                        { n: counts.absent, label: 'Absent', c: 'text-danger' },
                        { n: counts.late, label: 'Late', c: 'text-warning' },
                        { n: counts.excused, label: 'Excused', c: 'text-info' },
                    ].map((x) => (
                        <div key={x.label}>
                            <p
                                className={`text-xl font-bold tabular-nums ${x.c}`}
                            >
                                {x.n}
                            </p>
                            <p className={`text-xs ${x.c}`}>{x.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Search + filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search members..."
                        className="input-field pl-9"
                    />
                </div>
                <div className="flex scrollbar-thin gap-2 overflow-x-auto">
                    {filters.map((f) => (
                        <button
                            type="button"
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                                filter === f.key
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Roster */}
            <div className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                    <h3 className="font-semibold text-foreground">
                        Attendance Records
                    </h3>
                    <div className="flex items-center gap-3">
                        {can.update && counts.unmarked > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">
                                    Mark remaining {counts.unmarked} as
                                </span>
                                <button
                                    type="button"
                                    disabled={bulkBusy}
                                    onClick={() => markRest('present')}
                                    className="rounded-md px-2 py-1 font-medium text-success hover:bg-success/10"
                                >
                                    Present
                                </button>
                                <button
                                    type="button"
                                    disabled={bulkBusy}
                                    onClick={() => markRest('absent')}
                                    className="rounded-md px-2 py-1 font-medium text-danger hover:bg-danger/10"
                                >
                                    Absent
                                </button>
                                {bulkBusy && (
                                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                                )}
                            </div>
                        )}
                        <span className="text-sm text-muted-foreground">
                            {rows.length}{' '}
                            {rows.length === 1 ? 'record' : 'records'}
                        </span>
                    </div>
                </div>
                {rows.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        {session.roster.length === 0
                            ? 'No active members to take attendance for yet.'
                            : 'No members match this filter.'}
                    </p>
                ) : (
                    <div className="divide-y divide-border">
                        {rows.map((r) => {
                            const current = statusOf(r);
                            return (
                                <div
                                    key={r.member_id}
                                    className="flex items-center gap-3 px-5 py-3"
                                >
                                    {r.photo_url ? (
                                        <img
                                            src={r.photo_url}
                                            alt=""
                                            className="size-9 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="gradient-gold flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                                            {r.initials}
                                        </span>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {r.name}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {r.department || 'Unassigned'}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        {STATUS_BUTTONS.map((b) => {
                                            const on = current === b.status;
                                            return (
                                                <button
                                                    type="button"
                                                    key={b.status}
                                                    disabled={!can.update}
                                                    onClick={() =>
                                                        setMark(r, b.status)
                                                    }
                                                    title={
                                                        on
                                                            ? `${b.label} (click to clear)`
                                                            : `Mark ${b.label.toLowerCase()}`
                                                    }
                                                    aria-label={`Mark ${r.name} ${b.label.toLowerCase()}`}
                                                    aria-pressed={on}
                                                    className={`flex size-9 items-center justify-center rounded-lg border-2 transition-colors disabled:cursor-not-allowed ${
                                                        on
                                                            ? b.active
                                                            : 'border-transparent bg-muted text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    <b.Icon className="size-4" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function SessionModal({
    session,
    type,
    types,
    onClose,
}: {
    session: Session | null;
    type: string;
    types: Props['types'];
    onClose: () => void;
}) {
    const form = useForm({
        service_type: session?.service_type ?? type,
        service_date:
            session?.service_date ?? new Date().toISOString().slice(0, 10),
        title: session?.title ?? '',
        sermon_topic: session?.sermon_topic ?? '',
        preacher: session?.preacher ?? '',
        notes: session?.notes ?? '',
    });

    const save = () => {
        if (session) {
            form.patch(update.url(session.id), {
                preserveScroll: true,
                onSuccess: onClose,
            });
        } else {
            form.post(store.url(), {
                onSuccess: (page) => {
                    onClose();
                    const id = (
                        page.flash as Record<string, unknown> | undefined
                    )?.openSession as string | undefined;
                    if (id)
                        visit({ type: form.data.service_type, session: id });
                },
            });
        }
    };

    const field = (
        k: keyof typeof form.data,
        label: string,
        placeholder: string,
    ) => (
        <div>
            <label className="label-text">{label}</label>
            <input
                className="input-field"
                placeholder={placeholder}
                value={form.data[k] as string}
                onChange={(e) => form.setData(k, e.target.value)}
            />
            {form.errors[k] && <p className="error-text">{form.errors[k]}</p>}
        </div>
    );

    return (
        <Modal
            title={session ? 'Edit Session' : 'New Session'}
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline flex-1 justify-center text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={form.processing || !form.data.service_date}
                        className="btn-accent flex-1 justify-center text-sm"
                    >
                        {form.processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Check className="size-4" />
                        )}
                        {session ? 'Save Changes' : 'Create Session'}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="label-text">Service Type</label>
                    <select
                        className="input-field"
                        value={form.data.service_type}
                        onChange={(e) =>
                            form.setData('service_type', e.target.value)
                        }
                    >
                        {types.map((t) => (
                            <option key={t.key} value={t.key}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label-text">
                        Date <span className="text-danger">*</span>
                    </label>
                    <input
                        type="date"
                        className="input-field"
                        value={form.data.service_date}
                        onChange={(e) =>
                            form.setData('service_date', e.target.value)
                        }
                    />
                    {form.errors.service_date && (
                        <p className="error-text">{form.errors.service_date}</p>
                    )}
                </div>
                {field('title', 'Title', 'e.g. Sunday Service')}
                {field(
                    'sermon_topic',
                    'Sermon Topic',
                    'e.g. Living by the Word',
                )}
                {field('preacher', 'Preacher / Leader', 'e.g. Pastor Amponsah')}
                <div>
                    <label className="label-text">Notes</label>
                    <textarea
                        rows={2}
                        className="input-field resize-none"
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                    />
                    {form.errors.notes && (
                        <p className="error-text">{form.errors.notes}</p>
                    )}
                </div>
            </div>
        </Modal>
    );
}

Attendance.layout = {
    breadcrumbs: [{ title: 'Attendance', href: index() }],
};
