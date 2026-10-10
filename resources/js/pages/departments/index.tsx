import { Upload } from 'lucide-react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowLeftRight,
    Building2,
    Calendar,
    CalendarDays,
    Check,
    CheckCircle2,
    Eye,
    Loader2,
    Mail,
    MapPin,
    Pencil,
    Plus,
    PlusCircle,
    Search,
    Star,
    Tag,
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
import { formatLongDate } from '@/lib/format';
import {
    destroy,
    index,
    leader as leaderRoute,
    store,
    update,
} from '@/routes/departments';
import {
    destroy as destroyActivity,
    store as storeActivity,
} from '@/routes/departments/activities';
import {
    destroy as removeMemberRoute,
    store as addMemberRoute,
    update as updateMemberRoute,
} from '@/routes/departments/members';
import { useMemberOptionsSearch } from '@/hooks/use-member-options-search';

type Department = {
    id: string;
    name: string;
    description: string | null;
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
    created_at: string | null;
};

type DeptMember = {
    id: number;
    member_id: string;
    role: string;
    joined_at: string | null;
    name: string;
    initials: string;
    email: string | null;
    member_code: string | null;
    photo_url: string | null;
};

type Activity = {
    id: string;
    title: string;
    description: string | null;
    activity_type: string;
    activity_date: string;
    location: string | null;
    attendees_count: number;
    notes: string | null;
};

type MemberOption = {
    id: string;
    name: string;
    initials: string;
    code: string | null;
    department: string | null;
    photo_url: string | null;
};

type Props = {
    departments: Department[];
    selected:
        | (Department & { members: DeptMember[]; activities: Activity[] })
        | null;
    memberOptions?: MemberOption[];
    categories: string[];
    roles: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const ACTIVITY_TYPES: Record<
    string,
    { label: string; color: string; bg: string }
> = {
    meeting: { label: 'Meeting', color: 'text-info', bg: 'bg-info/10' },
    event: { label: 'Event', color: 'text-accent', bg: 'bg-accent/10' },
    training: { label: 'Training', color: 'text-success', bg: 'bg-success/10' },
    outreach: { label: 'Outreach', color: 'text-primary', bg: 'bg-primary/10' },
    other: { label: 'Other', color: 'text-muted-foreground', bg: 'bg-muted' },
};

const go = (params: Record<string, string> = {}) =>
    router.get(index.url(), params, { preserveScroll: false });

function Avatar({
    photo,
    initials,
    size,
}: {
    photo: string | null;
    initials: string | null;
    size: string;
}) {
    return (
        <div
            className={`${size} shrink-0 overflow-hidden rounded-full bg-muted`}
        >
            {photo ? (
                <img
                    src={photo}
                    alt=""
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className="gradient-navy flex h-full w-full items-center justify-center">
                    {initials ? (
                        <span className="text-xs font-bold text-white">
                            {initials}
                        </span>
                    ) : (
                        <User className="size-3 text-white" />
                    )}
                </div>
            )}
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
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`scale-in my-4 w-full rounded-2xl bg-card shadow-2xl ${size}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h3 className="text-lg font-bold text-foreground">
                        {title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-ghost p-1.5"
                        aria-label="Close"
                    >
                        <X className="size-[18px]" />
                    </button>
                </div>
                {children}
                {footer && (
                    <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Departments({
    departments,
    selected,
    memberOptions,
    categories,
    roles,
    can,
}: Props) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [tab, setTab] = useState<'members' | 'activities'>('members');
    const [editing, setEditing] = useState<Department | 'new' | null>(null);
    const [picker, setPicker] = useState<'member' | 'leader' | null>(null);
    const [showActivity, setShowActivity] = useState(false);
    const [deleting, setDeleting] = useState<Department | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const filtered = useMemo(() => {
        let list = departments;
        if (category !== 'All')
            list = list.filter((d) => d.category === category);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(
                (d) =>
                    d.name.toLowerCase().includes(q) ||
                    d.description?.toLowerCase().includes(q) ||
                    d.leader_name?.toLowerCase().includes(q),
            );
        }
        return list;
    }, [departments, category, search]);

    const openPicker = (mode: 'member' | 'leader') => {
        setPicker(mode);
        router.reload({ only: ['memberOptions'] });
    };

    const confirmDelete = () => {
        if (!deleting) return;
        setDeleteBusy(true);
        router.delete(destroy.url(deleting.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (selected?.id === deleting.id) go();
                setDeleting(null);
            },
            onFinish: () => setDeleteBusy(false),
        });
    };

    const stats = [
        {
            label: 'Total Departments',
            value: departments.length,
            Icon: Building2,
            color: 'text-primary bg-primary/10',
        },
        {
            label: 'Active',
            value: departments.filter((d) => d.is_active).length,
            Icon: CheckCircle2,
            color: 'text-success bg-success/10',
        },
        {
            label: 'Total Members',
            value: departments.reduce((a, d) => a + d.member_count, 0),
            Icon: Users,
            color: 'text-accent bg-accent/10',
        },
        {
            label: 'Categories',
            value: new Set(departments.map((d) => d.category)).size,
            Icon: Tag,
            color: 'text-info bg-info/10',
        },
    ];

    return (
        <div className="flex flex-1 flex-col p-4 md:p-6">
            <Head
                title={
                    selected ? `${selected.name} — Departments` : 'Departments'
                }
            />

            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Departments</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage church departments, leaders, members, and
                        activities
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selected && (
                        <button
                            type="button"
                            onClick={() => go()}
                            className="btn-outline text-sm"
                        >
                            <ArrowLeft className="size-4" />
                            All Departments
                        </button>
                    )}
                    {can.create && (
                        <button
                            type="button"
                            onClick={() => setEditing('new')}
                            className="btn-accent text-sm"
                        >
                            <Plus className="size-4" />
                            New Department
                        </button>
                    )}
                </div>
            </div>

            {!selected ? (
                <>
                    {/* Stats */}
                    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                        {stats.map((s) => (
                            <div
                                key={s.label}
                                className="card flex items-center gap-3 p-4"
                            >
                                <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.color}`}
                                >
                                    <s.Icon className="size-5" />
                                </div>
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
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
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
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Building2 className="mb-4 size-10 text-muted-foreground" />
                            <p className="mb-1 font-semibold text-foreground">
                                No departments found
                            </p>
                            <p className="mb-4 text-sm text-muted-foreground">
                                {departments.length === 0
                                    ? 'Create your first department to get started.'
                                    : 'Try another search or category.'}
                            </p>
                            {can.create && departments.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() => setEditing('new')}
                                    className="btn-accent text-sm"
                                >
                                    <Plus className="size-4" />
                                    New Department
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {filtered.map((d) => (
                                <div
                                    key={d.id}
                                    className="card flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-md"
                                >
                                    <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary to-primary/60">
                                        {d.banner_url && (
                                            <img
                                                src={d.banner_url}
                                                alt=""
                                                className="absolute inset-0 h-full w-full object-cover opacity-60"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <div className="absolute right-4 bottom-3 left-4 flex items-end justify-between">
                                            <div>
                                                <span className="text-xs font-semibold tracking-wide text-white/70 uppercase">
                                                    {d.category}
                                                </span>
                                                <h3 className="text-base leading-tight font-bold text-white">
                                                    {d.name}
                                                </h3>
                                            </div>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.is_active ? 'bg-success/20 text-green-200' : 'bg-danger/20 text-red-200'}`}
                                            >
                                                {d.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col p-4">
                                        {d.description && (
                                            <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                                                {d.description}
                                            </p>
                                        )}
                                        <div className="mb-3 flex items-center gap-2">
                                            <Avatar
                                                photo={d.leader_photo}
                                                initials={d.leader_initials}
                                                size="h-7 w-7"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-semibold text-foreground">
                                                    {d.leader_name ||
                                                        'No leader assigned'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Department Leader
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Users className="size-[13px]" />
                                                <span className="font-semibold text-foreground">
                                                    {d.member_count}
                                                </span>
                                            </div>
                                        </div>
                                        {d.meeting_schedule && (
                                            <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <CalendarDays className="size-[13px]" />
                                                <span>
                                                    {d.meeting_schedule}
                                                </span>
                                            </div>
                                        )}
                                        <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    go({ department: d.id })
                                                }
                                                className="btn-primary flex-1 py-1.5 text-xs"
                                            >
                                                <Eye className="size-[13px]" />
                                                View Details
                                            </button>
                                            {can.update && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditing(d)
                                                    }
                                                    className="btn-outline px-2.5 py-1.5 text-xs"
                                                    aria-label={`Edit ${d.name}`}
                                                >
                                                    <Pencil className="size-[13px]" />
                                                </button>
                                            )}
                                            {can.delete && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleting(d)
                                                    }
                                                    className="btn-ghost px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10"
                                                    aria-label={`Delete ${d.name}`}
                                                >
                                                    <Trash2 className="size-[13px]" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <DepartmentDetail
                    dept={selected}
                    roles={roles}
                    can={can}
                    tab={tab}
                    setTab={setTab}
                    onEdit={() => setEditing(selected)}
                    onAddMember={() => openPicker('member')}
                    onChangeLeader={() => openPicker('leader')}
                    onLogActivity={() => setShowActivity(true)}
                />
            )}

            {editing && (
                <DepartmentModal
                    dept={editing === 'new' ? null : editing}
                    categories={categories}
                    onClose={() => setEditing(null)}
                />
            )}

            {picker && selected && (
                <MemberPickerModal
                    mode={picker}
                    dept={selected}
                    options={memberOptions}
                    onClose={() => setPicker(null)}
                />
            )}

            {showActivity && selected && (
                <ActivityModal
                    deptId={selected.id}
                    onClose={() => setShowActivity(false)}
                />
            )}

            <ConfirmModal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Delete Department"
                message={
                    deleting
                        ? `Delete ${deleting.name}? Its member list and activity log will be removed, and members assigned to it will become unassigned.`
                        : ''
                }
                confirmLabel="Yes, Delete"
                variant="danger"
                loading={deleteBusy}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */

function DepartmentDetail({
    dept,
    roles,
    can,
    tab,
    setTab,
    onEdit,
    onAddMember,
    onChangeLeader,
    onLogActivity,
}: {
    dept: NonNullable<Props['selected']>;
    roles: string[];
    can: Props['can'];
    tab: 'members' | 'activities';
    setTab: (t: 'members' | 'activities') => void;
    onEdit: () => void;
    onAddMember: () => void;
    onChangeLeader: () => void;
    onLogActivity: () => void;
}) {
    const opts = { preserveScroll: true, preserveState: true };
    const setRole = (m: DeptMember, role: string) =>
        router.patch(updateMemberRoute.url([dept.id, m.id]), { role }, opts);
    const makeLeader = (m: DeptMember) =>
        router.post(leaderRoute.url(dept.id), { member_id: m.member_id }, opts);
    const remove = (m: DeptMember) =>
        router.delete(removeMemberRoute.url([dept.id, m.id]), opts);
    const removeActivity = (a: Activity) =>
        router.delete(destroyActivity.url([dept.id, a.id]), opts);

    return (
        <div className="space-y-5">
            {/* Header card */}
            <div className="card overflow-hidden">
                <div className="relative h-40 bg-gradient-to-br from-primary to-primary/60">
                    {dept.banner_url && (
                        <img
                            src={dept.banner_url}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover opacity-50"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute right-5 bottom-4 left-5 flex items-end justify-between">
                        <div>
                            <span className="text-xs font-semibold tracking-wide text-white/60 uppercase">
                                {dept.category}
                            </span>
                            <h2 className="text-2xl font-bold text-white">
                                {dept.name}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {!dept.is_active && (
                                <span className="rounded-full bg-danger/30 px-2 py-0.5 text-xs font-semibold text-red-100">
                                    Inactive
                                </span>
                            )}
                            {can.update && (
                                <button
                                    type="button"
                                    onClick={onEdit}
                                    className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/30"
                                >
                                    <Pencil className="size-[13px]" />
                                    Edit
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-5">
                    {dept.description && (
                        <p className="mb-4 text-sm text-muted-foreground">
                            {dept.description}
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {[
                            {
                                label: 'Members',
                                value: String(dept.members.length),
                                Icon: Users,
                            },
                            {
                                label: 'Schedule',
                                value: dept.meeting_schedule || '—',
                                Icon: CalendarDays,
                            },
                            {
                                label: 'Location',
                                value: dept.location || '—',
                                Icon: MapPin,
                            },
                            {
                                label: 'Contact',
                                value:
                                    dept.contact_email ||
                                    dept.contact_phone ||
                                    '—',
                                Icon: Mail,
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="flex items-start gap-2"
                            >
                                <item.Icon className="mt-0.5 size-[15px] shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">
                                        {item.label}
                                    </p>
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {item.value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Leader */}
            <div className="card p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">
                        Department Leader
                    </h3>
                    {can.update && (
                        <button
                            type="button"
                            onClick={onChangeLeader}
                            className="btn-ghost text-xs text-primary"
                        >
                            <ArrowLeftRight className="size-[13px]" />
                            {dept.leader_name
                                ? 'Change Leader'
                                : 'Assign Leader'}
                        </button>
                    )}
                </div>
                {dept.leader_name ? (
                    <div className="flex items-center gap-3">
                        <Avatar
                            photo={dept.leader_photo}
                            initials={dept.leader_initials}
                            size="h-12 w-12"
                        />
                        <div>
                            <p className="font-bold text-foreground">
                                {dept.leader_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Department Leader
                            </p>
                        </div>
                        <span className="ml-auto rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                            Leader
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <UserPlus className="size-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">
                                No leader assigned
                            </p>
                            {can.update && (
                                <button
                                    type="button"
                                    onClick={onChangeLeader}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Assign a leader
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
                {[
                    {
                        id: 'members' as const,
                        label: `Members (${dept.members.length})`,
                        Icon: Users,
                    },
                    {
                        id: 'activities' as const,
                        label: `Activities (${dept.activities.length})`,
                        Icon: CalendarDays,
                    },
                ].map((t) => (
                    <button
                        type="button"
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 ${
                            tab === t.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <t.Icon className="size-[15px]" />
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'members' ? (
                <div className="card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <h3 className="font-semibold text-foreground">
                            Department Members
                        </h3>
                        {can.update && (
                            <button
                                type="button"
                                onClick={onAddMember}
                                className="btn-accent text-xs"
                            >
                                <UserPlus className="size-3.5" />
                                Add Member
                            </button>
                        )}
                    </div>
                    {dept.members.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="mb-3 size-8 text-muted-foreground" />
                            <p className="font-semibold text-foreground">
                                No members yet
                            </p>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Add members to this department.
                            </p>
                            {can.update && (
                                <button
                                    type="button"
                                    onClick={onAddMember}
                                    className="btn-accent text-sm"
                                >
                                    <UserPlus className="size-4" />
                                    Add Member
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {dept.members.map((m) => (
                                <div
                                    key={m.id}
                                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                                >
                                    <Avatar
                                        photo={m.photo_url}
                                        initials={m.initials}
                                        size="h-10 w-10"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {m.name}
                                            {m.member_id === dept.leader_id && (
                                                <Star className="ml-1.5 inline size-3.5 fill-accent text-accent" />
                                            )}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {m.email || m.member_code || '—'}
                                        </p>
                                    </div>
                                    {can.update ? (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={m.role}
                                                onChange={(e) =>
                                                    setRole(m, e.target.value)
                                                }
                                                className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                                            >
                                                {roles.map((r) => (
                                                    <option key={r}>{r}</option>
                                                ))}
                                            </select>
                                            {m.member_id !== dept.leader_id && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        makeLeader(m)
                                                    }
                                                    title="Set as department leader"
                                                    className="btn-ghost px-2 py-1 text-xs text-accent hover:bg-accent/10"
                                                >
                                                    <Star className="size-3.5" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => remove(m)}
                                                title="Remove from department"
                                                className="btn-ghost px-2 py-1 text-xs text-danger hover:bg-danger/10"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                            {m.role}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                        <h3 className="font-semibold text-foreground">
                            Department Activities
                        </h3>
                        {can.update && (
                            <button
                                type="button"
                                onClick={onLogActivity}
                                className="btn-accent text-xs"
                            >
                                <Plus className="size-3.5" />
                                Log Activity
                            </button>
                        )}
                    </div>
                    {dept.activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <CalendarDays className="mb-3 size-8 text-muted-foreground" />
                            <p className="font-semibold text-foreground">
                                No activities logged
                            </p>
                            <p className="mb-4 text-sm text-muted-foreground">
                                Log meetings, events, and activities for this
                                department.
                            </p>
                            {can.update && (
                                <button
                                    type="button"
                                    onClick={onLogActivity}
                                    className="btn-accent text-sm"
                                >
                                    <Plus className="size-4" />
                                    Log Activity
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {dept.activities.map((a) => {
                                const cfg =
                                    ACTIVITY_TYPES[a.activity_type] ??
                                    ACTIVITY_TYPES.other;
                                return (
                                    <div
                                        key={a.id}
                                        className="flex items-start gap-4 px-5 py-4"
                                    >
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}
                                        >
                                            <CalendarDays
                                                className={`size-[18px] ${cfg.color}`}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {a.title}
                                                    </p>
                                                    {a.description && (
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {a.description}
                                                        </p>
                                                    )}
                                                </div>
                                                {can.update && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeActivity(a)
                                                        }
                                                        className="btn-ghost shrink-0 px-1.5 py-1 text-xs text-danger hover:bg-danger/10"
                                                        aria-label="Delete activity"
                                                    >
                                                        <Trash2 className="size-[13px]" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-3">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color}`}
                                                >
                                                    {cfg.label}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Calendar className="size-3" />
                                                    {formatLongDate(
                                                        a.activity_date,
                                                    )}
                                                </span>
                                                {a.location && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MapPin className="size-3" />
                                                        {a.location}
                                                    </span>
                                                )}
                                                {a.attendees_count > 0 && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Users className="size-3" />
                                                        {a.attendees_count}{' '}
                                                        attendees
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */

function DepartmentModal({
    dept,
    categories,
    onClose,
}: {
    dept: Department | null;
    categories: string[];
    onClose: () => void;
}) {
    const form = useForm({
        name: dept?.name ?? '',
        description: dept?.description ?? '',
        category: dept?.category ?? 'General',
        is_active: dept?.is_active ?? true,
        meeting_schedule: dept?.meeting_schedule ?? '',
        location: dept?.location ?? '',
        contact_email: dept?.contact_email ?? '',
        contact_phone: dept?.contact_phone ?? '',
        banner_url: dept?.banner_url ?? '',
    });

    const save = () => {
        const opts = { preserveScroll: true, onSuccess: onClose };
        if (dept) form.patch(update.url(dept.id), opts);
        else form.post(store.url(), opts);
    };

    const text = (
        key:
            | 'meeting_schedule'
            | 'location'
            | 'contact_email'
            | 'contact_phone',
        label: string,
        placeholder: string,
        type = 'text',
    ) => (
        <div>
            <label className="label-text">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                value={form.data[key]}
                onChange={(e) => form.setData(key, e.target.value)}
                className="input-field"
            />
            {form.errors[key] && (
                <p className="error-text">{form.errors[key]}</p>
            )}
        </div>
    );

    return (
        <Modal
            title={dept ? 'Edit Department' : 'New Department'}
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
                    <button
                        type="button"
                        onClick={save}
                        disabled={form.processing || !form.data.name.trim()}
                        className="btn-accent text-sm"
                    >
                        {form.processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Check className="size-4" />
                        )}
                        {dept ? 'Save Changes' : 'Create Department'}
                    </button>
                </>
            }
        >
            <div className="max-h-[70vh] scrollbar-thin space-y-4 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="label-text">
                            Department Name{' '}
                            <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Worship Department"
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                            className="input-field"
                        />
                        {form.errors.name && (
                            <p className="error-text">{form.errors.name}</p>
                        )}
                    </div>
                    <div className="col-span-2">
                        <label className="label-text">Description</label>
                        <textarea
                            rows={2}
                            placeholder="Brief description of the department..."
                            value={form.data.description}
                            onChange={(e) =>
                                form.setData('description', e.target.value)
                            }
                            className="input-field resize-none"
                        />
                    </div>
                    <div>
                        <label className="label-text">Category</label>
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
                        <label className="label-text">Status</label>
                        <select
                            value={form.data.is_active ? 'active' : 'inactive'}
                            onChange={(e) =>
                                form.setData(
                                    'is_active',
                                    e.target.value === 'active',
                                )
                            }
                            className="input-field"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    {text(
                        'meeting_schedule',
                        'Meeting Schedule',
                        'e.g. Every Saturday 4:00 PM',
                    )}
                    {text('location', 'Location', 'e.g. Main Sanctuary')}
                    {text(
                        'contact_email',
                        'Contact Email',
                        'dept@church.org',
                        'email',
                    )}
                    {text(
                        'contact_phone',
                        'Contact Phone',
                        '+250 788 000 000',
                        'tel',
                    )}
                    <div className="col-span-2">
                        <ImageUploadField
                            label="Banner Image"
                            value={form.data.banner_url}
                            onChange={(url) => form.setData('banner_url', url)}
                            variant="banner"
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */

function MemberPickerModal({
    mode,
    dept,
    options,
    onClose,
}: {
    mode: 'member' | 'leader';
    dept: NonNullable<Props['selected']>;
    options?: MemberOption[];
    onClose: () => void;
}) {
    const [q, setQ] = useState('');
    useMemberOptionsSearch(q);
    const [busyId, setBusyId] = useState<string | null>(null);

    const inDept = useMemo(
        () => new Set(dept.members.map((m) => m.member_id)),
        [dept.members],
    );
    const list = useMemo(() => {
        if (!options) return [];
        // Adding: people not already in the department. Choosing a leader: anyone (non-members get added).
        let l =
            mode === 'member'
                ? options.filter((o) => !inDept.has(o.id))
                : options.filter((o) => o.id !== dept.leader_id);
        if (q) {
            const s = q.toLowerCase();
            l = l.filter(
                (o) =>
                    o.name.toLowerCase().includes(s) ||
                    o.department?.toLowerCase().includes(s) ||
                    o.code?.toLowerCase().includes(s),
            );
        }
        return l;
    }, [options, mode, inDept, dept.leader_id, q]);

    const opts = (id: string) => ({
        preserveScroll: true,
        preserveState: true,
        onStart: () => setBusyId(id),
        onFinish: () => setBusyId(null),
        onSuccess: onClose,
    });
    const add = (o: MemberOption, asLeader = false) =>
        router.post(
            addMemberRoute.url(dept.id),
            { member_id: o.id, as_leader: asLeader },
            opts(o.id),
        );
    const lead = (o: MemberOption) =>
        router.post(leaderRoute.url(dept.id), { member_id: o.id }, opts(o.id));

    return (
        <Modal
            title={
                mode === 'member' ? 'Add Member' : 'Choose Department Leader'
            }
            onClose={onClose}
            size="max-w-md"
        >
            <div className="p-4">
                <div className="relative mb-3">
                    <Search className="absolute top-1/2 left-3 size-[15px] -translate-y-1/2 text-muted-foreground" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search members..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="input-field pl-9 text-sm"
                    />
                </div>
                <div className="max-h-72 scrollbar-thin divide-y divide-border overflow-y-auto">
                    {!options ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : list.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No available members found
                        </p>
                    ) : (
                        list.map((o) => (
                            <div
                                key={o.id}
                                onClick={() =>
                                    busyId
                                        ? null
                                        : mode === 'member'
                                          ? add(o)
                                          : lead(o)
                                }
                                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50"
                            >
                                <Avatar
                                    photo={o.photo_url}
                                    initials={o.initials}
                                    size="h-9 w-9"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        {o.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {o.department || 'No department'}
                                        {mode === 'leader' && inDept.has(o.id)
                                            ? ' · in this department'
                                            : ''}
                                    </p>
                                </div>
                                {busyId === o.id ? (
                                    <Loader2 className="size-[18px] animate-spin text-primary" />
                                ) : mode === 'member' ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                add(o, true);
                                            }}
                                            title="Add as leader"
                                            className="btn-ghost px-2 py-1 text-xs text-accent hover:bg-accent/10"
                                        >
                                            <Star className="size-3.5" />
                                        </button>
                                        <PlusCircle className="size-[18px] shrink-0 text-primary" />
                                    </>
                                ) : (
                                    <Star className="size-[18px] shrink-0 text-accent" />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */

function ActivityModal({
    deptId,
    onClose,
}: {
    deptId: string;
    onClose: () => void;
}) {
    const form = useForm({
        title: '',
        activity_type: 'meeting',
        activity_date: new Date().toISOString().slice(0, 10),
        location: '',
        attendees_count: 0,
        description: '',
    });

    const save = () =>
        form.post(storeActivity.url(deptId), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: onClose,
        });

    return (
        <Modal
            title="Log Activity"
            onClose={onClose}
            size="max-w-md"
            footer={
                <>
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
                            !form.data.activity_date
                        }
                        className="btn-accent text-sm"
                    >
                        {form.processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        Log Activity
                    </button>
                </>
            }
        >
            <div className="space-y-4 p-6">
                <div>
                    <label className="label-text">
                        Activity Title <span className="text-danger">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Monthly Meeting"
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                        className="input-field"
                    />
                    {form.errors.title && (
                        <p className="error-text">{form.errors.title}</p>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-text">Type</label>
                        <select
                            value={form.data.activity_type}
                            onChange={(e) =>
                                form.setData('activity_type', e.target.value)
                            }
                            className="input-field"
                        >
                            {Object.entries(ACTIVITY_TYPES).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v.label}
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
                            value={form.data.activity_date}
                            onChange={(e) =>
                                form.setData('activity_date', e.target.value)
                            }
                            className="input-field"
                        />
                        {form.errors.activity_date && (
                            <p className="error-text">
                                {form.errors.activity_date}
                            </p>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-text">Location</label>
                        <input
                            type="text"
                            placeholder="e.g. Fellowship Hall"
                            value={form.data.location}
                            onChange={(e) =>
                                form.setData('location', e.target.value)
                            }
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="label-text">Attendees</label>
                        <input
                            type="number"
                            min={0}
                            value={form.data.attendees_count}
                            onChange={(e) =>
                                form.setData(
                                    'attendees_count',
                                    Number(e.target.value),
                                )
                            }
                            className="input-field"
                        />
                    </div>
                </div>
                <div>
                    <label className="label-text">Description</label>
                    <textarea
                        rows={2}
                        placeholder="Brief description..."
                        value={form.data.description}
                        onChange={(e) =>
                            form.setData('description', e.target.value)
                        }
                        className="input-field resize-none"
                    />
                </div>
            </div>
        </Modal>
    );
}

Departments.layout = {
    breadcrumbs: [{ title: 'Departments', href: index() }],
};
