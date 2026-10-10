import { Head, Link, router } from '@inertiajs/react';
import {
    Calendar,
    Check,
    CheckCircle2,
    ClipboardList,
    Clock,
    Download,
    Eye,
    FileText,
    Mail,
    UserPlus,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import RegistrationDetailPanel from '@/components/members/registration-detail-panel';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import { formatLongDate } from '@/lib/format';
import { exportMethod, status as statusRoute } from '@/routes/members';
import { index as pendingRegistrationsIndex } from '@/routes/pending-registrations';
import { create as publicRegistration } from '@/routes/public-registration';
import type { Member, MemberAbilities } from '@/types';

type Tab = 'All' | 'Pending' | 'Under Review' | 'Approved' | 'Rejected';

type Props = {
    registrations: Member[];
    filters: { search: string | null; status: Tab };
    counts: Record<Tab, number>;
    can: MemberAbilities;
};

const TABS: Tab[] = ['All', 'Pending', 'Under Review', 'Approved', 'Rejected'];

const STATUS_TEXT: Record<string, string> = {
    Pending: 'text-warning',
    'Under Review': 'text-info',
    Approved: 'text-success',
    Active: 'text-success',
    Rejected: 'text-danger',
};

const STATUS_DOT: Record<string, string> = {
    Pending: 'bg-warning',
    'Under Review': 'bg-info',
    Approved: 'bg-success',
    Active: 'bg-success',
    Rejected: 'bg-danger',
};

export default function PendingRegistrationsIndex({
    registrations,
    filters,
    counts,
    can,
}: Props) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<Member | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Keep the open panel pointing at the latest data; if the registration
    // left the current tab (e.g. approved while on "Pending"), close it.
    const selected = registrations.find((r) => r.id === selectedId) ?? null;
    useEffect(() => {
        if (selectedId && !selected) setSelectedId(null);
    }, [selectedId, selected]);

    const open = (member: Member) => {
        setSelectedId(member.id);
        // On narrow screens the panel is below the list — bring it into view.
        if (window.matchMedia('(max-width: 1023px)').matches) {
            setTimeout(
                () =>
                    panelRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    }),
                50,
            );
        }
    };

    const switchTab = (tab: Tab) => {
        router.get(
            pendingRegistrationsIndex.url(),
            tab === 'Pending' ? {} : { status: tab },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const changeStatus = (
        member: Member,
        status: 'Approved' | 'Rejected',
        after?: () => void,
    ) => {
        setBusyId(member.id);
        router.patch(
            statusRoute.url(member.id),
            { status },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => after?.(),
                onError: () =>
                    toast.error(
                        `Could not ${status === 'Approved' ? 'approve' : 'reject'} this registration.`,
                    ),
                onFinish: () => setBusyId(null),
            },
        );
    };

    const stats = [
        {
            label: 'Total Submissions',
            value: counts.All,
            Icon: FileText,
            color: 'text-foreground',
        },
        {
            label: 'Pending Review',
            value: counts.Pending,
            Icon: Clock,
            color: 'text-warning',
        },
        {
            label: 'Under Review',
            value: counts['Under Review'],
            Icon: Eye,
            color: 'text-foreground',
        },
        {
            label: 'Approved',
            value: counts.Approved,
            Icon: CheckCircle2,
            color: 'text-success',
        },
    ];

    const exportUrl = exportMethod.url({
        query: {
            registrations: 1,
            ...(filters.status !== 'All' ? { status: filters.status } : {}),
        },
    });

    return (
        <div className="flex flex-1 flex-col p-4 md:p-6">
            <Head title="Pending Registrations" />

            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Pending Registrations</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Review, approve, or reject new member registration
                        applications
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a href={exportUrl} className="btn-outline text-sm">
                        <Download className="size-4" />
                        Export
                    </a>
                    <Link
                        href={publicRegistration()}
                        className="btn-accent text-sm"
                    >
                        <UserPlus className="size-4" />
                        New Registration
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {stats.map((s) => (
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

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(340px,420px)_1fr]">
                {/* List */}
                <div className="flex min-h-0 flex-col">
                    <div className="mb-3 flex scrollbar-thin items-center gap-1 overflow-x-auto pb-2">
                        {TABS.map((tab) => {
                            const active = filters.status === tab;
                            return (
                                <button
                                    type="button"
                                    key={tab}
                                    onClick={() => switchTab(tab)}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                                        active
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    {tab}
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                                            active
                                                ? 'bg-white/20 text-white'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {counts[tab]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="scrollbar-thin space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-320px)]">
                        {registrations.length > 0 &&
                            counts[filters.status] > registrations.length && (
                                <p className="px-1 text-xs text-muted-foreground">
                                    Showing the newest {registrations.length} of{' '}
                                    {counts[filters.status].toLocaleString()}.
                                    Use search to find a specific registration.
                                </p>
                            )}

                        {registrations.length === 0 && (
                            <div className="card flex flex-col items-center gap-2 p-10 text-center">
                                <ClipboardList className="size-6 text-muted-foreground" />
                                <p className="text-sm font-semibold text-foreground">
                                    No registrations here
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {filters.status === 'Pending'
                                        ? 'Nothing is waiting for review right now.'
                                        : `No ${filters.status.toLowerCase()} registrations.`}
                                </p>
                            </div>
                        )}

                        {registrations.map((r) => {
                            const isSelected = r.id === selectedId;
                            const awaiting =
                                r.status === 'Pending' ||
                                r.status === 'Under Review';
                            const busy = busyId === r.id;
                            return (
                                <div
                                    key={r.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => open(r)}
                                    onKeyDown={(e) =>
                                        (e.key === 'Enter' || e.key === ' ') &&
                                        open(r)
                                    }
                                    className={`cursor-pointer rounded-xl border bg-card p-4 transition-all ${
                                        isSelected
                                            ? 'border-2 border-foreground shadow-sm'
                                            : 'border-border hover:border-primary/40 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {r.photo_url ? (
                                            <img
                                                src={r.photo_url}
                                                alt=""
                                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="gradient-gold flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                                                <span className="text-sm font-bold text-white">
                                                    {r.initials}
                                                </span>
                                            </span>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="truncate text-sm font-semibold text-foreground">
                                                    {r.full_name}
                                                </p>
                                                <span
                                                    className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${STATUS_TEXT[r.status] ?? 'text-muted-foreground'}`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status] ?? 'bg-muted-foreground'}`}
                                                    />
                                                    {r.status}
                                                </span>
                                            </div>
                                            <p className="font-mono text-xs text-muted-foreground">
                                                {r.reg_ref}
                                            </p>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                {r.email && (
                                                    <span className="flex min-w-0 items-center gap-1">
                                                        <Mail className="size-3 shrink-0" />
                                                        <span className="max-w-[150px] truncate">
                                                            {r.email}
                                                        </span>
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="size-3" />
                                                    {formatLongDate(
                                                        r.created_at,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {can.update && awaiting ? (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() =>
                                                        changeStatus(
                                                            r,
                                                            'Approved',
                                                        )
                                                    }
                                                    className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/10 disabled:opacity-50"
                                                >
                                                    <Check className="size-3.5" />
                                                    Approve
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => open(r)}
                                                    className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                                >
                                                    <Eye className="size-3.5" />
                                                    Review
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() =>
                                                        setRejecting(r)
                                                    }
                                                    className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                                                >
                                                    <X className="size-3.5" />
                                                    Reject
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => open(r)}
                                                className="col-span-3 flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                            >
                                                <Eye className="size-3.5" />
                                                View Details
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Detail panel */}
                <div
                    ref={panelRef}
                    className="min-h-[420px] lg:sticky lg:top-4 lg:max-h-[calc(100vh-260px)] lg:self-start"
                >
                    {selected ? (
                        <RegistrationDetailPanel
                            member={selected}
                            can={can}
                            onClose={() => setSelectedId(null)}
                            onReject={setRejecting}
                        />
                    ) : (
                        <div className="card flex h-full min-h-[420px] flex-col items-center justify-center gap-3 p-10 text-center lg:min-h-[calc(100vh-320px)]">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                                <ClipboardList className="size-7 text-muted-foreground" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">
                                Select a Registration
                            </h3>
                            <p className="max-w-xs text-sm text-muted-foreground">
                                Click on any registration from the list to view
                                full details and take action.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={rejecting !== null}
                onClose={() => setRejecting(null)}
                onConfirm={() =>
                    rejecting &&
                    changeStatus(rejecting, 'Rejected', () =>
                        setRejecting(null),
                    )
                }
                title="Reject Registration"
                message={
                    rejecting
                        ? `Reject ${rejecting.full_name}'s registration (${rejecting.reg_ref})? You can still find it under the Rejected tab.`
                        : ''
                }
                confirmLabel="Yes, Reject"
                variant="danger"
                loading={rejecting !== null && busyId === rejecting.id}
            />
        </div>
    );
}

PendingRegistrationsIndex.layout = {
    breadcrumbs: [
        { title: 'Pending Registrations', href: pendingRegistrationsIndex() },
    ],
};
