import { router } from '@inertiajs/react';
import { Check, Eye, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import StatusBadge from '@/components/ssbcms/StatusBadge';
import { display, formatDateTime, formatShortDate } from '@/lib/format';
import { status as statusRoute } from '@/routes/members';
import type { Member, MemberAbilities, MemberStatus } from '@/types';
import MemberAssignmentForm from './member-assignment-form';

const TABS = [
    { id: 'personal', label: 'Personal' },
    { id: 'church', label: 'Church Info' },
    { id: 'emergency', label: 'Emergency & Skills' },
    { id: 'assignment', label: 'Assignment' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type Props = {
    member: Member;
    can: MemberAbilities;
    onClose: () => void;
    onReject: (member: Member) => void;
};

function Field({
    label,
    value,
    wide = false,
}: {
    label: string;
    value: string;
    wide?: boolean;
}) {
    return (
        <div className={`space-y-0.5 ${wide ? 'md:col-span-2' : ''}`}>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            <p className="text-sm font-medium whitespace-pre-line text-foreground">
                {value}
            </p>
        </div>
    );
}

export default function RegistrationDetailPanel({
    member,
    can,
    onClose,
    onReject,
}: Props) {
    const [tab, setTab] = useState<TabId>('personal');
    const [busy, setBusy] = useState<MemberStatus | null>(null);

    // Back to the first tab when a different registration is selected.
    useEffect(() => setTab('personal'), [member.id]);

    const awaiting =
        member.status === 'Pending' || member.status === 'Under Review';

    const setStatus = (status: MemberStatus) => {
        setBusy(status);
        router.patch(
            statusRoute.url(member.id),
            { status },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setBusy(null),
            },
        );
    };

    const fullName = [member.first_name, member.middle_name, member.last_name]
        .filter(Boolean)
        .join(' ');
    const address = [member.address, member.city, member.state]
        .filter(Boolean)
        .join(', ');
    const children = member.family?.children ?? [];

    return (
        <div className="card flex h-full flex-col overflow-hidden fade-in">
            {/* Header */}
            <div className="flex flex-wrap items-start gap-4 border-b border-border p-5">
                {member.photo_url ? (
                    <img
                        src={member.photo_url}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                ) : (
                    <div className="gradient-gold flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
                        <span className="text-lg font-bold text-white">
                            {member.initials}
                        </span>
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground">
                            {fullName}
                        </h2>
                        <StatusBadge status={member.status} />
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {member.reg_ref}
                    </p>
                    {member.member_id && (
                        <p className="font-mono text-xs text-muted-foreground">
                            Member ID: {member.member_id}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Submitted: {formatDateTime(member.created_at)}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {can.update && member.status === 'Pending' && (
                        <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => setStatus('Under Review')}
                            className="btn-outline px-3 py-1.5 text-xs"
                        >
                            {busy === 'Under Review' ? (
                                <Loader2 className="size-3 animate-spin" />
                            ) : (
                                <Eye className="size-3" />
                            )}
                            Mark Under Review
                        </button>
                    )}
                    {can.update && awaiting && (
                        <>
                            <button
                                type="button"
                                disabled={busy !== null}
                                onClick={() => setStatus('Approved')}
                                className="btn-primary px-3 py-1.5 text-xs"
                            >
                                {busy === 'Approved' ? (
                                    <Loader2 className="size-3 animate-spin" />
                                ) : (
                                    <Check className="size-3" />
                                )}
                                Approve
                            </button>
                            <button
                                type="button"
                                disabled={busy !== null}
                                onClick={() => onReject(member)}
                                className="btn-danger px-3 py-1.5 text-xs"
                            >
                                <X className="size-3" />
                                Reject
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-ghost p-2"
                        aria-label="Close details"
                    >
                        <X className="size-[18px]" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex scrollbar-thin overflow-x-auto border-b border-border px-4">
                {TABS.map((t) => (
                    <button
                        type="button"
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                            tab === t.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 scrollbar-thin overflow-y-auto p-5">
                {tab === 'personal' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Full Name" value={fullName} />
                            <Field
                                label="Gender"
                                value={display(member.gender)}
                            />
                            <Field
                                label="Date of Birth"
                                value={formatShortDate(member.date_of_birth)}
                            />
                            <Field
                                label="Phone"
                                value={display(member.phone)}
                            />
                            <Field
                                label="Email"
                                value={display(member.email)}
                            />
                            <Field
                                label="Alternate Phone"
                                value={display(member.alt_phone)}
                            />
                            <Field
                                label="Marital Status"
                                value={display(member.marital_status)}
                            />
                            <Field
                                label="Nationality"
                                value={display(member.nationality)}
                            />
                            <Field
                                label="Occupation"
                                value={display(member.occupation)}
                            />
                            <Field
                                label="Employer"
                                value={display(member.employer)}
                            />
                            <Field label="Address" value={display(address)} />
                            <Field
                                label="Country"
                                value={display(member.country)}
                            />
                        </div>

                        {(member.family?.spouse_name ||
                            children.length > 0) && (
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    Family
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field
                                        label="Spouse"
                                        value={
                                            member.family?.spouse_name
                                                ? `${member.family.spouse_name}${member.family.spouse_is_member ? ' (member of this church)' : ''}`
                                                : '—'
                                        }
                                    />
                                    <Field
                                        label={`Children (${children.length})`}
                                        value={
                                            children.length
                                                ? children
                                                      .map((c) =>
                                                          c.date_of_birth
                                                              ? `${c.name} — ${formatShortDate(c.date_of_birth)}`
                                                              : c.name,
                                                      )
                                                      .join('\n')
                                                : '—'
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'church' && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field
                            label="Membership Type"
                            value={display(member.membership_type)}
                        />
                        <Field
                            label="Date Joined"
                            value={formatShortDate(member.date_joined)}
                        />
                        <Field
                            label="Baptized"
                            value={member.baptized ? 'Yes' : 'No'}
                        />
                        <Field
                            label="Baptism Date"
                            value={formatShortDate(member.baptism_date)}
                        />
                        <Field
                            label="Communion Participant"
                            value={member.communion_participant ? 'Yes' : 'No'}
                        />
                        <Field
                            label="Previous Church"
                            value={display(member.previous_church)}
                        />
                        <Field
                            label="Previous Denomination"
                            value={display(member.previous_denomination)}
                        />
                        <Field
                            label="Ministry Interests"
                            value={display(member.interests)}
                        />
                    </div>
                )}

                {tab === 'emergency' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="mb-3 text-sm font-semibold text-foreground">
                                Emergency Contact
                            </h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="Name"
                                    value={display(member.emergency_name)}
                                />
                                <Field
                                    label="Phone"
                                    value={display(member.emergency_phone)}
                                />
                                <Field
                                    label="Relationship"
                                    value={display(member.emergency_relation)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                label="Skills & Talents"
                                value={display(member.skills)}
                                wide
                            />
                            <Field
                                label="Additional Notes"
                                value={display(member.notes)}
                                wide
                            />
                        </div>
                    </div>
                )}

                {tab === 'assignment' && (
                    <MemberAssignmentForm
                        member={member}
                        canEdit={can.update}
                    />
                )}
            </div>
        </div>
    );
}
