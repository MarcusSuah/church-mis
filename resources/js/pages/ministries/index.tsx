import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    Check,
    Heart,
    Loader2,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plus,
    Search,
    Star,
    Trash2,
    User,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { PersonAvatar } from '@/components/site/person-card';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import {
    destroy,
    index,
    leader as leaderRoute,
    store,
    update,
} from '@/routes/ministries';
import {
    destroy as removeMemberRoute,
    store as addMemberRoute,
    update as updateMemberRoute,
} from '@/routes/ministries/members';
import { useMemberOptionsSearch } from '@/hooks/use-member-options-search';
import { useSearchParam } from '@/hooks/use-search-param';

type Ministry = {
    id: string;
    slug: string | null;
    name: string;
    description: string | null;
    vision: string | null;
    category: string;
    leader_id: string | null;
    leader_name: string | null;
    leader_photo: string | null;
    leader_initials: string | null;
    member_count: number;
    meeting_schedule: string | null;
    location: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    banner_url: string | null;
    is_active: boolean;
};

type MinistryPerson = {
    id: string;
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
    ministries: Ministry[];
    selected: (Ministry & { members: MinistryPerson[] }) | null;
    memberOptions?: MemberOption[];
    categories: string[];
    roles: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const CATEGORY_LABELS: Record<string, string> = {
    worship: 'Worship',
    outreach: 'Outreach',
    education: 'Education',
    care: 'Care',
    youth: 'Youth',
    men: "Men's",
    women: "Women's",
    seniors: 'Seniors',
    missions: 'Missions',
    other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
    worship: 'bg-purple-100 text-purple-700',
    outreach: 'bg-orange-100 text-orange-700',
    education: 'bg-blue-100 text-blue-700',
    care: 'bg-pink-100 text-pink-700',
    youth: 'bg-green-100 text-green-700',
    men: 'bg-sky-100 text-sky-700',
    women: 'bg-rose-100 text-rose-700',
    seniors: 'bg-amber-100 text-amber-700',
    missions: 'bg-teal-100 text-teal-700',
    other: 'bg-gray-100 text-gray-600',
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

function CategoryPill({ category }: { category: string }) {
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other}`}
        >
            {CATEGORY_LABELS[category] ?? category}
        </span>
    );
}

function Banner({
    m,
    height,
    iconSize,
}: {
    m: Ministry;
    height: string;
    iconSize: number;
}) {
    return (
        <div className={`relative ${height} bg-muted`}>
            {m.banner_url ? (
                <img
                    src={m.banner_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <Heart size={iconSize} className="text-primary/40" />
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
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
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

export default function Ministries({
    ministries,
    selected,
    memberOptions,
    categories,
    roles,
    can,
}: Props) {
    const [search, setSearch] = useState('');
    useSearchParam(setSearch);
    const [category, setCategory] = useState('All');
    const [editing, setEditing] = useState<Ministry | 'new' | null>(null);
    const [picking, setPicking] = useState(false);
    const [deleting, setDeleting] = useState<Ministry | null>(null);
    const [busy, setBusy] = useState(false);

    const filtered = useMemo(() => {
        let r = ministries;
        if (category !== 'All') r = r.filter((m) => m.category === category);
        if (search) {
            const q = search.toLowerCase();
            r = r.filter(
                (m) =>
                    m.name.toLowerCase().includes(q) ||
                    m.description?.toLowerCase().includes(q) ||
                    m.leader_name?.toLowerCase().includes(q),
            );
        }
        return r;
    }, [ministries, category, search]);

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
                    selected ? `${selected.name} — Ministries` : 'Ministries'
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
                            aria-label="Back to all ministries"
                        >
                            <ArrowLeft
                                size={18}
                                className="text-muted-foreground"
                            />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {selected ? selected.name : 'Ministries'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {selected
                                ? 'Ministry details & members'
                                : `${ministries.length} ${ministries.length === 1 ? 'ministry' : 'ministries'}`}
                        </p>
                    </div>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Plus size={16} />
                        New Ministry
                    </button>
                )}
            </div>

            {!selected ? (
                <>
                    {/* Filters */}
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search departments..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-field mr-2.5 w-2xs pl-9"
                            />
                        </div>
                        <div className="flex scrollbar-thin gap-2 overflow-x-auto pb-1">
                            {['All', ...categories].map((cat) => (
                                <button
                                    type="button"
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap capitalize transition-all duration-150 ${
                                        category === cat
                                            ? 'bg-primary text-white'
                                            : 'border border-border bg-card text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid */}
                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground">
                            <Heart
                                size={40}
                                className="mx-auto mb-3 opacity-30"
                            />
                            <p className="font-medium">No ministries found</p>
                            {can.create && ministries.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() => setEditing('new')}
                                    className="btn-primary mt-4 text-sm"
                                >
                                    <Plus size={16} />
                                    New Ministry
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((m) => (
                                <div
                                    key={m.id}
                                    className="group flex flex-col rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                                >
                                    <div className="flex flex-1 flex-col p-5">
                                        <div className="flex items-start gap-4">
                                            <PersonAvatar
                                                name={m.name}
                                                image={m.banner_url}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <h3
                                                    className="cursor-pointer font-display text-lg leading-snug font-bold text-foreground transition-colors hover:text-accent"
                                                    onClick={() =>
                                                        go({
                                                            ministry:
                                                                m.slug ?? m.id,
                                                        })
                                                    }
                                                >
                                                    {m.name}
                                                </h3>
                                                <p className="mt-0.5 text-sm font-medium text-accent">
                                                    {m.category}
                                                </p>
                                            </div>
                                            <span
                                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${m.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                                            >
                                                {m.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </div>
                                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                                            {m.description}
                                        </p>
                                        <div className="mt-3 flex items-center gap-3">
                                            <Avatar
                                                photo={m.leader_photo}
                                                initials={m.leader_initials}
                                                size="h-7 w-7"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-foreground">
                                                    {m.leader_name ||
                                                        'No leader assigned'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {m.member_count}{' '}
                                                    {m.member_count === 1
                                                        ? 'member'
                                                        : 'members'}
                                                </p>
                                            </div>
                                        </div>
                                        {m.meeting_schedule && (
                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <CalendarDays size={12} />
                                                <span className="truncate">
                                                    {m.meeting_schedule}
                                                </span>
                                            </div>
                                        )}
                                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    go({
                                                        ministry:
                                                            m.slug ?? m.id,
                                                    })
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
                                                            setEditing(m)
                                                        }
                                                        className="rounded p-1.5 transition-colors hover:bg-muted"
                                                        aria-label={`Edit ${m.name}`}
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
                                                            setDeleting(m)
                                                        }
                                                        className="rounded p-1.5 transition-colors hover:bg-danger/10"
                                                        aria-label={`Delete ${m.name}`}
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
                <MinistryDetail
                    m={selected}
                    roles={roles}
                    can={can}
                    onEdit={() => setEditing(selected)}
                    onDelete={() => setDeleting(selected)}
                    onAddMember={openPicker}
                />
            )}

            {editing && (
                <MinistryModal
                    ministry={editing === 'new' ? null : editing}
                    categories={categories}
                    onClose={() => setEditing(null)}
                />
            )}
            {picking && selected && (
                <AddMemberModal
                    ministry={selected}
                    options={memberOptions}
                    onClose={() => setPicking(false)}
                />
            )}

            <ConfirmModal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Delete Ministry"
                message={
                    deleting
                        ? `Delete ${deleting.name}? Its member list will be removed and members assigned to it will become unassigned.`
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

function MinistryDetail({
    m,
    roles,
    can,
    onEdit,
    onDelete,
    onAddMember,
}: {
    m: NonNullable<Props['selected']>;
    roles: string[];
    can: Props['can'];
    onEdit: () => void;
    onDelete: () => void;
    onAddMember: () => void;
}) {
    const opts = { preserveScroll: true, preserveState: true };
    const setRole = (p: MinistryPerson, role: string) =>
        router.patch(updateMemberRoute.url([m.id, p.id]), { role }, opts);
    const makeLeader = (p: MinistryPerson) =>
        router.post(leaderRoute.url(m.id), { member_id: p.member_id }, opts);
    const remove = (p: MinistryPerson) =>
        router.delete(removeMemberRoute.url([m.id, p.id]), opts);

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: info */}
            <div className="space-y-4 lg:col-span-1">
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="relative">
                        <Banner m={m} height="h-40" iconSize={40} />
                        <div className="absolute bottom-3 left-3 flex gap-2">
                            <CategoryPill category={m.category} />
                            {!m.is_active && (
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
                                {m.description || '—'}
                            </p>
                        </div>
                        {m.vision && (
                            <div>
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Vision
                                </p>
                                <p className="mt-1 text-sm text-foreground italic">
                                    "{m.vision}"
                                </p>
                            </div>
                        )}
                        {[
                            {
                                Icon: CalendarDays,
                                label: 'Schedule',
                                value: m.meeting_schedule,
                            },
                            {
                                Icon: MapPin,
                                label: 'Location',
                                value: m.location,
                            },
                            {
                                Icon: Mail,
                                label: 'Email',
                                value: m.contact_email,
                            },
                            {
                                Icon: Phone,
                                label: 'Phone',
                                value: m.contact_phone,
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
                                        aria-label="Delete ministry"
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
                        Ministry Leader
                    </p>
                    {m.leader_name ? (
                        <div className="flex items-center gap-3">
                            <Avatar
                                photo={m.leader_photo}
                                initials={m.leader_initials}
                                size="h-11 w-11"
                                icon={20}
                            />
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    {m.leader_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Ministry Leader
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No leader assigned
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
                            Members
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {m.members.length} assigned
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
                    {m.members.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <Users
                                size={32}
                                className="mx-auto mb-2 opacity-30"
                            />
                            <p className="text-sm">No members assigned yet</p>
                        </div>
                    ) : (
                        m.members.map((p) => (
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
                                                m.leader_id !== p.member_id &&
                                                makeLeader(p)
                                            }
                                            title={
                                                m.leader_id === p.member_id
                                                    ? 'Ministry leader'
                                                    : 'Set as leader'
                                            }
                                            className="rounded p-1.5 transition-colors hover:bg-accent/10"
                                        >
                                            <Star
                                                size={14}
                                                className={
                                                    m.leader_id === p.member_id
                                                        ? 'fill-accent text-accent'
                                                        : 'text-muted-foreground'
                                                }
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => remove(p)}
                                            title="Remove from ministry"
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

function MinistryModal({
    ministry,
    categories,
    onClose,
}: {
    ministry: Ministry | null;
    categories: string[];
    onClose: () => void;
}) {
    const form = useForm({
        name: ministry?.name ?? '',
        category: ministry?.category ?? 'other',
        description: ministry?.description ?? '',
        vision: ministry?.vision ?? '',
        meeting_schedule: ministry?.meeting_schedule ?? '',
        location: ministry?.location ?? '',
        contact_email: ministry?.contact_email ?? '',
        contact_phone: ministry?.contact_phone ?? '',
        banner_url: ministry?.banner_url ?? '',
        is_active: ministry?.is_active ?? true,
    });

    const save = () => {
        const opts = { preserveScroll: true, onSuccess: onClose };
        if (ministry) form.patch(update.url(ministry.id), opts);
        else form.post(store.url(), opts);
    };

    const label =
        'text-xs font-medium tracking-wide text-muted-foreground uppercase';
    const input = (
        key:
            | 'meeting_schedule'
            | 'location'
            | 'contact_email'
            | 'contact_phone',
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
            title={ministry ? 'Edit Ministry' : 'New Ministry'}
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
                        {ministry ? 'Save Changes' : 'Create Ministry'}
                    </button>
                </>
            }
        >
            <div className="scrollbar-thin space-y-4 overflow-y-auto p-5">
                <div>
                    <label className={label}>Ministry Name *</label>
                    <input
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="e.g. Prayer Ministry"
                        className="input-field mt-1"
                    />
                    {form.errors.name && (
                        <p className="error-text">{form.errors.name}</p>
                    )}
                </div>
                <div>
                    <label className={label}>Category</label>
                    <select
                        value={form.data.category}
                        onChange={(e) =>
                            form.setData('category', e.target.value)
                        }
                        className="input-field mt-1"
                    >
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {CATEGORY_LABELS[c] ?? c}
                            </option>
                        ))}
                    </select>
                    {form.errors.category && (
                        <p className="error-text">{form.errors.category}</p>
                    )}
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
                    <label className={label}>Vision Statement</label>
                    <textarea
                        value={form.data.vision}
                        onChange={(e) => form.setData('vision', e.target.value)}
                        rows={2}
                        className="input-field mt-1 resize-none"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {input(
                        'meeting_schedule',
                        'Meeting Schedule',
                        'e.g. Every Friday 6PM',
                    )}
                    {input('location', 'Location', 'e.g. Fellowship Hall')}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {input('contact_email', 'Contact Email')}
                    {input('contact_phone', 'Contact Phone')}
                </div>
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
                    Active Ministry
                </label>
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */

function AddMemberModal({
    ministry,
    options,
    onClose,
}: {
    ministry: NonNullable<Props['selected']>;
    options?: MemberOption[];
    onClose: () => void;
}) {
    const [q, setQ] = useState('');
    useMemberOptionsSearch(q);
    const [busyId, setBusyId] = useState<string | null>(null);

    const list = useMemo(() => {
        if (!options) return [];
        const assigned = new Set(ministry.members.map((p) => p.member_id));
        const s = q.toLowerCase();
        return options.filter(
            (o) =>
                !assigned.has(o.id) &&
                (!s ||
                    o.name.toLowerCase().includes(s) ||
                    o.email?.toLowerCase().includes(s)),
        );
    }, [options, ministry.members, q]);

    const add = (o: MemberOption) =>
        router.post(
            addMemberRoute.url(ministry.id),
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
        <Modal title="Add Member" onClose={onClose}>
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

Ministries.layout = {
    breadcrumbs: [{ title: 'Ministries', href: index() }],
};
