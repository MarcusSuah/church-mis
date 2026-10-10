import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ChevronUp,
    Clock,
    Download,
    Eye,
    FilePlus2,
    Filter,
    MoreVertical,
    Pencil,
    RotateCcw,
    Search,
    Ban,
    Trash2,
    Upload,
    UserPlus,
    Users,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import MemberDetailModal from '@/components/members/member-detail-modal';
import MemberFormModal from '@/components/members/member-form-modal';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import StatusBadge from '@/components/ssbcms/StatusBadge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatShortDate } from '@/lib/format';
import {
    bulkDestroy,
    bulkStatus,
    destroy,
    exportMethod,
    importMethod,
    index,
    status as statusRoute,
} from '@/routes/members';
import { create as publicRegistration } from '@/routes/public-registration';
import type {
    BreadcrumbItem,
    Member,
    MemberAbilities,
    MemberFilters,
    MemberStats,
    MemberStatus,
    Paginated,
} from '@/types';

type Props = {
    members: Paginated<Member>;
    filters: MemberFilters;
    stats: MemberStats;
    statusCounts: Partial<Record<MemberStatus, number>>;
    options: { departments: string[]; membership_types: string[] };
    can: MemberAbilities;
};

const STATUS_TABS = [
    'All',
    'Pending',
    'Under Review',
    'Approved',
    'Active',
    'Suspended',
    'Inactive',
    'Rejected',
] as const;

type BulkAction =
    | 'approve'
    | 'review'
    | 'suspend'
    | 'activate'
    | 'deactivate'
    | 'reject'
    | 'delete';

const BULK_BUTTONS: {
    action: BulkAction | 'export';
    label: string;
    Icon: typeof CheckCircle2;
    cls: string;
    needs: keyof MemberAbilities | null;
}[] = [
    {
        action: 'approve',
        label: 'Approve',
        Icon: CheckCircle2,
        cls: 'text-success border-success/30 hover:bg-success/10',
        needs: 'update',
    },
    {
        action: 'review',
        label: 'Mark Under Review',
        Icon: Eye,
        cls: 'text-info border-info/30 hover:bg-info/10',
        needs: 'update',
    },
    {
        action: 'suspend',
        label: 'Suspend',
        Icon: Ban,
        cls: 'text-danger border-danger/30 hover:bg-danger/10',
        needs: 'update',
    },
    {
        action: 'activate',
        label: 'Activate',
        Icon: RotateCcw,
        cls: 'text-success border-success/30 hover:bg-success/10',
        needs: 'update',
    },
    {
        action: 'delete',
        label: 'Delete',
        Icon: Trash2,
        cls: 'text-danger border-danger/30 hover:bg-danger/10',
        needs: 'delete',
    },
    {
        action: 'export',
        label: 'Export',
        Icon: Download,
        cls: 'text-muted-foreground border-border hover:bg-muted',
        needs: null,
    },
];

const ACTION_PAST: Record<BulkAction, string> = {
    approve: 'approve',
    review: 'mark under review',
    suspend: 'suspend',
    activate: 'activate',
    deactivate: 'deactivate',
    reject: 'reject',
    delete: 'delete',
};

const COLUMNS = [
    { key: 'member_id', label: 'Member ID' },
    { key: 'last_name', label: 'Full Name' },
    { key: 'status', label: 'Status' },
    { key: 'membership_type', label: 'Type' },
    { key: 'department', label: 'Department' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'date_joined', label: 'Date Joined' },
    { key: 'baptized', label: 'Baptized' },
];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Member Management', href: index() },
];

export default function MemberManagementIndex({
    members,
    filters,
    stats,
    statusCounts,
    options,
    can,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [detailMember, setDetailMember] = useState<Member | null>(null);
    // undefined = closed, null = new member, Member = editing
    const [formMember, setFormMember] = useState<Member | null | undefined>(
        () =>
            can.create &&
            typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).has('create')
                ? null
                : undefined,
    );
    const [confirm, setConfirm] = useState<{
        action: BulkAction;
        ids: string[];
        label: string;
    } | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(
        Boolean(
            filters.department || filters.membership_type || filters.baptized,
        ),
    );
    const importInput = useRef<HTMLInputElement>(null);
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const query = (
        overrides: Record<string, string | number | null | undefined> = {},
    ) => {
        const q: Record<string, string | number> = {};
        const merged = {
            search: search || null,
            status: filters.status,
            department: filters.department,
            membership_type: filters.membership_type,
            baptized: filters.baptized,
            sort_col: filters.sort_col,
            sort_dir: filters.sort_dir,
            per_page: filters.per_page,
            ...overrides,
        };
        for (const [k, v] of Object.entries(merged)) {
            if (v === null || v === undefined || v === '') continue;
            if (
                (k === 'status' && v === 'All') ||
                (k === 'per_page' && v === 10)
            )
                continue;
            if (
                k === 'sort_col' &&
                v === 'last_name' &&
                merged.sort_dir === 'asc'
            )
                continue;
            if (
                k === 'sort_dir' &&
                v === 'asc' &&
                merged.sort_col === 'last_name'
            )
                continue;
            q[k] = v;
        }
        return q;
    };

    const visit = (
        overrides: Record<string, string | number | null | undefined> = {},
    ) =>
        router.get(index.url(), query(overrides), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });

    useEffect(() => {
        if (search === (filters.search ?? '')) return;
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(
            () => visit({ search: search || null, page: 1 }),
            350,
        );
        return () => {
            if (debounce.current) clearTimeout(debounce.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => {
        const visible = new Set(members.data.map((m) => m.id));
        setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
    }, [members.data]);

    const toggleSort = (col: string) =>
        visit({
            sort_col: col,
            sort_dir:
                filters.sort_col === col && filters.sort_dir === 'asc'
                    ? 'desc'
                    : 'asc',
        });

    const allSelected =
        members.data.length > 0 && selectedIds.length === members.data.length;
    const toggleSelectAll = () =>
        setSelectedIds(allSelected ? [] : members.data.map((m) => m.id));
    const toggleSelect = (id: string) =>
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    const exportUrl = (ids?: string[]) => {
        const q = query();
        delete q.per_page;
        return exportMethod.url({
            query: { ...q, ...(ids?.length ? { 'ids[]': ids } : {}) },
        });
    };

    const runConfirmed = () => {
        if (!confirm) return;
        setConfirmLoading(true);
        const done = {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedIds((prev) =>
                    prev.filter((id) => !confirm.ids.includes(id)),
                );
                setConfirm(null);
            },
            onError: () => toast.error('That action could not be completed.'),
            onFinish: () => setConfirmLoading(false),
        };

        if (confirm.action === 'delete') {
            if (confirm.ids.length === 1)
                router.delete(destroy.url(confirm.ids[0]), done);
            else router.post(bulkDestroy.url(), { ids: confirm.ids }, done);
        } else {
            router.post(
                bulkStatus.url(),
                { ids: confirm.ids, action: confirm.action },
                done,
            );
        }
    };

    const quickApprove = (member: Member) =>
        router.patch(
            statusRoute.url(member.id),
            { status: 'Approved' },
            { preserveScroll: true },
        );

    const onImport = (file: File | undefined) => {
        if (!file) return;
        router.post(
            importMethod.url(),
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onError: (errors) =>
                    toast.error(errors.file ?? 'Import failed.'),
                onFinish: () => {
                    if (importInput.current) importInput.current.value = '';
                },
            },
        );
    };

    const statCards = [
        {
            label: 'Total Members',
            value: stats.total,
            Icon: Users,
            color: 'text-primary bg-primary/10',
        },
        {
            label: 'Pending Review',
            value: stats.pending + stats.under_review,
            Icon: Clock,
            color: 'text-warning bg-warning/10',
        },
        {
            label: 'Active',
            value: stats.active,
            Icon: CheckCircle2,
            color: 'text-success bg-success/10',
        },
        {
            label: 'Inactive / Suspended',
            value: stats.inactive,
            Icon: AlertCircle,
            color: 'text-danger bg-danger/10',
        },
    ];

    const totalCount = Object.values(statusCounts).reduce(
        (a, b) => a + (b ?? 0),
        0,
    );
    const activeFilterCount = [
        filters.department,
        filters.membership_type,
        filters.baptized,
    ].filter(Boolean).length;
    const canBulk = can.update || can.delete;
    const colCount = COLUMNS.length + 2;

    const SortIcon = ({ col }: { col: string }) => (
        <span className="ml-1 inline-flex flex-col leading-none">
            <ChevronUp
                className={`-mb-1 size-2.5 ${filters.sort_col === col && filters.sort_dir === 'asc' ? 'text-primary' : 'text-border'}`}
            />
            <ChevronDown
                className={`size-2.5 ${filters.sort_col === col && filters.sort_dir === 'desc' ? 'text-primary' : 'text-border'}`}
            />
        </span>
    );

    return (
        <div className="flex flex-1 flex-col p-4 md:p-6">
            <Head title="Member Management" />

            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Member Management</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage registrations, approvals, departments, and member
                        records
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={publicRegistration()}
                        className="btn-outline text-sm"
                    >
                        <FilePlus2 className="size-4" />
                        New Registration
                    </Link>
                    {can.create && (
                        <button
                            type="button"
                            onClick={() => setFormMember(null)}
                            className="btn-accent text-sm"
                        >
                            <UserPlus className="size-4" />
                            Add Member
                        </button>
                    )}
                </div>
            </div>

            {/* Summary stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {statCards.map((stat) => (
                    <div
                        key={stat.label}
                        className="card flex items-center gap-3 p-4"
                    >
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
                        >
                            <stat.Icon className="size-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground tabular-nums">
                                {stat.value.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {stat.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                {/* Pending alert banner */}
                {stats.pending + stats.under_review > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                        <Clock className="size-[18px] shrink-0 text-warning" />
                        <p className="text-sm text-foreground">
                            <span className="font-semibold">
                                {stats.pending} pending
                            </span>{' '}
                            and{' '}
                            <span className="font-semibold">
                                {stats.under_review} under review
                            </span>{' '}
                            registrations require your attention.
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                visit({ status: 'Pending', page: 1 })
                            }
                            className="ml-auto shrink-0 rounded-lg border border-warning/40 px-3 py-1 text-xs font-semibold text-warning transition-colors hover:bg-warning/10"
                        >
                            Review Now
                        </button>
                    </div>
                )}

                {/* Toolbar */}
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex max-w-sm flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <Search className="size-4 shrink-0 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by name, ID, email, phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Clear search"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowFilters((v) => !v)}
                            className={`btn-outline gap-1.5 px-3 py-2 text-xs ${showFilters ? 'bg-secondary' : ''}`}
                        >
                            <Filter className="size-3.5" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                        <a
                            href={exportUrl()}
                            className="btn-outline gap-1.5 px-3 py-2 text-xs"
                        >
                            <Download className="size-3.5" />
                            Export
                        </a>
                        {can.create && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => importInput.current?.click()}
                                    className="btn-outline gap-1.5 px-3 py-2 text-xs"
                                    title="Import a CSV (use Export to get the column layout)"
                                >
                                    <Upload className="size-3.5" />
                                    Import
                                </button>
                                <input
                                    ref={importInput}
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={(e) =>
                                        onImport(e.target.files?.[0])
                                    }
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Filter panel */}
                {showFilters && (
                    <div className="slide-up card grid gap-3 p-4 sm:grid-cols-4">
                        <div>
                            <label className="label-text text-xs">
                                Department
                            </label>
                            <select
                                className="input-field"
                                value={filters.department ?? ''}
                                onChange={(e) =>
                                    visit({
                                        department: e.target.value || null,
                                        page: 1,
                                    })
                                }
                            >
                                <option value="">Any department</option>
                                <option value="Unassigned">Unassigned</option>
                                {options.departments.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-text text-xs">
                                Membership type
                            </label>
                            <select
                                className="input-field"
                                value={filters.membership_type ?? ''}
                                onChange={(e) =>
                                    visit({
                                        membership_type: e.target.value || null,
                                        page: 1,
                                    })
                                }
                            >
                                <option value="">Any type</option>
                                {options.membership_types.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-text text-xs">
                                Baptized
                            </label>
                            <select
                                className="input-field"
                                value={filters.baptized ?? ''}
                                onChange={(e) =>
                                    visit({
                                        baptized: e.target.value || null,
                                        page: 1,
                                    })
                                }
                            >
                                <option value="">Either</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                disabled={activeFilterCount === 0}
                                onClick={() =>
                                    visit({
                                        department: null,
                                        membership_type: null,
                                        baptized: null,
                                        page: 1,
                                    })
                                }
                                className="btn-ghost text-xs disabled:opacity-40"
                            >
                                Clear filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Status filter tabs */}
                <div className="flex scrollbar-thin items-center gap-1 overflow-x-auto pb-1">
                    {STATUS_TABS.map((sf) => {
                        const count =
                            sf === 'All' ? totalCount : (statusCounts[sf] ?? 0);
                        const active = filters.status === sf;
                        if (sf === 'Rejected' && count === 0 && !active)
                            return null;
                        return (
                            <button
                                type="button"
                                key={sf}
                                onClick={() => visit({ status: sf, page: 1 })}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                                    active
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {sf}
                                {count > 0 && (
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                                            active
                                                ? 'bg-white/20 text-white'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Bulk action bar */}
                {selectedIds.length > 0 && (
                    <div className="slide-up flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                        <span className="text-sm font-semibold text-primary">
                            {selectedIds.length} selected
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                            {BULK_BUTTONS.filter(
                                (b) => b.needs === null || can[b.needs],
                            ).map((b) =>
                                b.action === 'export' ? (
                                    <a
                                        key={b.action}
                                        href={exportUrl(selectedIds)}
                                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${b.cls}`}
                                    >
                                        <b.Icon className="size-3.5" />
                                        {b.label}
                                    </a>
                                ) : (
                                    <button
                                        type="button"
                                        key={b.action}
                                        onClick={() =>
                                            setConfirm({
                                                action: b.action as BulkAction,
                                                ids: selectedIds,
                                                label: b.label,
                                            })
                                        }
                                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${b.cls}`}
                                    >
                                        <b.Icon className="size-3.5" />
                                        {b.label}
                                    </button>
                                ),
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                        >
                            Clear
                        </button>
                    </div>
                )}

                {/* Table */}
                <div className="card overflow-hidden">
                    <div className="scrollbar-thin overflow-x-auto">
                        <table className="w-full min-w-[1100px]">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="table-header w-10">
                                        {canBulk && (
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={toggleSelectAll}
                                                className="rounded border-border"
                                                aria-label="Select all"
                                            />
                                        )}
                                    </th>
                                    {COLUMNS.map((col) => (
                                        <th
                                            key={col.key}
                                            className="table-header cursor-pointer text-left whitespace-nowrap transition-colors select-none hover:bg-muted"
                                            onClick={() => toggleSort(col.key)}
                                        >
                                            <span className="flex items-center gap-1">
                                                {col.label}
                                                <SortIcon col={col.key} />
                                            </span>
                                        </th>
                                    ))}
                                    <th className="table-header sticky right-0 bg-card text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.08)]">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={colCount}
                                            className="py-16 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                                    <Users className="size-6 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    No members found
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Try adjusting your search or
                                                    filter criteria
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    members.data.map((member) => {
                                        const awaiting =
                                            member.status === 'Pending' ||
                                            member.status === 'Under Review';
                                        return (
                                            <tr
                                                key={member.id}
                                                className={`group table-row hover:bg-[color-mix(in_oklab,var(--muted)_40%,var(--card))] ${selectedIds.includes(member.id) ? 'bg-primary/5' : ''}`}
                                            >
                                                <td className="table-cell w-10">
                                                    {canBulk && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(
                                                                member.id,
                                                            )}
                                                            onChange={() =>
                                                                toggleSelect(
                                                                    member.id,
                                                                )
                                                            }
                                                            className="rounded border-border"
                                                            aria-label={`Select ${member.full_name}`}
                                                        />
                                                    )}
                                                </td>
                                                <td className="table-cell">
                                                    <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                                                        {member.member_id ||
                                                            member.reg_ref ||
                                                            '—'}
                                                    </span>
                                                </td>
                                                <td className="table-cell">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDetailMember(
                                                                member,
                                                            )
                                                        }
                                                        className="flex items-center gap-2 text-left"
                                                    >
                                                        {member.photo_url ? (
                                                            <img
                                                                src={
                                                                    member.photo_url
                                                                }
                                                                alt=""
                                                                className="h-7 w-7 shrink-0 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="gradient-gold flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                                                                <span className="text-xs font-bold text-white">
                                                                    {
                                                                        member.initials
                                                                    }
                                                                </span>
                                                            </span>
                                                        )}
                                                        <span className="min-w-0">
                                                            <span className="block max-w-[160px] truncate text-sm font-semibold text-foreground hover:underline">
                                                                {
                                                                    member.full_name
                                                                }
                                                            </span>
                                                            <span className="block max-w-[160px] truncate text-xs text-muted-foreground">
                                                                {member.email}
                                                            </span>
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="table-cell whitespace-nowrap">
                                                    <StatusBadge
                                                        status={member.status}
                                                    />
                                                </td>
                                                <td className="table-cell">
                                                    <span className="text-xs text-muted-foreground">
                                                        {member.membership_type ||
                                                            '—'}
                                                    </span>
                                                </td>
                                                <td className="table-cell">
                                                    {member.department ? (
                                                        <span className="text-xs text-foreground">
                                                            {member.department}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">
                                                            Unassigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="table-cell">
                                                    <span className="font-mono-nums text-sm whitespace-nowrap text-foreground">
                                                        {member.phone || '—'}
                                                    </span>
                                                </td>
                                                <td className="table-cell">
                                                    <span className="block max-w-[180px] truncate text-sm text-foreground">
                                                        {member.email || '—'}
                                                    </span>
                                                </td>
                                                <td className="table-cell">
                                                    <span className="font-mono-nums text-sm whitespace-nowrap text-muted-foreground">
                                                        {formatShortDate(
                                                            member.date_joined,
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="table-cell">
                                                    {member.baptized ? (
                                                        <span className="flex items-center gap-1 text-xs font-medium text-success">
                                                            <CheckCircle2 className="size-3.5" />
                                                            Yes
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <XCircle className="size-3.5" />
                                                            No
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="sticky right-0 table-cell bg-card shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.08)] group-hover:bg-[color-mix(in_oklab,var(--muted)_40%,var(--card))]">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDetailMember(
                                                                    member,
                                                                )
                                                            }
                                                            title="View member details"
                                                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <Eye className="size-[15px]" />
                                                        </button>
                                                        {can.update && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setFormMember(
                                                                        member,
                                                                    )
                                                                }
                                                                title="Edit member"
                                                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            >
                                                                <Pencil className="size-[15px]" />
                                                            </button>
                                                        )}
                                                        {can.update &&
                                                            awaiting && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        quickApprove(
                                                                            member,
                                                                        )
                                                                    }
                                                                    title="Approve member"
                                                                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-success/10 hover:text-success"
                                                                >
                                                                    <CheckCircle2 className="size-[15px]" />
                                                                </button>
                                                            )}
                                                        {(can.update ||
                                                            can.delete) && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger
                                                                    asChild
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        title="More actions"
                                                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                    >
                                                                        <MoreVertical className="size-[15px]" />
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent
                                                                    align="end"
                                                                    className="w-44"
                                                                >
                                                                    {can.update && (
                                                                        <>
                                                                            {member.status !==
                                                                                'Active' && (
                                                                                <DropdownMenuItem
                                                                                    onSelect={() =>
                                                                                        setConfirm(
                                                                                            {
                                                                                                action: 'activate',
                                                                                                ids: [
                                                                                                    member.id,
                                                                                                ],
                                                                                                label: 'Activate',
                                                                                            },
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <RotateCcw />{' '}
                                                                                    Activate
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            {awaiting && (
                                                                                <DropdownMenuItem
                                                                                    onSelect={() =>
                                                                                        setConfirm(
                                                                                            {
                                                                                                action: 'reject',
                                                                                                ids: [
                                                                                                    member.id,
                                                                                                ],
                                                                                                label: 'Reject',
                                                                                            },
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <XCircle />{' '}
                                                                                    Reject
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            {member.status !==
                                                                                'Suspended' && (
                                                                                <DropdownMenuItem
                                                                                    onSelect={() =>
                                                                                        setConfirm(
                                                                                            {
                                                                                                action: 'suspend',
                                                                                                ids: [
                                                                                                    member.id,
                                                                                                ],
                                                                                                label: 'Suspend',
                                                                                            },
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Ban />{' '}
                                                                                    Suspend
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            {member.status !==
                                                                                'Inactive' && (
                                                                                <DropdownMenuItem
                                                                                    onSelect={() =>
                                                                                        setConfirm(
                                                                                            {
                                                                                                action: 'deactivate',
                                                                                                ids: [
                                                                                                    member.id,
                                                                                                ],
                                                                                                label: 'Deactivate',
                                                                                            },
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <AlertCircle />{' '}
                                                                                    Mark
                                                                                    Inactive
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {can.delete && (
                                                                        <>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                variant="destructive"
                                                                                onSelect={() =>
                                                                                    setConfirm(
                                                                                        {
                                                                                            action: 'delete',
                                                                                            ids: [
                                                                                                member.id,
                                                                                            ],
                                                                                            label: 'Delete',
                                                                                        },
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Trash2 />{' '}
                                                                                Delete
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
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

                    {/* Pagination */}
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                                {members.total > 0
                                    ? `Showing ${members.from}–${members.to} of ${members.total} members`
                                    : 'Showing 0 members'}
                            </span>
                            <select
                                value={filters.per_page}
                                onChange={(e) =>
                                    visit({
                                        per_page: Number(e.target.value),
                                        page: 1,
                                    })
                                }
                                className="ml-2 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                            >
                                {[10, 25, 50, 100].map((n) => (
                                    <option key={n} value={n}>
                                        {n} per page
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Pager
                            current={members.current_page}
                            last={members.last_page}
                            onPage={(page) => visit({ page })}
                        />
                    </div>
                </div>
            </div>

            {detailMember && (
                <MemberDetailModal
                    member={
                        members.data.find((m) => m.id === detailMember.id) ??
                        detailMember
                    }
                    can={can}
                    onClose={() => setDetailMember(null)}
                />
            )}

            {formMember !== undefined && (
                <MemberFormModal
                    member={formMember}
                    onClose={() => setFormMember(undefined)}
                />
            )}

            <ConfirmModal
                isOpen={confirm !== null}
                onClose={() => setConfirm(null)}
                onConfirm={runConfirmed}
                title={`Confirm ${confirm?.label ?? ''}`}
                message={
                    confirm
                        ? `Are you sure you want to ${ACTION_PAST[confirm.action]} ${confirm.ids.length === 1 ? 'this member' : `${confirm.ids.length} selected members`}?${
                              confirm.action === 'delete'
                                  ? ' This cannot be undone.'
                                  : ''
                          }`
                        : ''
                }
                confirmLabel={`Yes, ${confirm?.label ?? ''}`}
                variant={
                    confirm &&
                    ['reject', 'suspend', 'delete', 'deactivate'].includes(
                        confirm.action,
                    )
                        ? 'danger'
                        : 'info'
                }
                loading={confirmLoading}
            />
        </div>
    );
}

function Pager({
    current,
    last,
    onPage,
}: {
    current: number;
    last: number;
    onPage: (page: number) => void;
}) {
    const btn =
        'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40';
    const start = Math.max(1, Math.min(current - 2, last - 4));
    const pages = Array.from(
        { length: Math.min(5, last) },
        (_, i) => start + i,
    );

    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => onPage(1)}
                disabled={current <= 1}
                className={btn}
                aria-label="First page"
            >
                <ChevronsLeft className="size-3.5" />
            </button>
            <button
                type="button"
                onClick={() => onPage(current - 1)}
                disabled={current <= 1}
                className={btn}
                aria-label="Previous page"
            >
                <ChevronLeft className="size-3.5" />
            </button>
            {pages.map((p) => (
                <button
                    type="button"
                    key={p}
                    onClick={() => onPage(p)}
                    className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                        p === current
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted'
                    }`}
                >
                    {p}
                </button>
            ))}
            <button
                type="button"
                onClick={() => onPage(current + 1)}
                disabled={current >= last}
                className={btn}
                aria-label="Next page"
            >
                <ChevronRight className="size-3.5" />
            </button>
            <button
                type="button"
                onClick={() => onPage(last)}
                disabled={current >= last}
                className={btn}
                aria-label="Last page"
            >
                <ChevronsRight className="size-3.5" />
            </button>
        </div>
    );
}

MemberManagementIndex.layout = { breadcrumbs };
