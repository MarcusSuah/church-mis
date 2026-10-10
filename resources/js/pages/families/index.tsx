import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Crown,
    Download,
    ExternalLink,
    Heart,
    House,
    MapPin,
    MoreVertical,
    Pencil,
    Plus,
    Search,
    Trash2,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    AddFamilyModal,
    EditFamilyModal,
    FamilyMemberModal,
} from '@/components/families/family-modals';
import type {
    FamilyPerson,
    FamilyRecord,
} from '@/components/families/family-modals';
import type { MemberOption } from '@/components/families/member-picker';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import StatusBadge from '@/components/ssbcms/StatusBadge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatLongDate, formatShortDate } from '@/lib/format';
import { exportMethod, index } from '@/routes/families';
import {
    destroy as removeFamilyMember,
    head as makeHeadRoute,
} from '@/routes/families/members';
import { index as membersIndex } from '@/routes/members';
import type { MemberAbilities } from '@/types';

type Props = {
    families: FamilyRecord[];
    filters: { search: string | null };
    stats: { total: number; active: number; members: number; children: number };
    roles: string[];
    memberOptions?: MemberOption[];
    can: MemberAbilities;
};

const ROLE_COLORS: Record<string, string> = {
    'Head of Household': 'text-primary bg-primary/10',
    Spouse: 'text-accent bg-accent/10',
    Child: 'text-info bg-info/10',
    Dependent: 'text-muted-foreground bg-muted',
    Relative: 'text-muted-foreground bg-muted',
};

export default function FamilyManagement({
    families,
    filters,
    stats,
    roles,
    memberOptions,
    can,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [editingFamily, setEditingFamily] = useState(false);
    const [personModal, setPersonModal] = useState<{
        person: FamilyPerson | null;
    } | null>(null);
    const [removing, setRemoving] = useState<FamilyPerson | null>(null);
    const [busy, setBusy] = useState(false);
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const detailRef = useRef<HTMLDivElement>(null);

    const selected = families.find((f) => f.id === selectedId) ?? null;

    useEffect(() => {
        if (search === (filters.search ?? '')) return;
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(
            () =>
                router.get(index.url(), search ? { search } : {}, {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }),
            350,
        );
        return () => {
            if (debounce.current) clearTimeout(debounce.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Pickers need the list of members without a family — fetch it only when a modal opens.
    const loadMemberOptions = () => router.reload({ only: ['memberOptions'] });

    const openAdd = () => {
        setShowAdd(true);
        loadMemberOptions();
    };

    const openPerson = (person: FamilyPerson | null) => {
        setPersonModal({ person });
        loadMemberOptions();
    };

    const select = (id: string) => {
        setSelectedId(id);
        if (window.matchMedia('(max-width: 1023px)').matches) {
            setTimeout(
                () =>
                    detailRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    }),
                50,
            );
        }
    };

    const makeHead = (person: FamilyPerson) => {
        if (!selected) return;
        router.post(
            makeHeadRoute.url([selected.id, person.id]),
            {},
            { preserveScroll: true },
        );
    };

    const confirmRemove = () => {
        if (!selected || !removing) return;
        setBusy(true);
        router.delete(removeFamilyMember.url([selected.id, removing.id]), {
            preserveScroll: true,
            onSuccess: () => setRemoving(null),
            onError: (errors) => {
                toast.error(errors.member ?? 'Could not remove this person.');
                setRemoving(null);
            },
            onFinish: () => setBusy(false),
        });
    };

    const statCards = [
        {
            label: 'Total Families',
            value: stats.total,
            Icon: House,
            color: 'text-primary bg-primary/10',
        },
        {
            label: 'Active Families',
            value: stats.active,
            Icon: CheckCircle2,
            color: 'text-success bg-success/10',
        },
        {
            label: 'Total Members',
            value: stats.members,
            Icon: Users,
            color: 'text-accent bg-accent/10',
        },
        {
            label: 'Children',
            value: stats.children,
            Icon: Heart,
            color: 'text-info bg-info/10',
        },
    ];

    return (
        <div className="flex flex-1 flex-col p-4 md:p-6">
            <Head title="Family Management" />

            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Family Management</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage church families, household relationships, and
                        family records
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={exportMethod.url()}
                        className="btn-outline text-sm"
                    >
                        <Download className="size-4" />
                        Export
                    </a>
                    {can.update && (
                        <button
                            type="button"
                            onClick={openAdd}
                            className="btn-accent text-sm"
                        >
                            <Plus className="size-4" />
                            Add Family
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {statCards.map((s) => (
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

            <div className="flex flex-col gap-5 lg:flex-row">
                {/* Left: family list */}
                <div className="shrink-0 space-y-3 lg:w-[380px]">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <Search className="size-4 shrink-0 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search families or members..."
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

                    <div className="scrollbar-thin space-y-2 lg:max-h-[calc(100vh-300px)] lg:overflow-y-auto lg:pr-1">
                        {families.length === 0 && (
                            <div className="card p-8 text-center">
                                <House className="mx-auto mb-2 size-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    {filters.search
                                        ? 'No families match your search'
                                        : 'No families yet'}
                                </p>
                            </div>
                        )}
                        {families.map((fam) => (
                            <button
                                type="button"
                                key={fam.id}
                                onClick={() => select(fam.id)}
                                className={`card w-full p-4 text-left transition-all duration-150 hover:shadow-md ${
                                    selectedId === fam.id
                                        ? 'border-2 border-foreground'
                                        : 'hover:border-primary/40'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="gradient-navy flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                                        <span className="text-sm font-bold text-white">
                                            {fam.initials}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-0.5 flex items-center justify-between gap-2">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {fam.family_name}
                                            </p>
                                            <StatusBadge
                                                status={fam.status}
                                                size="sm"
                                            />
                                        </div>
                                        <p className="truncate text-xs text-muted-foreground">
                                            Head: {fam.head_name || '—'}
                                        </p>
                                        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Users className="size-[11px]" />
                                                {fam.member_count}{' '}
                                                {fam.member_count === 1
                                                    ? 'member'
                                                    : 'members'}
                                            </span>
                                            {fam.city && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="size-[11px]" />
                                                    {fam.city}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: details */}
                <div ref={detailRef} className="min-w-0 flex-1">
                    {selected ? (
                        <div className="slide-up space-y-4">
                            {/* Family header */}
                            <div className="card p-5">
                                <div className="flex items-start gap-4">
                                    <div className="gradient-navy flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl">
                                        <span className="text-xl font-bold text-white">
                                            {selected.initials}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl font-bold text-foreground">
                                                {selected.family_name}
                                            </h2>
                                            <StatusBadge
                                                status={selected.status}
                                            />
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                                            {[
                                                {
                                                    label: 'Head of Household',
                                                    value:
                                                        selected.head_name ||
                                                        '—',
                                                },
                                                {
                                                    label: 'Address',
                                                    value:
                                                        [
                                                            selected.city,
                                                            selected.state,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(', ') || '—',
                                                },
                                                {
                                                    label: 'Phone',
                                                    value:
                                                        selected.phone || '—',
                                                },
                                                {
                                                    label: 'Since',
                                                    value: formatLongDate(
                                                        selected.created_at,
                                                    ),
                                                },
                                            ].map((f) => (
                                                <div key={f.label}>
                                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        {f.label}
                                                    </p>
                                                    <p className="mt-0.5 text-sm font-medium text-foreground">
                                                        {f.value}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        {can.update && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditingFamily(true)
                                                }
                                                className="btn-outline text-sm"
                                            >
                                                <Pencil className="size-3.5" />
                                                Edit
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(null)}
                                            className="btn-ghost p-2"
                                            aria-label="Close details"
                                        >
                                            <X className="size-[18px]" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Members */}
                            <div className="card p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="section-header">
                                        Family Members (
                                        {selected.members.length})
                                    </h3>
                                    {can.update && (
                                        <button
                                            type="button"
                                            onClick={() => openPerson(null)}
                                            className="btn-outline text-sm"
                                        >
                                            <UserPlus className="size-3.5" />
                                            Add Member
                                        </button>
                                    )}
                                </div>
                                {selected.members.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                        No one in this household yet.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {selected.members.map((p) => (
                                            <div
                                                key={p.id}
                                                className="flex items-center gap-4 rounded-xl border border-border p-3 transition-colors hover:bg-muted/30"
                                            >
                                                {p.photo_url ? (
                                                    <img
                                                        src={p.photo_url}
                                                        alt=""
                                                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="gradient-gold flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                                                        <span className="text-sm font-bold text-white">
                                                            {p.initials}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {p.name}
                                                        </p>
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[p.role] ?? 'bg-muted text-muted-foreground'}`}
                                                        >
                                                            {p.role}
                                                        </span>
                                                        {p.status ? (
                                                            <StatusBadge
                                                                status={
                                                                    p.status
                                                                }
                                                                size="sm"
                                                            />
                                                        ) : (
                                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                                                Not a member
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                        {p.member_code && (
                                                            <span className="font-mono">
                                                                {p.member_code}
                                                            </span>
                                                        )}
                                                        {p.phone && (
                                                            <span>
                                                                {p.phone}
                                                            </span>
                                                        )}
                                                        {p.date_of_birth && (
                                                            <span>
                                                                DOB:{' '}
                                                                {formatShortDate(
                                                                    p.date_of_birth,
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    {p.member_id && (
                                                        <Link
                                                            href={membersIndex.url(
                                                                {
                                                                    query: {
                                                                        search:
                                                                            p.member_code ||
                                                                            p.name,
                                                                    },
                                                                },
                                                            )}
                                                            className="btn-ghost p-1.5"
                                                            title="Open member record"
                                                        >
                                                            <ExternalLink className="size-3.5" />
                                                        </Link>
                                                    )}
                                                    {can.update && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="btn-ghost p-1.5"
                                                                    aria-label="More actions"
                                                                >
                                                                    <MoreVertical className="size-3.5" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                align="end"
                                                                className="w-52"
                                                            >
                                                                <DropdownMenuItem
                                                                    onSelect={() =>
                                                                        openPerson(
                                                                            p,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil />{' '}
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                {p.role !==
                                                                    'Head of Household' && (
                                                                    <DropdownMenuItem
                                                                        onSelect={() =>
                                                                            makeHead(
                                                                                p,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Crown />{' '}
                                                                        Make
                                                                        Head of
                                                                        Household
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    variant="destructive"
                                                                    onSelect={() =>
                                                                        setRemoving(
                                                                            p,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 />{' '}
                                                                    Remove from
                                                                    Family
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Address & contact */}
                            <div className="card p-5">
                                <h3 className="section-header mb-4">
                                    Address & Contact
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {[
                                        {
                                            label: 'Street Address',
                                            value: selected.address,
                                        },
                                        { label: 'City', value: selected.city },
                                        {
                                            label: 'State / County',
                                            value: selected.state,
                                        },
                                        {
                                            label: 'Country',
                                            value: selected.country,
                                        },
                                        {
                                            label: 'Phone',
                                            value: selected.phone,
                                        },
                                        {
                                            label: 'Email',
                                            value: selected.email,
                                        },
                                    ].map((f) => (
                                        <div
                                            key={f.label}
                                            className="space-y-0.5"
                                        >
                                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                {f.label}
                                            </p>
                                            <p className="text-sm font-medium text-foreground">
                                                {f.value || '—'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                {selected.notes && (
                                    <div className="mt-4 border-t border-border pt-4">
                                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Notes
                                        </p>
                                        <p className="mt-0.5 text-sm whitespace-pre-line text-foreground">
                                            {selected.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="card flex h-full min-h-[420px] flex-col items-center justify-center p-12 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                                <House className="size-7 text-muted-foreground" />
                            </div>
                            <h3 className="mb-1 text-base font-semibold text-foreground">
                                Select a Family
                            </h3>
                            <p className="max-w-xs text-sm text-muted-foreground">
                                Click on any family from the list to view
                                household details and manage family members.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showAdd && (
                <AddFamilyModal
                    memberOptions={memberOptions}
                    onClose={() => setShowAdd(false)}
                    onCreated={(id) => setSelectedId(id)}
                />
            )}

            {editingFamily && selected && (
                <EditFamilyModal
                    family={selected}
                    canDelete={can.delete}
                    onClose={() => setEditingFamily(false)}
                    onDeleted={() => setSelectedId(null)}
                />
            )}

            {personModal && selected && (
                <FamilyMemberModal
                    family={selected}
                    person={personModal.person}
                    roles={roles}
                    memberOptions={memberOptions}
                    onClose={() => setPersonModal(null)}
                />
            )}

            <ConfirmModal
                isOpen={removing !== null}
                onClose={() => setRemoving(null)}
                onConfirm={confirmRemove}
                title="Remove from Family"
                message={
                    removing
                        ? `Remove ${removing.name} from ${selected?.family_name}? Their member record (if any) is kept.`
                        : ''
                }
                confirmLabel="Yes, Remove"
                variant="danger"
                loading={busy}
            />
        </div>
    );
}

FamilyManagement.layout = {
    breadcrumbs: [{ title: 'Family Management', href: index() }],
};
