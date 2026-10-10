import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    Check,
    ClipboardList,
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
import {
    chair as chairRoute,
    destroy,
    index,
    store,
    update,
} from '@/routes/committees';
import {
    destroy as removeMemberRoute,
    store as addMemberRoute,
    update as updateMemberRoute,
} from '@/routes/committees/members';
import { useMemberOptionsSearch } from '@/hooks/use-member-options-search';

type Committee = {
    id: string;
    name: string;
    description: string | null;
    objectives: string | null;
    committee_type: string;
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

type CommitteePerson = {
    id: number;
    member_id: string;
    role: string;
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
    committees: Committee[];
    selected: (Committee & { members: CommitteePerson[] }) | null;
    memberOptions?: MemberOption[];
    types: string[];
    roles: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const TYPE_COLORS: Record<string, string> = {
    Standing: 'bg-blue-100 text-blue-700',
    'Ad Hoc': 'bg-orange-100 text-orange-700',
    Special: 'bg-purple-100 text-purple-700',
    Advisory: 'bg-teal-100 text-teal-700',
    'Task Force': 'bg-red-100 text-red-700',
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
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}
        >
            {type}
        </span>
    );
}

function Banner({
    c,
    iconSize,
    height = 'h-40',
}: {
    c: Committee;
    iconSize: number;
    height?: string;
}) {
    return (
        <div className={`relative ${height} bg-muted`}>
            {c.banner_url ? (
                <img
                    src={c.banner_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <ClipboardList
                        size={iconSize}
                        className="text-primary/40"
                    />
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

export default function Committees({
    committees,
    selected,
    memberOptions,
    types,
    roles,
    can,
}: Props) {
    const [search, setSearch] = useState('');
    const [type, setType] = useState('All');
    const [editing, setEditing] = useState<Committee | 'new' | null>(null);
    const [picking, setPicking] = useState(false);
    const [deleting, setDeleting] = useState<Committee | null>(null);
    const [busy, setBusy] = useState(false);

    const filtered = useMemo(() => {
        let r = committees;
        if (type !== 'All') r = r.filter((c) => c.committee_type === type);
        if (search) {
            const q = search.toLowerCase();
            r = r.filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    c.description?.toLowerCase().includes(q) ||
                    c.chairperson_name?.toLowerCase().includes(q),
            );
        }
        return r;
    }, [committees, type, search]);

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
                    selected ? `${selected.name} — Committees` : 'Committees'
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
                            aria-label="Back to all committees"
                        >
                            <ArrowLeft
                                size={18}
                                className="text-muted-foreground"
                            />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {selected ? selected.name : 'Committees'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {selected
                                ? 'Committee details & members'
                                : `${committees.length} ${committees.length === 1 ? 'committee' : 'committees'}`}
                        </p>
                    </div>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Plus size={16} /> New Committee
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
                                placeholder="Search committees..."
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
                            <ClipboardList
                                size={40}
                                className="mx-auto mb-3 opacity-30"
                            />
                            <p className="font-medium">No committees found</p>
                            {can.create && committees.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() => setEditing('new')}
                                    className="btn-primary mt-4 text-sm"
                                >
                                    <Plus size={16} /> New Committee
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((c) => (
                                <div
                                    key={c.id}
                                    className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                                >
                                    <button
                                        type="button"
                                        className="relative block w-full text-left"
                                        onClick={() => go({ committee: c.id })}
                                    >
                                        <Banner
                                            c={c}
                                            iconSize={32}
                                            height="h-36"
                                        />
                                        <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between">
                                            <TypePill type={c.committee_type} />
                                            <span
                                                className={`rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium ${c.is_active ? 'text-success' : 'text-muted-foreground'}`}
                                            >
                                                {c.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </div>
                                    </button>
                                    <div className="p-4">
                                        <h3
                                            className="cursor-pointer font-semibold text-foreground transition-colors hover:text-primary"
                                            onClick={() =>
                                                go({ committee: c.id })
                                            }
                                        >
                                            {c.name}
                                        </h3>
                                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                            {c.description}
                                        </p>
                                        <div className="mt-3 flex items-center gap-3">
                                            <Avatar
                                                photo={c.chairperson_photo}
                                                initials={
                                                    c.chairperson_initials
                                                }
                                                size="h-7 w-7"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-foreground">
                                                    {c.chairperson_name ||
                                                        'No chairperson assigned'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {c.member_count}{' '}
                                                    {c.member_count === 1
                                                        ? 'member'
                                                        : 'members'}
                                                </p>
                                            </div>
                                        </div>
                                        {c.meeting_schedule && (
                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <CalendarDays size={12} />
                                                <span className="truncate">
                                                    {c.meeting_schedule}
                                                </span>
                                            </div>
                                        )}
                                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    go({ committee: c.id })
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
                                                            setEditing(c)
                                                        }
                                                        className="rounded p-1.5 transition-colors hover:bg-muted"
                                                        aria-label={`Edit ${c.name}`}
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
                                                            setDeleting(c)
                                                        }
                                                        className="rounded p-1.5 transition-colors hover:bg-danger/10"
                                                        aria-label={`Delete ${c.name}`}
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
                <CommitteeDetail
                    c={selected}
                    roles={roles}
                    can={can}
                    onEdit={() => setEditing(selected)}
                    onDelete={() => setDeleting(selected)}
                    onAddMember={openPicker}
                />
            )}

            {editing && (
                <CommitteeModal
                    committee={editing === 'new' ? null : editing}
                    types={types}
                    onClose={() => setEditing(null)}
                />
            )}
            {picking && selected && (
                <AddMemberModal
                    committee={selected}
                    options={memberOptions}
                    onClose={() => setPicking(false)}
                />
            )}

            <ConfirmModal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Delete Committee"
                message={
                    deleting
                        ? `Delete ${deleting.name}? Its member list will be removed.`
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

function CommitteeDetail({
    c,
    roles,
    can,
    onEdit,
    onDelete,
    onAddMember,
}: {
    c: NonNullable<Props['selected']>;
    roles: string[];
    can: Props['can'];
    onEdit: () => void;
    onDelete: () => void;
    onAddMember: () => void;
}) {
    const opts = { preserveScroll: true, preserveState: true };
    const setRole = (p: CommitteePerson, role: string) =>
        router.patch(updateMemberRoute.url([c.id, p.id]), { role }, opts);
    const makeChair = (p: CommitteePerson) =>
        router.post(chairRoute.url(c.id), { member_id: p.member_id }, opts);
    const remove = (p: CommitteePerson) =>
        router.delete(removeMemberRoute.url([c.id, p.id]), opts);

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: info */}
            <div className="space-y-4 lg:col-span-1">
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="relative">
                        <Banner c={c} iconSize={40} />
                        <div className="absolute bottom-3 left-3 flex gap-2">
                            <TypePill type={c.committee_type} />
                            {!c.is_active && (
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
                                {c.description || '—'}
                            </p>
                        </div>
                        {c.objectives && (
                            <div>
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Objectives
                                </p>
                                <p className="mt-1 text-sm whitespace-pre-line text-foreground">
                                    {c.objectives}
                                </p>
                            </div>
                        )}
                        {[
                            {
                                Icon: CalendarDays,
                                label: 'Schedule',
                                value: c.meeting_schedule,
                            },
                            {
                                Icon: MapPin,
                                label: 'Location',
                                value: c.location,
                            },
                            {
                                Icon: Mail,
                                label: 'Email',
                                value: c.contact_email,
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
                                        aria-label="Delete committee"
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
                    {c.chairperson_name ? (
                        <div className="flex items-center gap-3">
                            <Avatar
                                photo={c.chairperson_photo}
                                initials={c.chairperson_initials}
                                size="h-11 w-11"
                                icon={20}
                            />
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    {c.chairperson_name}
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
                            Committee Members
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {c.members.length}{' '}
                            {c.members.length === 1 ? 'member' : 'members'}
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
                    {c.members.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <Users
                                size={32}
                                className="mx-auto mb-2 opacity-30"
                            />
                            <p className="text-sm">No members assigned yet</p>
                        </div>
                    ) : (
                        c.members.map((p) => (
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
                                            onClick={() =>
                                                c.chairperson_id !==
                                                    p.member_id && makeChair(p)
                                            }
                                            title={
                                                c.chairperson_id === p.member_id
                                                    ? 'Chairperson'
                                                    : 'Set as chairperson'
                                            }
                                            className="rounded p-1.5 transition-colors hover:bg-accent/10"
                                        >
                                            <Star
                                                size={14}
                                                className={
                                                    c.chairperson_id ===
                                                    p.member_id
                                                        ? 'fill-accent text-accent'
                                                        : 'text-muted-foreground'
                                                }
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => remove(p)}
                                            title="Remove from committee"
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
        </div>
    );
}

/* ------------------------------------------------------------------ */

function CommitteeModal({
    committee,
    types,
    onClose,
}: {
    committee: Committee | null;
    types: string[];
    onClose: () => void;
}) {
    const form = useForm({
        name: committee?.name ?? '',
        committee_type: committee?.committee_type ?? 'Standing',
        description: committee?.description ?? '',
        objectives: committee?.objectives ?? '',
        meeting_schedule: committee?.meeting_schedule ?? '',
        location: committee?.location ?? '',
        contact_email: committee?.contact_email ?? '',
        banner_url: committee?.banner_url ?? '',
        is_active: committee?.is_active ?? true,
    });

    const save = () => {
        const opts = { preserveScroll: true, onSuccess: onClose };
        if (committee) form.patch(update.url(committee.id), opts);
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
            title={committee ? 'Edit Committee' : 'New Committee'}
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
                        {committee ? 'Save Changes' : 'Create Committee'}
                    </button>
                </>
            }
        >
            <div className="scrollbar-thin space-y-4 overflow-y-auto p-5">
                <div>
                    <label className={label}>Committee Name *</label>
                    <input
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="e.g. Finance Committee"
                        className="input-field mt-1"
                    />
                    {form.errors.name && (
                        <p className="error-text">{form.errors.name}</p>
                    )}
                </div>
                <div>
                    <label className={label}>Committee Type</label>
                    <select
                        value={form.data.committee_type}
                        onChange={(e) =>
                            form.setData('committee_type', e.target.value)
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
                    <label className={label}>Objectives</label>
                    <textarea
                        value={form.data.objectives}
                        onChange={(e) =>
                            form.setData('objectives', e.target.value)
                        }
                        rows={2}
                        className="input-field mt-1 resize-none"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {input(
                        'meeting_schedule',
                        'Meeting Schedule',
                        'e.g. Second Monday 6:30 PM',
                    )}
                    {input('location', 'Location', 'e.g. Conference Room')}
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
                    Active Committee
                </label>
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */

function AddMemberModal({
    committee,
    options,
    onClose,
}: {
    committee: NonNullable<Props['selected']>;
    options?: MemberOption[];
    onClose: () => void;
}) {
    const [q, setQ] = useState('');
    useMemberOptionsSearch(q);
    const [busyId, setBusyId] = useState<string | null>(null);

    const list = useMemo(() => {
        if (!options) return [];
        const assigned = new Set(committee.members.map((p) => p.member_id));
        const s = q.toLowerCase();
        return options.filter(
            (o) =>
                !assigned.has(o.id) &&
                (!s ||
                    o.name.toLowerCase().includes(s) ||
                    o.email?.toLowerCase().includes(s)),
        );
    }, [options, committee.members, q]);

    const add = (o: MemberOption) =>
        router.post(
            addMemberRoute.url(committee.id),
            { member_id: o.id },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setBusyId(o.id),
                onFinish: () => setBusyId(null),
                onSuccess: onClose,
            },
        );

    return (
        <Modal title="Add Committee Member" onClose={onClose} size="max-w-md">
            <div className="border-b border-border p-4">
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
            </div>
            <div className="max-h-[50vh] flex-1 scrollbar-thin divide-y divide-border overflow-y-auto">
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

Committees.layout = {
    breadcrumbs: [{ title: 'Committees', href: index() }],
};
