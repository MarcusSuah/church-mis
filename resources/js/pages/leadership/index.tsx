import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Link2,
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
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import { PersonCard } from '@/components/site/person-card';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import { formatLongDate } from '@/lib/format';
import { destroy, index, store, update } from '@/routes/leadership';
import { useMemberOptionsSearch } from '@/hooks/use-member-options-search';
import { useSearchParam } from '@/hooks/use-search-param';

type Leader = {
    id: string;
    member_id: string | null;
    member_code: string | null;
    first_name: string;
    last_name: string;
    title: string;
    leadership_role: string;
    bio: string | null;
    photo_url: string | null;
    email: string | null;
    phone: string | null;
    office_location: string | null;
    ordination_date: string | null;
    start_date: string | null;
    display_order: number;
    is_active: boolean;
};

type MemberOption = {
    id: string;
    code: string | null;
    first_name: string;
    last_name: string;
    initials: string;
    email: string | null;
    phone: string | null;
    photo_url: string | null;
};

type Props = {
    leaders: Leader[];
    memberOptions?: MemberOption[];
    roles: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const ROLE_LABELS: Record<string, string> = {
    senior_pastor: ' Senior Pastor',
    associate_pastor: 'Associate Pastor',
    deacon: 'Deacon',
    deaconess: 'Deaconess',
    elder: 'Elder',
    trustee: 'Trustee',
    minister: 'Minister',
    director: 'Director',
    coordinator: 'Coordinator',
    other: 'Other',
};

const ROLE_COLORS: Record<string, string> = {
    senior_pastor: 'bg-green-100 text-green-700',
    associate_pastor: 'bg-blue-100 text-blue-700',
    deacon: 'bg-purple-100 text-purple-700',
    deaconess: 'bg-pink-100 text-pink-700',
    elder: 'bg-amber-100 text-amber-700',
    trustee: 'bg-teal-100 text-teal-700',
    minister: 'bg-indigo-100 text-indigo-700',
    director: 'bg-green-100 text-green-700',
    coordinator: 'bg-orange-100 text-orange-700',
    other: 'bg-gray-100 text-gray-600',
};

function RolePill({
    role,
    className = '',
}: {
    role: string;
    className?: string;
}) {
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[role] ?? ROLE_COLORS.other} ${className}`}
        >
            {ROLE_LABELS[role] ?? role}
        </span>
    );
}

function Modal({
    title,
    onClose,
    children,
    footer,
    size = 'max-w-lg',
    z = 'z-50',
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    size?: string;
    z?: string;
}) {
    return (
        <div
            className={`fixed inset-0 fade-in ${z} flex items-center justify-center bg-black/50 p-4`}
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

export default function Leadership({
    leaders,
    memberOptions,
    roles,
    can,
}: Props) {
    const [search, setSearch] = useState('');
    useSearchParam(setSearch);
    const [roleFilter, setRoleFilter] = useState('All');
    const [viewing, setViewing] = useState<Leader | null>(null);
    const [editing, setEditing] = useState<Leader | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Leader | null>(null);
    const [busy, setBusy] = useState(false);

    const filtered = useMemo(() => {
        let r = leaders;
        if (roleFilter !== 'All')
            r = r.filter((l) => l.leadership_role === roleFilter);
        if (search) {
            const q = search.toLowerCase();
            r = r.filter(
                (l) =>
                    `${l.first_name} ${l.last_name}`
                        .toLowerCase()
                        .includes(q) ||
                    l.title.toLowerCase().includes(q) ||
                    (ROLE_LABELS[l.leadership_role] ?? '')
                        .toLowerCase()
                        .includes(q),
            );
        }
        return r;
    }, [leaders, roleFilter, search]);

    const confirmDelete = () => {
        if (!deleting) return;
        setBusy(true);
        router.delete(destroy.url(deleting.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (viewing?.id === deleting.id) setViewing(null);
                setDeleting(null);
            },
            onFinish: () => setBusy(false),
        });
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-6">
            <Head title="Church Leadership" />

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Church Leadership
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {leaders.length}{' '}
                        {leaders.length === 1 ? 'leader' : 'leaders'}
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Plus size={16} /> Add Leader
                    </button>
                )}
            </div>

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
                        placeholder="Search leaders..."
                        className="w-full rounded-lg border border-border bg-background py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {['All', ...roles].map((r) => (
                        <button
                            type="button"
                            key={r}
                            onClick={() => setRoleFilter(r)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${roleFilter === r ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            {r === 'All' ? 'All' : (ROLE_LABELS[r] ?? r)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                    <Star size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No leaders found</p>
                    {can.create && leaders.length === 0 && (
                        <button
                            type="button"
                            onClick={() => setEditing('new')}
                            className="btn-primary mt-4 text-sm"
                        >
                            <Plus size={16} /> Add Leader
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((l) => (
                        <PersonCard
                            key={l.id}
                            name={`${l.first_name} ${l.last_name}`}
                            role={l.title}
                            body={l.bio}
                            image={l.photo_url}
                            footer={
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <RolePill role={l.leadership_role} />
                                        {!l.is_active && (
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    {l.email && (
                                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Mail
                                                size={12}
                                                className="shrink-0"
                                            />
                                            <span className="truncate">
                                                {l.email}
                                            </span>
                                        </p>
                                    )}
                                    {l.office_location && (
                                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <MapPin
                                                size={12}
                                                className="shrink-0"
                                            />
                                            <span className="truncate">
                                                {l.office_location}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            }
                            actions={
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setViewing(l)}
                                        className="text-xs font-medium text-primary hover:underline"
                                    >
                                        View profile
                                    </button>
                                    <div className="ml-auto flex gap-1">
                                        {can.update && (
                                            <button
                                                type="button"
                                                onClick={() => setEditing(l)}
                                                className="rounded p-1.5 transition-colors hover:bg-muted"
                                                aria-label={`Edit ${l.first_name} ${l.last_name}`}
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
                                                onClick={() => setDeleting(l)}
                                                className="rounded p-1.5 transition-colors hover:bg-danger/10"
                                                aria-label={`Remove ${l.first_name} ${l.last_name}`}
                                            >
                                                <Trash2
                                                    size={14}
                                                    className="text-danger"
                                                />
                                            </button>
                                        )}
                                    </div>
                                </>
                            }
                        />
                    ))}
                </div>
            )}

            {viewing && (
                <ProfileModal
                    leader={viewing}
                    canEdit={can.update}
                    onClose={() => setViewing(null)}
                    onEdit={() => {
                        setEditing(viewing);
                        setViewing(null);
                    }}
                />
            )}

            {editing && (
                <LeaderModal
                    leader={editing === 'new' ? null : editing}
                    roles={roles}
                    memberOptions={memberOptions}
                    onClose={() => setEditing(null)}
                />
            )}

            <ConfirmModal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Remove Leader"
                message={
                    deleting
                        ? `Remove ${deleting.first_name} ${deleting.last_name} from the leadership list? Their member record (if linked) is not affected.`
                        : ''
                }
                confirmLabel="Yes, Remove"
                variant="danger"
                loading={busy}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */

function ProfileModal({
    leader: l,
    canEdit,
    onClose,
    onEdit,
}: {
    leader: Leader;
    canEdit: boolean;
    onClose: () => void;
    onEdit: () => void;
}) {
    const facts = [
        { label: 'Email', value: l.email },
        { label: 'Phone', value: l.phone },
        { label: 'Office', value: l.office_location },
        {
            label: 'Ordained',
            value: l.ordination_date ? formatLongDate(l.ordination_date) : null,
        },
        {
            label: 'Serving Since',
            value: l.start_date ? formatLongDate(l.start_date) : null,
        },
        { label: 'Member ID', value: l.member_code },
    ].filter((f) => f.value);

    return (
        <Modal
            title="Leader Profile"
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline flex-1 justify-center text-sm"
                    >
                        Close
                    </button>
                    {canEdit && (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="btn-primary flex-1 justify-center text-sm"
                        >
                            <Pencil size={14} /> Edit Profile
                        </button>
                    )}
                </>
            }
        >
            <div className="scrollbar-thin overflow-y-auto p-5">
                <div className="flex items-start gap-4">
                    <div className="relative h-32 w-28 shrink-0 overflow-hidden rounded-xl bg-primary/10">
                        {l.photo_url ? (
                            <>
                                <img
                                    src={l.photo_url}
                                    alt=""
                                    aria-hidden
                                    className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-lg"
                                />
                                <img
                                    src={l.photo_url}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover object-top"
                                />
                            </>
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <User size={32} className="text-primary/40" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-foreground">
                            {l.first_name} {l.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {l.title}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                            <RolePill
                                role={l.leadership_role}
                                className="inline-block"
                            />
                            {!l.is_active && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                    Inactive
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {l.bio && (
                    <div className="mt-4">
                        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Biography
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                            {l.bio}
                        </p>
                    </div>
                )}
                {facts.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {facts.map((f) => (
                            <div key={f.label}>
                                <p className="text-xs text-muted-foreground">
                                    {f.label}
                                </p>
                                <p className="text-sm break-all text-foreground">
                                    {f.value}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */

function LeaderModal({
    leader,
    roles,
    memberOptions,
    onClose,
}: {
    leader: Leader | null;
    roles: string[];
    memberOptions?: MemberOption[];
    onClose: () => void;
}) {
    const [picking, setPicking] = useState(false);
    const form = useForm({
        member_id: leader?.member_id ?? '',
        first_name: leader?.first_name ?? '',
        last_name: leader?.last_name ?? '',
        title: leader?.title ?? '',
        leadership_role: leader?.leadership_role ?? 'other',
        bio: leader?.bio ?? '',
        photo_url: leader?.photo_url ?? '',
        email: leader?.email ?? '',
        phone: leader?.phone ?? '',
        office_location: leader?.office_location ?? '',
        ordination_date: leader?.ordination_date ?? '',
        start_date: leader?.start_date ?? '',
        display_order: leader?.display_order ?? 0,
        is_active: leader?.is_active ?? true,
    });

    const openPicker = () => {
        setPicking(true);
        if (!memberOptions) router.reload({ only: ['memberOptions'] });
    };

    const pick = (m: MemberOption) => {
        form.setData((d) => ({
            ...d,
            member_id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            email: m.email || d.email,
            phone: m.phone || d.phone,
            photo_url: m.photo_url || d.photo_url,
        }));
        setPicking(false);
    };

    const save = () => {
        form.transform((d) => ({
            ...d,
            member_id: d.member_id || null,
            ordination_date: d.ordination_date || null,
            start_date: d.start_date || null,
            display_order: Number(d.display_order) || 0,
        }));
        const opts = { preserveScroll: true, onSuccess: onClose };
        if (leader) form.patch(update.url(leader.id), opts);
        else form.post(store.url(), opts);
    };

    const label =
        'text-xs font-medium tracking-wide text-muted-foreground uppercase';
    const err = (k: keyof typeof form.data) =>
        form.errors[k] && <p className="error-text">{form.errors[k]}</p>;
    const text = (
        k:
            | 'first_name'
            | 'last_name'
            | 'title'
            | 'email'
            | 'phone'
            | 'office_location',
        l: string,
        placeholder = '',
    ) => (
        <div>
            <label className={label}>{l}</label>
            <input
                value={form.data[k]}
                onChange={(e) => form.setData(k, e.target.value)}
                placeholder={placeholder}
                className="input-field mt-1"
            />
            {err(k)}
        </div>
    );

    const valid =
        form.data.first_name.trim() &&
        form.data.last_name.trim() &&
        form.data.title.trim();

    return (
        <>
            <Modal
                title={leader ? 'Edit Leader' : 'Add Leader'}
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
                            disabled={form.processing || !valid}
                            className="btn-primary flex-1 justify-center text-sm"
                        >
                            {form.processing ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Check size={16} />
                            )}
                            {leader ? 'Save Changes' : 'Add Leader'}
                        </button>
                    </>
                }
            >
                <div className="scrollbar-thin space-y-4 overflow-y-auto p-5">
                    <div>
                        <label className={label}>
                            Link to Church Member (Optional)
                        </label>
                        <div className="mt-1 flex gap-2">
                            <button
                                type="button"
                                onClick={openPicker}
                                className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                            >
                                <Link2
                                    size={14}
                                    className="text-muted-foreground"
                                />
                                <span
                                    className={
                                        form.data.member_id
                                            ? 'text-foreground'
                                            : 'text-muted-foreground'
                                    }
                                >
                                    {form.data.member_id
                                        ? `${form.data.first_name} ${form.data.last_name} (linked)`
                                        : 'Select a member...'}
                                </span>
                            </button>
                            {form.data.member_id && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        form.setData('member_id', '')
                                    }
                                    className="btn-ghost px-2 text-xs"
                                    title="Unlink member"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {text('first_name', 'First Name *')}
                        {text('last_name', 'Last Name *')}
                    </div>
                    {text('title', 'Title *', 'e.g. Senior Pastor')}
                    <div>
                        <label className={label}>Role</label>
                        <select
                            value={form.data.leadership_role}
                            onChange={(e) =>
                                form.setData('leadership_role', e.target.value)
                            }
                            className="input-field mt-1"
                        >
                            {roles.map((r) => (
                                <option key={r} value={r}>
                                    {ROLE_LABELS[r] ?? r}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={label}>Biography</label>
                        <textarea
                            value={form.data.bio}
                            onChange={(e) =>
                                form.setData('bio', e.target.value)
                            }
                            rows={3}
                            className="input-field mt-1 resize-none"
                        />
                    </div>
                    <ImageUploadField
                        label="Photo"
                        value={form.data.photo_url}
                        onChange={(url) => form.setData('photo_url', url)}
                        variant="avatar"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        {text('email', 'Email')}
                        {text('phone', 'Phone')}
                    </div>
                    {text(
                        'office_location',
                        'Office Location',
                        'e.g. Pastoral Suite, Room 101',
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={label}>Ordination Date</label>
                            <input
                                type="date"
                                value={form.data.ordination_date}
                                onChange={(e) =>
                                    form.setData(
                                        'ordination_date',
                                        e.target.value,
                                    )
                                }
                                className="input-field mt-1"
                            />
                            {err('ordination_date')}
                        </div>
                        <div>
                            <label className={label}>Start Date</label>
                            <input
                                type="date"
                                value={form.data.start_date}
                                onChange={(e) =>
                                    form.setData('start_date', e.target.value)
                                }
                                className="input-field mt-1"
                            />
                            {err('start_date')}
                        </div>
                    </div>
                    <div>
                        <label className={label}>Display Order</label>
                        <input
                            type="number"
                            min={0}
                            value={form.data.display_order}
                            onChange={(e) =>
                                form.setData(
                                    'display_order',
                                    Number(e.target.value),
                                )
                            }
                            className="input-field mt-1"
                        />
                        <p className="helper-text">
                            Lower numbers appear first.
                        </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(e) =>
                                form.setData('is_active', e.target.checked)
                            }
                            className="rounded"
                        />
                        Active Leader
                    </label>
                </div>
            </Modal>

            {picking && (
                <MemberPicker
                    options={memberOptions}
                    selectedId={form.data.member_id}
                    onPick={pick}
                    onClose={() => setPicking(false)}
                />
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */

function MemberPicker({
    options,
    selectedId,
    onPick,
    onClose,
}: {
    options?: MemberOption[];
    selectedId: string;
    onPick: (m: MemberOption) => void;
    onClose: () => void;
}) {
    const [q, setQ] = useState('');
    useMemberOptionsSearch(q);
    const list = useMemo(() => {
        if (!options) return [];
        const s = q.toLowerCase();
        return s
            ? options.filter(
                  (m) =>
                      `${m.first_name} ${m.last_name}`
                          .toLowerCase()
                          .includes(s) || m.email?.toLowerCase().includes(s),
              )
            : options;
    }, [options, q]);

    return (
        <Modal
            title="Select Member"
            onClose={onClose}
            size="max-w-md"
            z="z-[60]"
        >
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
                        No members found
                    </div>
                ) : (
                    list.map((m) => (
                        <button
                            type="button"
                            key={m.id}
                            onClick={() => onPick(m)}
                            className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted"
                        >
                            {m.photo_url ? (
                                <img
                                    src={m.photo_url}
                                    alt=""
                                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                    <span className="text-xs font-bold text-primary">
                                        {m.initials}
                                    </span>
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">
                                    {m.first_name} {m.last_name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {m.email || m.code || '—'}
                                </p>
                            </div>
                            {selectedId === m.id && (
                                <Check
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

Leadership.layout = {
    breadcrumbs: [{ title: 'Church Leadership', href: index() }],
};
