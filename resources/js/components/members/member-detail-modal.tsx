import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Pencil, RefreshCw, X } from 'lucide-react';
import StatusBadge from '@/components/ssbcms/StatusBadge';
import { status as statusRoute } from '@/routes/members';
import type { Member, MemberAbilities, MemberStatus } from '@/types';
import MemberAssignmentForm from './member-assignment-form';
import MemberFormModal from './member-form-modal';
import { formatDateTime, formatShortDate } from '@/lib/format';

interface MemberDetailModalProps {
    member: Member;
    can: MemberAbilities;
    onClose: () => void;
}

const tabs = [
    { id: 'tab-overview', label: 'Overview' },
    { id: 'tab-church', label: 'Church Info' },
    { id: 'tab-contact', label: 'Contact & Emergency' },
    { id: 'tab-assign', label: 'Assignments' },
    { id: 'tab-activity', label: 'Activity' },
];

/** "2026-08-16T00:00:00.000000Z" -> "08/16/2026", matching the original UI's date display format. */
const formatDate = (value: string | null) => formatShortDate(value);

export default function MemberDetailModal({
    member,
    can,
    onClose,
}: MemberDetailModalProps) {
    const [activeTab, setActiveTab] = useState('tab-overview');
    const [loading, setLoading] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Only the status is sent — the old version PATCHed the whole record
    // (including computed fields) to the full update endpoint.
    const setStatus = (status: MemberStatus) => {
        setLoading(true);
        router.patch(
            statusRoute.url(member.id),
            { status },
            {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: () =>
                    toast.error(`Could not set this member to ${status}.`),
                onFinish: () => setLoading(false),
            },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="scale-in relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-modal">
                {/* Header */}
                <div className="flex items-start gap-4 border-b border-border p-6">
                    {member.photo_url ? (
                        <img
                            src={member.photo_url}
                            alt={member.full_name}
                            className="h-14 w-14 flex-shrink-0 rounded-full object-cover"
                        />
                    ) : (
                        <div className="gradient-gold flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full">
                            <span className="text-lg font-bold text-white">
                                {member.initials}
                            </span>
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-bold text-foreground">
                                {[
                                    member.first_name,
                                    member.middle_name,
                                    member.last_name,
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                            </h2>
                            <StatusBadge status={member.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                            {[
                                member.member_id || member.reg_ref,
                                member.membership_type,
                                member.date_joined
                                    ? `Joined ${formatDate(member.date_joined)}`
                                    : null,
                            ]
                                .filter(Boolean)
                                .map((part, i) => (
                                    <span
                                        key={i}
                                        className={`text-xs text-muted-foreground ${i === 0 ? 'font-mono' : ''}`}
                                    >
                                        {i > 0 && (
                                            <span className="mr-3">·</span>
                                        )}
                                        {part}
                                    </span>
                                ))}
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                        {can.update &&
                        (member.status === 'Pending' ||
                            member.status === 'Under Review') ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setStatus('Approved')}
                                    disabled={loading}
                                    className="btn-primary px-3 py-1.5 text-xs"
                                >
                                    {loading ? (
                                        <RefreshCw
                                            size={12}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Check size={12} />
                                    )}
                                    Approve
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatus('Rejected')}
                                    disabled={loading}
                                    className="btn-danger px-3 py-1.5 text-xs"
                                >
                                    <X size={12} />
                                    Reject
                                </button>
                            </>
                        ) : null}
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-ghost p-2"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex scrollbar-thin overflow-x-auto border-b border-border px-4">
                    {tabs.map((tab) => (
                        <button
                            type="button"
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 scrollbar-thin overflow-y-auto p-6">
                    {activeTab === 'tab-overview' && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {[
                                {
                                    label: 'Full Name',
                                    value: [
                                        member.first_name,
                                        member.middle_name,
                                        member.last_name,
                                    ]
                                        .filter(Boolean)
                                        .join(' '),
                                },
                                {
                                    label: 'Gender',
                                    value: member.gender || '—',
                                },
                                {
                                    label: 'Date of Birth',
                                    value: formatDate(member.date_of_birth),
                                },
                                {
                                    label: 'Marital Status',
                                    value: member.marital_status || '—',
                                },
                                { label: 'Phone', value: member.phone || '—' },
                                {
                                    label: 'Alt Phone',
                                    value: member.alt_phone || '—',
                                },
                                { label: 'Email', value: member.email || '—' },
                                {
                                    label: 'Occupation',
                                    value: member.occupation || '—',
                                },
                                {
                                    label: 'Employer',
                                    value: member.employer || '—',
                                },
                            ].map((field, i) => (
                                <div
                                    key={`field-overview-${i}`}
                                    className="space-y-0.5"
                                >
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        {field.label}
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                        {field.value}
                                    </p>
                                </div>
                            ))}
                            {member.notes && (
                                <div className="space-y-0.5 md:col-span-2">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        Notes
                                    </p>
                                    <p className="text-sm leading-relaxed text-foreground">
                                        {member.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'tab-church' && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {[
                                {
                                    label: 'Membership Type',
                                    value: member.membership_type || '—',
                                },
                                {
                                    label: 'Date Joined',
                                    value: formatDate(member.date_joined),
                                },
                                {
                                    label: 'Baptized',
                                    value: member.baptized ? 'Yes' : 'No',
                                },
                                {
                                    label: 'Baptism Date',
                                    value: formatDate(member.baptism_date),
                                },
                                {
                                    label: 'Communion Participant',
                                    value: member.communion_participant
                                        ? 'Yes'
                                        : 'No',
                                },
                                {
                                    label: 'Previous Church',
                                    value: member.previous_church || '—',
                                },
                                {
                                    label: 'Previous Denomination',
                                    value: member.previous_denomination || '—',
                                },
                                {
                                    label: 'Department',
                                    value: member.department || 'Unassigned',
                                },
                                {
                                    label: 'Ministry',
                                    value: member.ministry || 'Unassigned',
                                },
                            ].map((field, i) => (
                                <div
                                    key={`field-church-${i}`}
                                    className="space-y-0.5"
                                >
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        {field.label}
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                        {field.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'tab-contact' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    Address
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {[
                                        {
                                            label: 'Street Address',
                                            value: member.address || '—',
                                        },
                                        {
                                            label: 'City',
                                            value: member.city || '—',
                                        },
                                        {
                                            label: 'State / County',
                                            value: member.state || '—',
                                        },
                                        {
                                            label: 'Country',
                                            value: member.country || '—',
                                        },
                                    ].map((field, i) => (
                                        <div
                                            key={`field-addr-${i}`}
                                            className="space-y-0.5"
                                        >
                                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                {field.label}
                                            </p>
                                            <p className="text-sm font-medium text-foreground">
                                                {field.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    Emergency Contact
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {[
                                        {
                                            label: 'Name',
                                            value: member.emergency_name || '—',
                                        },
                                        {
                                            label: 'Phone',
                                            value:
                                                member.emergency_phone || '—',
                                        },
                                        {
                                            label: 'Relationship',
                                            value:
                                                member.emergency_relation ||
                                                '—',
                                        },
                                    ].map((field, i) => (
                                        <div
                                            key={`field-emerg-${i}`}
                                            className="space-y-0.5"
                                        >
                                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                {field.label}
                                            </p>
                                            <p className="text-sm font-medium text-foreground">
                                                {field.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tab-assign' && (
                        <MemberAssignmentForm
                            member={member}
                            canEdit={can.update}
                        />
                    )}

                    {activeTab === 'tab-activity' && (
                        <div className="space-y-2">
                            {[
                                member.reg_ref
                                    ? {
                                          action: 'Registration submitted',
                                          date: member.created_at,
                                          note: `Registration ref: ${member.reg_ref}`,
                                      }
                                    : {
                                          action: 'Member record created',
                                          date: member.created_at,
                                          note: '',
                                      },
                                member.reviewed_at
                                    ? {
                                          action: `Status set to ${member.status}`,
                                          date: member.reviewed_at,
                                          note: '',
                                      }
                                    : null,
                                member.member_id
                                    ? {
                                          action: 'Member ID assigned',
                                          date: null,
                                          note: member.member_id,
                                      }
                                    : null,
                            ]
                                .filter(
                                    (
                                        e,
                                    ): e is {
                                        action: string;
                                        date: string | null;
                                        note: string;
                                    } => e !== null,
                                )
                                .map((log) => (
                                    <div
                                        key={log.action}
                                        className="flex gap-3 rounded-lg bg-muted/30 p-3"
                                    >
                                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {log.action}
                                            </p>
                                            {log.date && (
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDateTime(log.date)}
                                                </p>
                                            )}
                                            {log.note && (
                                                <p className="mt-0.5 text-xs text-muted-foreground italic">
                                                    {log.note}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
                    <div className="flex items-center gap-2">
                        {can.update && (
                            <button
                                type="button"
                                onClick={() => setShowEditModal(true)}
                                className="btn-outline px-3 py-1.5 text-xs"
                            >
                                <Pencil size={12} />
                                Edit Member
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-ghost text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>

            {showEditModal && (
                <MemberFormModal
                    member={member}
                    onClose={() => setShowEditModal(false)}
                    onSaved={onClose}
                />
            )}
        </div>
    );
}
