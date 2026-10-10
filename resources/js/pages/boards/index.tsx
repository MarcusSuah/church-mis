import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Briefcase,
    CalendarClock,
    CalendarDays,
    Check,
    Loader2,
    Mail,
    MapPin,
    Pencil,
    Plus,
    Search,
    Star,
    Trash2,
    User,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import { formatShortDate } from '@/lib/format';
import {
    chair as chairRoute,
    destroy,
    index,
    store,
    update,
} from '@/routes/boards';
import {
    destroy as removeMemberRoute,
    store as addMemberRoute,
    update as updateMemberRoute,
} from '@/routes/boards/members';
import { useMemberOptionsSearch } from '@/hooks/use-member-options-search';

type Board = {
    id: string;
    name: string;
    description: string | null;
    mandate: string | null;
    board_type: string;
    chairperson_id: string | null;
    chairperson_name: string | null;
    chairperson_photo: string | null;
    chairperson_initials: string | null;
    member_count: number;
    meeting_schedule: string | null;
    location: string | null;
    contact_email: string | null;
    banner_url: string | null;
    is_active: boolean;
};

type BoardPerson = {
    id: string;
    member_id: string;
    role: string;
    term_start: string | null;
    term_end: string | null;
    name: string;
    initials: string;
    email: string | null;
    photo_url: string | null;
};

type MemberOption = {
    id: string;
    name: string;
    initials: string;
    email: string | null;
    photo_url: string | null;
};

type Props = {
    boards: Board[];
    selected: (Board & { members: BoardPerson[] }) | null;
    memberOptions?: MemberOption[];
    types: string[];
    roles: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const TYPE_COLORS: Record<string, string> = {
    Trustees: 'bg-blue-100 text-blue-700',
    Deacons: 'bg-purple-100 text-purple-700',
    Deaconesses: 'bg-pink-100 text-pink-700',
    Elders: 'bg-amber-100 text-amber-700',
    Advisory: 'bg-teal-100 text-teal-700',
    Other: 'bg-gray-100 text-gray-600',
};

const go = (params: Record<string, string> = {}) =>
    router.get(index.url(), params);

function Avatar({
    photo,
    initials,
    size,
    icon = 14,
}: {
    photo: string | null;
    initials: string | null;
    size: string;
    icon?: number;
}) {
    return photo ? (
        <img
            src={photo}
            alt=""
            className={`${size} shrink-0 rounded-full object-cover`}
        />
    ) : (
        <div
            className={`${size} flex shrink-0 items-center justify-center rounded-full bg-primary/10`}
        >
            {initials ? (
                <span className="text-xs font-bold text-primary">
                    {initials}
                </span>
            ) : (
                <User size={icon} className="text-primary" />
            )}
        </div>
    );
}

function TypePill({ type }: { type: string }) {
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[type] ?? TYPE_COLORS.Other}`}
        >
            {type}
        </span>
    );
}

function Banner({ b, iconSize }: { b: Board; iconSize: number }) {
    return (
        <div className="relative h-40 bg-muted">
            {b.banner_url ? (
                <img
                    src={b.banner_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <Briefcase size={iconSize} className="text-primary/40" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
    );
}

function Modal({
    title,
    onClose,
    children,
    footer,
    size = 'max-w-lg',
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    size?: string;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`scale-in flex max-h-[90vh] w-full flex-col rounded-2xl bg-card shadow-xl ${size}`}
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
                {children}
                {footer && (
                    <div className="flex gap-3 border-t border-border p-5">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

const termText = (p: BoardPerson) =>
    p.term_start || p.term_end
        ? `Term: ${p.term_start ? formatShortDate(p.term_start) : '—'} – ${p.term_end ? formatShortDate(p.term_end) : 'Present'}`
        : null;

export default function Boards({
    boards,
    selected,
    memberOptions,
    types,
    roles,
    can,
}: Props) {
    const [search, setSearch] = useState('');
    const [type, setType] = useState('All');
    const [editing, setEditing] = useState<Board | 'new' | null>(null);
    const [picking, setPicking] = useState(false);
    const [deleting, setDeleting] = useState<Board | null>(null);
    const [busy, setBusy] = useState(false);

    const filtered = useMemo(() => {
        let r = boards;
        if (type !== 'All') r = r.filter((b) => b.board_type === type);
        if (search) {
            const q = search.toLowerCase();
            r = r.filter(
                (b) =>
                    b.name.toLowerCase().includes(q) ||
                    b.description?.toLowerCase().includes(q) ||
                    b.chairperson_name?.toLowerCase().includes(q),
            );
        }
        return r;
    }, [boards, type, search]);

    const openPicker = () => {
        setPicking(true);
        router.reload({ only: ['memberOptions'] });
    };

    const confirmDelete = () => {
        if (!deleting) return;
        setBusy(true);
        router.delete(destroy.url(deleting.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (selected?.id === deleting.id) go();
                setDeleting(null);
            },
            onFinish: () => setBusy(false),
        });
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-6">
            <Head
                title={
                    selected
                        ? `${selected.name} — Boards & Trustees`
                        : 'Boards & Trustees'
                }
            />

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {selected && (
                        <button
                            type="button"
                            onClick={() => go()}
                            className="rounded-lg p-2 transition-colors hover:bg-muted"
                            aria-label="Back to all boards"
                        >
                            <ArrowLeft
                                size={18}
                                className="text-muted-foreground"
                            />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {selected ? selected.name : 'Boards & Trustees'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {selected
                                ? 'Board details & members'
                                : `${boards.length} ${boards.length === 1 ? 'board' : 'boards'}`}
                        </p>
                    </div>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Plus size={16} /> New Board
                    </button>
                )}
            </div>

            {!selected ? (
                <>
                    {/* Filters */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Search
                                size={16}
                                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                            />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search boards..."
                                className="w-full rounded-lg border border-border bg-background py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['All', ...types].map((t) => (
                                <button
                                    type="button"
                                    key={t}
                                    onClick={() => setType(t)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${type === t ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid */}
                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground">
                            <Briefcase
                                size={40}
                                className="mx-auto mb-3 opacity-30"
                            />
                            <p className="font-medium">No boards found</p>
                            {can.create && boards.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() => setEditing('new')}
                                    className="btn-primary mt-4 text-sm"
                                >
                                    <Plus size={16} /> New Board
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            {filtered.map((b) => (
                                <div
                                    key={b.id}
                                    className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                                >
                                    <button
                                        type="button"
                                        className="relative block w-full text-left"
                                        onClick={() => go({ board: b.id })}
                                    >
                                        <Banner b={b} iconSize={36} />
                                        <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between">
                                            <TypePill type={b.board_type} />
                                            <span
                                                className={`rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium ${b.is_active ? 'text-success' : 'text-muted-foreground'}`}
                                            >
                                                {b.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </div>
                                    </button>
                                    <div className="p-4">
                                        <h3
                                            className="cursor-pointer font-semibold text-foreground transition-colors hover:text-primary"
                                            onClick={() => go({ board: b.id })}
                                        >
                                            {b.name}
                                        </h3>
                                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                            {b.description}
                                        </p>
                                        <div className="mt-3 flex items-center gap-3">
                                            <Avatar
                                                photo={b.chairperson_photo}
                                                initials={
                                                    b.chairperson_initials
                                                }
                                                size="h-7 w-7"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-foreground">
                                                    {b.chairperson_name ||
                                                        'No chairperson assigned'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {b.member_count}{' '}
                                                    {b.member_count === 1
                                                        ? 'member'
                                                        : 'members'}
                                                </p>
                                            </div>
                                        </div>
                                        {b.meeting_schedule && (
                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <CalendarDays size={12} />
                                                <span className="truncate">
                                                    {b.meeting_schedule}
                                                </span>
                                            </div>
                                        )}
                                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    go({ board: b.id })
                                                }
                                                className="text-xs font-medium text-primary hover:underline"
                                            >
                                                View Details
                                            </button>
                                            <div className="flex gap-1">
                                                {can.update && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditing(b)
                                                        }
                                                        className="rounded p-1.5 transition-colors hover:bg-muted"
                                                        aria-label={`Edit ${b.name}`}
                                                    >
                                                        <Pencil
                                                            size={14}
                                                            className="text-muted-foreground"
                                                        />
                                                    </button>
                                                )}
                                                {can.delete && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleting(b)
                                                        }
                                                        className="rounded p-1.5 transition-colors hover:bg-danger/10"
                                                        aria-label={`Delete ${b.name}`}
                                                    >
                                                        <Trash2
                                                            size={14}
                                                            className="text-danger"
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <BoardDetail
                    b={selected}
                    roles={roles}
                    can={can}
                    onEdit={() => setEditing(selected)}
                    onDelete={() => setDeleting(selected)}
                    onAddMember={openPicker}
                />
            )}

            {editing && (
                <BoardModal
                    board={editing === 'new' ? null : editing}
                    types={types}
                    onClose={() => setEditing(null)}
                />
            )}
            {picking && selected && (
                <AddMemberModal
                    board={selected}
                    options={memberOptions}
                    onClose={() => setPicking(false)}
                />
            )}

            <ConfirmModal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Delete Board"
                message={
                    deleting
                        ? `Delete ${deleting.name}? Its member list and terms of office will be removed.`
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

function BoardDetail({
    b,
    roles,
    can,
    onEdit,
    onDelete,
    onAddMember,
}: {
    b: NonNullable<Props['selected']>;
    roles: string[];
    can: Props['can'];
    onEdit: () => void;
    onDelete: () => void;
    onAddMember: () => void;
}) {
    const [termFor, setTermFor] = useState<BoardPerson | null>(null);
    const opts = { preserveScroll: true, preserveState: true };
    const setRole = (p: BoardPerson, role: string) =>
        router.patch(updateMemberRoute.url([b.id, p.id]), { role }, opts);
    const makeChair = (p: BoardPerson) =>
        router.post(chairRoute.url(b.id), { member_id: p.member_id }, opts);
    const remove = (p: BoardPerson) =>
        router.delete(removeMemberRoute.url([b.id, p.id]), opts);

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: info */}
            <div className="space-y-4 lg:col-span-1">
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="relative">
                        <Banner b={b} iconSize={40} />
                        <div className="absolute bottom-3 left-3 flex gap-2">
                            <TypePill type={b.board_type} />
                            {!b.is_active && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    Inactive
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="space-y-3 p-4">
                        <div>
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                Description
                            </p>
                            <p className="mt-1 text-sm text-foreground">
                                {b.description || '—'}
                            </p>
                        </div>
                        {b.mandate && (
                            <div>
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Mandate
                                </p>
                                <p className="mt-1 text-sm text-foreground italic">
                                    "{b.mandate}"
                                </p>
                            </div>
                        )}
                        {[
                            {
                                Icon: CalendarDays,
                                label: 'Schedule',
                                value: b.meeting_schedule,
                            },
                            {
                                Icon: MapPin,
                                label: 'Location',
                                value: b.location,
                            },
                            {
                                Icon: Mail,
                                label: 'Email',
                                value: b.contact_email,
                            },
                        ]
                            .filter((r) => r.value)
                            .map((r) => (
                                <div
                                    key={r.label}
                                    className="flex items-start gap-2"
                                >
                                    <r.Icon
                                        size={14}
                                        className="mt-0.5 shrink-0 text-muted-foreground"
                                    />
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {r.label}
                                        </p>
                                        <p className="text-sm break-all text-foreground">
                                            {r.value}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        {(can.update || can.delete) && (
                            <div className="flex gap-2 pt-2">
                                {can.update && (
                                    <button
                                        type="button"
                                        onClick={onEdit}
                                        className="btn-outline flex-1 justify-center text-sm"
                                    >
                                        <Pencil size={14} /> Edit
                                    </button>
                                )}
                                {can.delete && (
                                    <button
                                        type="button"
                                        onClick={onDelete}
                                        className="btn-outline border-danger/30 text-sm text-danger hover:bg-danger/5"
                                        aria-label="Delete board"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Chairperson
                    </p>
                    {b.chairperson_name ? (
                        <div className="flex items-center gap-3">
                            <Avatar
                                photo={b.chairperson_photo}
                                initials={b.chairperson_initials}
                                size="h-11 w-11"
                                icon={20}
                            />
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    {b.chairperson_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Chairperson
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No chairperson assigned
                            {can.update ? ' — use the ★ next to a member.' : ''}
                        </p>
                    )}
                </div>
            </div>

            {/* Right: members */}
            <div className="rounded-xl border border-border bg-card lg:col-span-2">
                <div className="flex items-center justify-between border-b border-border p-4">
                    <div>
                        <h3 className="font-semibold text-foreground">
                            Board Members
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {b.members.length}{' '}
                            {b.members.length === 1 ? 'member' : 'members'}
                        </p>
                    </div>
                    {can.update && (
                        <button
                            type="button"
                            onClick={onAddMember}
                            className="btn-primary px-3 py-1.5 text-sm"
                        >
                            <UserPlus size={14} /> Add Member
                        </button>
                    )}
                </div>
                <div className="max-h-[520px] scrollbar-thin divide-y divide-border overflow-y-auto">
                    {b.members.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <Users
                                size={32}
                                className="mx-auto mb-2 opacity-30"
                            />
                            <p className="text-sm">No members assigned yet</p>
                        </div>
                    ) : (
                        b.members.map((p) => (
                            <div
                                key={p.id}
                                className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/30"
                            >
                                <Avatar
                                    photo={p.photo_url}
                                    initials={p.initials}
                                    size="h-10 w-10"
                                    icon={18}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                        {p.name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {p.email || '—'}
                                    </p>
                                    {termText(p) && (
                                        <p className="text-xs text-muted-foreground">
                                            {termText(p)}
                                        </p>
                                    )}
                                </div>
                                {can.update ? (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={p.role}
                                            onChange={(e) =>
                                                setRole(p, e.target.value)
                                            }
                                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-primary/30 focus:outline-none"
                                        >
                                            {roles.map((r) => (
                                                <option key={r}>{r}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setTermFor(p)}
                                            title="Set term of office"
                                            className="rounded p-1.5 transition-colors hover:bg-muted"
                                        >
                                            <CalendarClock
                                                size={14}
                                                className="text-muted-foreground"
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                b.chairperson_id !==
                                                    p.member_id && makeChair(p)
                                            }
                                            title={
                                                b.chairperson_id === p.member_id
                                                    ? 'Chairperson'
                                                    : 'Set as chairperson'
                                            }
                                            className="rounded p-1.5 transition-colors hover:bg-accent/10"
                                        >
                                            <Star
                                                size={14}
                                                className={
                                                    b.chairperson_id ===
                                                    p.member_id
                                                        ? 'fill-accent text-accent'
                                                        : 'text-muted-foreground'
                                                }
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => remove(p)}
                                            title="Remove from board"
                                            className="rounded p-1.5 transition-colors hover:bg-danger/10"
                                        >
                                            <X
                                                size={14}
                                                className="text-danger"
                                            />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                        {p.role}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {termFor && (
                <TermModal
                    boardId={b.id}
                    person={termFor}
                    onClose={() => setTermFor(null)}
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */

function TermModal({
    boardId,
    person,
    onClose,
}: {
    boardId: string;
    person: BoardPerson;
    onClose: () => void;
}) {
    const form = useForm({
        term_start: person.term_start ?? '',
        term_end: person.term_end ?? '',
    });
    const save = () => {
        form.transform((d) => ({
            term_start: d.term_start || null,
            term_end: d.term_end || null,
        }));
        form.patch(updateMemberRoute.url([boardId, person.id]), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: onClose,
        });
    };

    return (
        <Modal
            title={`Term of Office — ${person.name}`}
            onClose={onClose}
            size="max-w-md"
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
                        disabled={form.processing}
                        className="btn-primary flex-1 justify-center text-sm"
                    >
                        {form.processing ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Check size={16} />
                        )}
                        Save Term
                    </button>
                </>
            }
        >
            <div className="grid grid-cols-2 gap-3 p-5">
                <div>
                    <label className="label-text">Term Start</label>
                    <input
                        type="date"
                        className="input-field"
                        value={form.data.term_start}
                        onChange={(e) =>
                            form.setData('term_start', e.target.value)
                        }
                    />
                    {form.errors.term_start && (
                        <p className="error-text">{form.errors.term_start}</p>
                    )}
                </div>
                <div>
                    <label className="label-text">Term End</label>
                    <input
                        type="date"
                        className="input-field"
                        value={form.data.term_end}
                        onChange={(e) =>
                            form.setData('term_end', e.target.value)
                        }
                    />
                    {form.errors.term_end && (
                        <p className="error-text">{form.errors.term_end}</p>
                    )}
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                    Leave Term End empty if the term is ongoing.
                </p>
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */

function BoardModal({
    board,
    types,
    onClose,
}: {
    board: Board | null;
    types: string[];
    onClose: () => void;
}) {
    const form = useForm({
        name: board?.name ?? '',
        board_type: board?.board_type ?? 'Trustees',
        description: board?.description ?? '',
        mandate: board?.mandate ?? '',
        meeting_schedule: board?.meeting_schedule ?? '',
        location: board?.location ?? '',
        contact_email: board?.contact_email ?? '',
        banner_url: board?.banner_url ?? '',
        is_active: board?.is_active ?? true,
    });

    const save = () => {
        const opts = { preserveScroll: true, onSuccess: onClose };
        if (board) form.patch(update.url(board.id), opts);
        else form.post(store.url(), opts);
    };

    const label =
        'text-xs font-medium tracking-wide text-muted-foreground uppercase';
    const input = (
        key: 'meeting_schedule' | 'location' | 'contact_email',
        text: string,
        placeholder = '',
    ) => (
        <div>
            <label className={label}>{text}</label>
            <input
                value={form.data[key]}
                onChange={(e) => form.setData(key, e.target.value)}
                placeholder={placeholder}
                className="input-field mt-1"
            />
            {form.errors[key] && (
                <p className="error-text">{form.errors[key]}</p>
            )}
        </div>
    );

    return (
        <Modal
            title={board ? 'Edit Board' : 'New Board'}
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
                        disabled={form.processing || !form.data.name.trim()}
                        className="btn-primary flex-1 justify-center text-sm"
                    >
                        {form.processing ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Check size={16} />
                        )}
                        {board ? 'Save Changes' : 'Create Board'}
                    </button>
                </>
            }
        >
            <div className="scrollbar-thin space-y-4 overflow-y-auto p-5">
                <div>
                    <label className={label}>Board Name *</label>
                    <input
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="e.g. Board of Trustees"
                        className="input-field mt-1"
                    />
                    {form.errors.name && (
                        <p className="error-text">{form.errors.name}</p>
                    )}
                </div>
                <div>
                    <label className={label}>Board Type</label>
                    <select
                        value={form.data.board_type}
                        onChange={(e) =>
                            form.setData('board_type', e.target.value)
                        }
                        className="input-field mt-1"
                    >
                        {types.map((t) => (
                            <option key={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={label}>Description</label>
                    <textarea
                        value={form.data.description}
                        onChange={(e) =>
                            form.setData('description', e.target.value)
                        }
                        rows={3}
                        className="input-field mt-1 resize-none"
                    />
                </div>
                <div>
                    <label className={label}>Mandate</label>
                    <textarea
                        value={form.data.mandate}
                        onChange={(e) =>
                            form.setData('mandate', e.target.value)
                        }
                        rows={2}
                        className="input-field mt-1 resize-none"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {input(
                        'meeting_schedule',
                        'Meeting Schedule',
                        'e.g. First Tuesday 7:00 PM',
                    )}
                    {input('location', 'Location', 'e.g. Board Room')}
                </div>
                {input('contact_email', 'Contact Email')}
                <ImageUploadField
                    label="Banner Image"
                    value={form.data.banner_url}
                    onChange={(url) => form.setData('banner_url', url)}
                    variant="banner"
                />
                <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                        type="checkbox"
                        checked={form.data.is_active}
                        onChange={(e) =>
                            form.setData('is_active', e.target.checked)
                        }
                        className="rounded"
                    />
                    Active Board
                </label>
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */

function AddMemberModal({
    board,
    options,
    onClose,
}: {
    board: NonNullable<Props['selected']>;
    options?: MemberOption[];
    onClose: () => void;
}) {
    const [q, setQ] = useState('');
    useMemberOptionsSearch(q);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [termStart, setTermStart] = useState('');
    const [termEnd, setTermEnd] = useState('');

    const list = useMemo(() => {
        if (!options) return [];
        const assigned = new Set(board.members.map((p) => p.member_id));
        const s = q.toLowerCase();
        return options.filter(
            (o) =>
                !assigned.has(o.id) &&
                (!s ||
                    o.name.toLowerCase().includes(s) ||
                    o.email?.toLowerCase().includes(s)),
        );
    }, [options, board.members, q]);

    const add = (o: MemberOption) =>
        router.post(
            addMemberRoute.url(board.id),
            {
                member_id: o.id,
                term_start: termStart || null,
                term_end: termEnd || null,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setBusyId(o.id),
                onFinish: () => setBusyId(null),
                onSuccess: onClose,
            },
        );

    return (
        <Modal title="Add Board Member" onClose={onClose} size="max-w-md">
            <div className="space-y-3 border-b border-border p-4">
                <div className="relative">
                    <Search
                        size={14}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        autoFocus
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search members..."
                        className="input-field pl-8 text-sm"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[11px] text-muted-foreground">
                            Term start (optional)
                        </label>
                        <input
                            type="date"
                            className="input-field py-1.5 text-xs"
                            value={termStart}
                            onChange={(e) => setTermStart(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[11px] text-muted-foreground">
                            Term end (optional)
                        </label>
                        <input
                            type="date"
                            className="input-field py-1.5 text-xs"
                            value={termEnd}
                            onChange={(e) => setTermEnd(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div className="max-h-[45vh] flex-1 scrollbar-thin divide-y divide-border overflow-y-auto">
                {!options ? (
                    <div className="flex justify-center py-8">
                        <Loader2
                            size={20}
                            className="animate-spin text-muted-foreground"
                        />
                    </div>
                ) : list.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        No available members
                    </div>
                ) : (
                    list.map((o) => (
                        <button
                            type="button"
                            key={o.id}
                            disabled={busyId !== null}
                            onClick={() => add(o)}
                            className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted"
                        >
                            <Avatar
                                photo={o.photo_url}
                                initials={o.initials}
                                size="h-9 w-9"
                                icon={16}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">
                                    {o.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {o.email || '—'}
                                </p>
                            </div>
                            {busyId === o.id ? (
                                <Loader2
                                    size={14}
                                    className="animate-spin text-primary"
                                />
                            ) : (
                                <Plus
                                    size={14}
                                    className="shrink-0 text-primary"
                                />
                            )}
                        </button>
                    ))
                )}
            </div>
        </Modal>
    );
}

Boards.layout = {
    breadcrumbs: [{ title: 'Boards & Trustees', href: index() }],
};
