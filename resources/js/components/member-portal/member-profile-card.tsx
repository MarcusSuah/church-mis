import Icon from '@/components/ssbcms/AppIcon';
import StatusBadge from '@/components/ssbcms/StatusBadge';
import { formatShortDate } from '@/lib/format';
import type { PortalData, PortalMember } from './types';
import { money } from './types';

type Props = {
    member: PortalMember;
    portal: PortalData;
    currency: string;
    onDownloadCertificate: () => void;
    onRequestDocument: () => void;
    onPrayerRequest: () => void;
    onEditProfile: () => void;
};

export default function MemberProfileCard({
    member,
    portal,
    currency,
    onDownloadCertificate,
    onRequestDocument,
    onPrayerRequest,
    onEditProfile,
}: Props) {
    const active = ['Active', 'Approved'].includes(member.status);
    const stats = [
        { id: 'qs-years', label: 'Years', value: portal.stats.years ?? '—' },
        {
            id: 'qs-attend',
            label: 'Attendance',
            value:
                portal.stats.attendance_rate === null
                    ? '—'
                    : `${portal.stats.attendance_rate}%`,
        },
        {
            id: 'qs-giving',
            label: 'Giving YTD',
            value: money(portal.stats.giving_ytd, currency),
        },
    ];

    const actions = [
        {
            id: 'pa-cert',
            icon: 'DocumentArrowDownIcon',
            label: 'Download Certificate',
            variant: 'btn-outline',
            onClick: onDownloadCertificate,
        },
        {
            id: 'pa-doc',
            icon: 'DocumentPlusIcon',
            label: 'Request Document',
            variant: 'btn-outline',
            onClick: onRequestDocument,
        },
        {
            id: 'pa-prayer',
            icon: 'HandRaisedIcon',
            label: 'Submit Prayer Request',
            variant: 'btn-outline',
            onClick: onPrayerRequest,
        },
        {
            id: 'pa-edit',
            icon: 'PencilIcon',
            label: 'Edit Profile',
            variant: 'btn-primary',
            onClick: onEditProfile,
        },
    ];

    return (
        <div className="card p-6">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                {/* Avatar */}
                <div className="relative shrink-0">
                    {member.photo_url ? (
                        <img
                            src={member.photo_url}
                            alt=""
                            className="h-20 w-20 rounded-2xl object-cover shadow-elevated"
                        />
                    ) : (
                        <div className="gradient-gold flex h-20 w-20 items-center justify-center rounded-2xl shadow-elevated">
                            <span className="text-2xl font-bold text-white">
                                {member.initials}
                            </span>
                        </div>
                    )}
                    <div
                        className={`absolute -right-1 -bottom-1 h-5 w-5 rounded-full border-2 border-card ${active ? 'bg-success' : 'bg-warning'}`}
                        title={`${member.status} member`}
                    />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">
                            {member.first_name} {member.last_name}
                        </h2>
                        <StatusBadge status={member.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono text-xs">
                            <Icon name="IdentificationIcon" size={13} />
                            {member.member_id ?? member.reg_ref ?? '—'}
                        </span>
                        {member.department && (
                            <span className="flex items-center gap-1">
                                <Icon name="BuildingOffice2Icon" size={13} />
                                {member.department}
                            </span>
                        )}
                        {member.ministry && (
                            <span className="flex items-center gap-1">
                                <Icon name="MusicalNoteIcon" size={13} />
                                {member.ministry}
                            </span>
                        )}
                        {member.date_joined && (
                            <span className="flex items-center gap-1">
                                <Icon name="CalendarIcon" size={13} />
                                Member since{' '}
                                {formatShortDate(member.date_joined)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Quick stats */}
                <div className="flex shrink-0 items-center gap-4">
                    {stats.map((s) => (
                        <div key={s.id} className="hidden text-center md:block">
                            <p className="text-lg font-bold text-foreground tabular-nums">
                                {s.value}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {s.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                {actions.map((a) => (
                    <button
                        key={a.id}
                        type="button"
                        onClick={a.onClick}
                        className={`${a.variant} px-3 py-2 text-sm`}
                    >
                        <Icon name={a.icon} size={14} />
                        {a.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
