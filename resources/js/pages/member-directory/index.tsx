import { Head, Link, router } from '@inertiajs/react';
import {
    Building2,
    Download,
    Eye,
    LayoutGrid,
    List,
    Search,
    User,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ServerPaginatorCard } from '@/components/ssbcms/Pagination';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import StatusBadge from '@/components/ssbcms/StatusBadge';
import { formatShortDate } from '@/lib/format';
import { exportMethod, index } from '@/routes/member-directory';
import { index as membersIndex } from '@/routes/members';

type DirectoryMember = {
    id: string;
    member_id: string | null;
    first_name: string;
    last_name: string;
    full_name: string;
    initials: string;
    gender: string | null;
    age_group: string | null;
    department: string | null;
    ministry: string | null;
    membership_type: string | null;
    status: string;
    date_joined: string | null;
    city: string | null;
    baptized: boolean;
    photo_url: string | null;
};

type Filters = {
    search: string | null;
    department: string | null;
    age_group: string | null;
    gender: string | null;
    status: string | null;
    baptized: 'yes' | 'no' | null;
};

type Props = {
    members: DirectoryMember[];
    pagination: PageMeta;
    total: number;
    filters: Filters;
    options: {
        departments: string[];
        age_groups: string[];
        statuses: string[];
    };
};

const VIEW_KEY = 'member-directory-view';

function Avatar({
    member,
    className,
    text,
}: {
    member: DirectoryMember;
    className: string;
    text: string;
}) {
    return member.photo_url ? (
        <img
            src={member.photo_url}
            alt=""
            className={`${className} object-cover`}
        />
    ) : (
        <div
            className={`gradient-gold flex items-center justify-center ${className}`}
        >
            <span className={`font-bold text-white ${text}`}>
                {member.initials}
            </span>
        </div>
    );
}

export default function MemberDirectory({
    members,
    pagination,
    total,
    filters,
    options,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    // Server render uses 'grid'; the remembered choice is applied after mount so hydration matches.
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    useEffect(() => {
        try {
            if (localStorage.getItem(VIEW_KEY) === 'list') setViewMode('list');
        } catch {
            /* storage unavailable — keep the default view */
        }
    }, []);
    const [selected, setSelected] = useState<DirectoryMember | null>(null);
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const params = (overrides: Partial<Filters> = {}) => {
        const merged = { ...filters, search: search || null, ...overrides };
        return Object.fromEntries(
            Object.entries(merged).filter(([, v]) => v !== null && v !== ''),
        ) as Record<string, string>;
    };

    const apply = (overrides: Partial<Filters>) =>
        router.get(index.url(), params(overrides), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });

    useEffect(() => {
        if (search === (filters.search ?? '')) return;
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(
            () => apply({ search: search || null }),
            350,
        );
        return () => {
            if (debounce.current) clearTimeout(debounce.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const switchView = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        try {
            localStorage.setItem(VIEW_KEY, mode);
        } catch {
            /* storage unavailable — view just won't be remembered */
        }
    };

    const hasFilters = Boolean(
        filters.department ||
        filters.age_group ||
        filters.gender ||
        filters.status ||
        filters.baptized,
    );

    const select = (key: keyof Filters, value: string) =>
        apply({ [key]: value || null } as Partial<Filters>);

    return (
        <div className="flex flex-1 flex-col p-4 md:p-6">
            <Head title="Member Directory" />

            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Member Directory</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Searchable directory of all church members with privacy
                        controls
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center overflow-hidden rounded-lg border border-border">
                        <button
                            type="button"
                            onClick={() => switchView('grid')}
                            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                            aria-label="Grid view"
                        >
                            <LayoutGrid className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => switchView('list')}
                            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                            aria-label="List view"
                        >
                            <List className="size-4" />
                        </button>
                    </div>
                    <a
                        href={exportMethod.url({ query: params() })}
                        className="btn-outline text-sm"
                    >
                        <Download className="size-4" />
                        Export
                    </a>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="card mb-5 space-y-3 p-4">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by name, member ID, email, or department..."
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
                <div className="flex flex-wrap gap-2">
                    <select
                        className="input-field w-auto py-1.5 text-sm"
                        value={filters.department ?? ''}
                        onChange={(e) => select('department', e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {options.departments.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>
                    <select
                        className="input-field w-auto py-1.5 text-sm"
                        value={filters.age_group ?? ''}
                        onChange={(e) => select('age_group', e.target.value)}
                    >
                        <option value="">All Ages</option>
                        {options.age_groups.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                    <select
                        className="input-field w-auto py-1.5 text-sm"
                        value={filters.gender ?? ''}
                        onChange={(e) => select('gender', e.target.value)}
                    >
                        <option value="">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                    <select
                        className="input-field w-auto py-1.5 text-sm"
                        value={filters.status ?? ''}
                        onChange={(e) => select('status', e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        {options.statuses.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    <select
                        className="input-field w-auto py-1.5 text-sm"
                        value={filters.baptized ?? ''}
                        onChange={(e) => select('baptized', e.target.value)}
                    >
                        <option value="">All (Baptism)</option>
                        <option value="yes">Baptized</option>
                        <option value="no">Not Baptized</option>
                    </select>
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={() =>
                                apply({
                                    department: null,
                                    age_group: null,
                                    gender: null,
                                    status: null,
                                    baptized: null,
                                })
                            }
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                        >
                            <X className="size-3" />
                            Clear Filters
                        </button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    Showing{' '}
                    <span className="font-semibold text-foreground">
                        {pagination.total}
                    </span>{' '}
                    of {total} members
                    {pagination.last_page > 1 && (
                        <>
                            {' '}
                            (page {pagination.current_page} of{' '}
                            {pagination.last_page})
                        </>
                    )}
                </p>
            </div>

            {/* Directory */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {members.map((m) => (
                        <button
                            type="button"
                            key={m.id}
                            onClick={() => setSelected(m)}
                            className="card p-4 text-left transition-all duration-150 hover:border-primary/40 hover:shadow-md"
                        >
                            <div className="flex flex-col items-center gap-2 text-center">
                                <Avatar
                                    member={m}
                                    className="h-14 w-14 rounded-full"
                                    text="text-lg"
                                />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {m.full_name}
                                    </p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {m.member_id || '—'}
                                    </p>
                                </div>
                                <StatusBadge status={m.status} size="sm" />
                                <div className="w-full space-y-1 border-t border-border pt-2">
                                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <Building2 className="size-[11px]" />
                                        {m.department || 'Unassigned'}
                                    </p>
                                    <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <User className="size-[11px]" />
                                        {m.membership_type || '—'}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                    {members.length === 0 && (
                        <div className="card col-span-full p-12 text-center">
                            <Users className="mx-auto mb-3 size-9 text-muted-foreground" />
                            <p className="mb-1 text-base font-semibold text-foreground">
                                No members found
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Try adjusting your search or filters
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="scrollbar-thin overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="border-b border-border">
                                    {[
                                        'Member',
                                        'Member ID',
                                        'Department',
                                        'Ministry',
                                        'Type',
                                        'Status',
                                        'Joined',
                                        '',
                                    ].map((h, i) => (
                                        <th
                                            key={i}
                                            className="table-header text-left"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((m) => (
                                    <tr
                                        key={m.id}
                                        className="table-row transition-colors hover:bg-muted/30"
                                    >
                                        <td className="table-cell">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    member={m}
                                                    className="h-8 w-8 shrink-0 rounded-full"
                                                    text="text-xs"
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {m.full_name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {[m.gender, m.age_group]
                                                            .filter(Boolean)
                                                            .join(' · ') || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="table-cell font-mono text-xs text-muted-foreground">
                                            {m.member_id || '—'}
                                        </td>
                                        <td className="table-cell text-sm">
                                            {m.department || '—'}
                                        </td>
                                        <td className="table-cell text-sm text-muted-foreground">
                                            {m.ministry || '—'}
                                        </td>
                                        <td className="table-cell text-sm">
                                            {m.membership_type || '—'}
                                        </td>
                                        <td className="table-cell">
                                            <StatusBadge
                                                status={m.status}
                                                size="sm"
                                            />
                                        </td>
                                        <td className="table-cell text-sm text-muted-foreground">
                                            {formatShortDate(m.date_joined)}
                                        </td>
                                        <td className="table-cell">
                                            <button
                                                type="button"
                                                onClick={() => setSelected(m)}
                                                className="btn-ghost p-1.5"
                                                aria-label={`View ${m.full_name}`}
                                            >
                                                <Eye className="size-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {members.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="table-cell py-12 text-center"
                                        >
                                            <Users className="mx-auto mb-2 size-7 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">
                                                No members match your filters
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ServerPaginatorCard meta={pagination} />

            {/* Quick view */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setSelected(null)}
                    />
                    <div className="scale-in relative w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
                        <div className="flex items-start gap-4 border-b border-border p-5">
                            <Avatar
                                member={selected}
                                className="h-14 w-14 shrink-0 rounded-2xl"
                                text="text-xl"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-bold text-foreground">
                                        {selected.full_name}
                                    </h2>
                                    <StatusBadge status={selected.status} />
                                </div>
                                <p className="font-mono text-xs text-muted-foreground">
                                    {selected.member_id || '—'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="btn-ghost p-2"
                                aria-label="Close"
                            >
                                <X className="size-[18px]" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 p-5">
                            {[
                                { label: 'Gender', value: selected.gender },
                                {
                                    label: 'Age Group',
                                    value: selected.age_group,
                                },
                                {
                                    label: 'Department',
                                    value: selected.department,
                                },
                                { label: 'Ministry', value: selected.ministry },
                                {
                                    label: 'Membership Type',
                                    value: selected.membership_type,
                                },
                                {
                                    label: 'Date Joined',
                                    value: selected.date_joined
                                        ? formatShortDate(selected.date_joined)
                                        : null,
                                },
                                { label: 'City', value: selected.city },
                                {
                                    label: 'Baptized',
                                    value: selected.baptized ? 'Yes' : 'No',
                                },
                            ].map((f) => (
                                <div key={f.label} className="space-y-0.5">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        {f.label}
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                        {f.value || '—'}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 p-5 pt-0">
                            <Link
                                href={membersIndex.url({
                                    query: {
                                        search:
                                            selected.member_id ||
                                            selected.full_name,
                                    },
                                })}
                                className="btn-primary flex-1 justify-center text-sm"
                            >
                                <User className="size-3.5" />
                                View Full Profile
                            </Link>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="btn-outline text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

MemberDirectory.layout = {
    breadcrumbs: [{ title: 'Member Directory', href: index() }],
};
