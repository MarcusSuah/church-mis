import { Link, useForm } from '@inertiajs/react';
import Icon from '@/components/ssbcms/AppIcon';
import { PdfButton } from '@/components/ssbcms/PdfViewer';
import StatusBadge from '@/components/ssbcms/StatusBadge';
import { formatLongDate, formatShortDate, formatTime } from '@/lib/format';
import {
    document as documentRoute,
    givingStatement,
    prayer as prayerRoute,
    update as updateProfile,
} from '@/routes/member/portal';
import type {
    PortalData,
    PortalMember,
    PortalOptions,
    PortalTab,
} from './types';
import { money } from './types';

const TABS: { id: PortalTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'HomeIcon' },
    { id: 'profile', label: 'My Profile', icon: 'UserIcon' },
    { id: 'attendance', label: 'Attendance', icon: 'CalendarDaysIcon' },
    { id: 'giving', label: 'Giving', icon: 'BanknotesIcon' },
    { id: 'prayer', label: 'Prayer Requests', icon: 'HandRaisedIcon' },
    { id: 'documents', label: 'Documents', icon: 'DocumentTextIcon' },
];

const ATTENDANCE_STYLE: Record<
    string,
    { label: string; cls: string; icon: string }
> = {
    present: { label: 'Present', cls: 'text-success', icon: 'CheckCircleIcon' },
    late: { label: 'Late', cls: 'text-warning', icon: 'ClockIcon' },
    excused: { label: 'Excused', cls: 'text-info', icon: 'MinusCircleIcon' },
    absent: { label: 'Absent', cls: 'text-danger', icon: 'XCircleIcon' },
};

export type PortalTabsProps = {
    member: PortalMember;
    portal: PortalData;
    options: PortalOptions;
    currency: string;
    activeTab: PortalTab;
    setActiveTab: (t: PortalTab) => void;
    editingProfile: boolean;
    setEditingProfile: (v: boolean) => void;
    showPrayerForm: boolean;
    setShowPrayerForm: (v: boolean) => void;
    docRequestModal: boolean;
    setDocRequestModal: (v: boolean) => void;
    /** Pre-selected document type when the request modal opens. */
    docType?: string;
};

const field = (
    label: string,
    value: string | null | undefined,
    mono = false,
) => ({ label, value: value || '—', mono });

export default function PortalTabs(props: PortalTabsProps) {
    const { member, portal, currency, activeTab, setActiveTab } = props;
    const attended = portal.stats.attendance_present;
    const total = portal.stats.attendance_total;

    return (
        <div>
            {/* Tabs */}
            <div className="mb-6 flex scrollbar-thin items-center gap-1 overflow-x-auto border-b border-border">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                            activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Icon name={tab.icon} size={15} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="slide-up space-y-6">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[
                            {
                                id: 'ps-attend',
                                label: 'Services Attended',
                                value: `${attended}/${total}`,
                                icon: 'CalendarDaysIcon',
                                color: 'text-primary bg-primary/10',
                            },
                            {
                                id: 'ps-giving',
                                label: 'Giving (Last 30 days)',
                                value: money(
                                    portal.stats.giving_30_days,
                                    currency,
                                ),
                                icon: 'BanknotesIcon',
                                color: 'text-success bg-success/10',
                            },
                            {
                                id: 'ps-dept',
                                label: 'Department',
                                value: member.department || '—',
                                icon: 'BuildingOffice2Icon',
                                color: 'text-accent bg-accent/10',
                            },
                            {
                                id: 'ps-prayer',
                                label: 'Prayer Requests',
                                value: String(portal.prayer_requests.length),
                                icon: 'HandRaisedIcon',
                                color: 'text-info bg-info/10',
                            },
                        ].map((s) => (
                            <div
                                key={s.id}
                                className="card flex items-center gap-3 p-4"
                            >
                                <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.color}`}
                                >
                                    <Icon name={s.icon} size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-base font-bold text-foreground tabular-nums">
                                        {s.value}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {s.label}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <div className="card p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="section-header">
                                    Announcements
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {portal.announcements.length} active
                                </span>
                            </div>
                            {portal.announcements.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    No announcements right now.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {portal.announcements
                                        .slice(0, 3)
                                        .map((a) => (
                                            <div
                                                key={a.id}
                                                className={`rounded-xl border p-3 transition-colors hover:bg-muted/30 ${a.urgent ? 'border-warning/40 bg-warning/5' : 'border-border'}`}
                                            >
                                                <div className="mb-1 flex items-start justify-between gap-2">
                                                    <h4 className="text-sm leading-snug font-semibold text-foreground">
                                                        {a.title}
                                                    </h4>
                                                    {a.urgent && (
                                                        <span className="shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                                                            Urgent
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                                    {a.body}
                                                </p>
                                                <p className="mt-1.5 text-xs text-muted-foreground">
                                                    {formatLongDate(a.date)}
                                                </p>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        <div className="card p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="section-header">
                                    Upcoming Events
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {portal.events.length}{' '}
                                    {portal.events.length === 1
                                        ? 'event'
                                        : 'events'}
                                </span>
                            </div>
                            {portal.events.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    No upcoming events.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {portal.events.map((ev) => {
                                        const d = ev.start
                                            ? new Date(ev.start)
                                            : null;
                                        return (
                                            <div
                                                key={ev.id}
                                                className="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/30"
                                            >
                                                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10">
                                                    <span className="text-xs leading-none font-bold text-primary">
                                                        {d ? d.getDate() : '—'}
                                                    </span>
                                                    <span className="text-xs leading-none text-primary/70">
                                                        {d
                                                            ? d.toLocaleDateString(
                                                                  'en-US',
                                                                  {
                                                                      month: 'short',
                                                                  },
                                                              )
                                                            : ''}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-foreground">
                                                        {ev.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {d
                                                            ? d.toLocaleTimeString(
                                                                  'en-US',
                                                                  {
                                                                      hour: 'numeric',
                                                                      minute: '2-digit',
                                                                  },
                                                              )
                                                            : ''}
                                                        {ev.location
                                                            ? ` · ${ev.location}`
                                                            : ''}
                                                    </p>
                                                </div>
                                                {ev.category && (
                                                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                        {ev.category}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'profile' && <ProfileTab {...props} />}

            {activeTab === 'attendance' && (
                <div className="slide-up space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            {
                                id: 'p',
                                label: 'Present',
                                value: attended,
                                color: 'text-success bg-success/10',
                            },
                            {
                                id: 'a',
                                label: 'Absent',
                                value: total - attended,
                                color: 'text-danger bg-danger/10',
                            },
                            {
                                id: 'r',
                                label: 'Rate',
                                value: total
                                    ? `${Math.round((attended / total) * 100)}%`
                                    : '—',
                                color: 'text-primary bg-primary/10',
                            },
                        ].map((s) => (
                            <div
                                key={s.id}
                                className={`card border-0 p-4 text-center ${s.color}`}
                            >
                                <p className="text-2xl font-bold tabular-nums">
                                    {s.value}
                                </p>
                                <p className="mt-0.5 text-xs font-medium">
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="card overflow-hidden">
                        <div className="border-b border-border px-4 py-3">
                            <div className="grid grid-cols-4 gap-4">
                                {['Service', 'Date', 'Time', 'Status'].map(
                                    (h) => (
                                        <span
                                            key={h}
                                            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                        >
                                            {h}
                                        </span>
                                    ),
                                )}
                            </div>
                        </div>
                        {portal.attendance.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">
                                No attendance has been recorded for you yet.
                            </p>
                        ) : (
                            portal.attendance.map((r) => {
                                const st =
                                    ATTENDANCE_STYLE[r.status] ??
                                    ATTENDANCE_STYLE.absent;
                                return (
                                    <div
                                        key={r.id}
                                        className="grid grid-cols-4 gap-4 border-b border-border px-4 py-3 text-sm transition-colors last:border-0 hover:bg-muted/30"
                                    >
                                        <span className="truncate font-medium text-foreground">
                                            {r.service}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {formatLongDate(r.date)}
                                        </span>
                                        <span className="font-mono text-muted-foreground">
                                            {r.time ? formatTime(r.time) : '—'}
                                        </span>
                                        <span
                                            className={`flex items-center gap-1.5 font-medium ${st.cls}`}
                                        >
                                            <Icon name={st.icon} size={14} />
                                            {st.label}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'giving' && (
                <div className="slide-up space-y-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {[
                            {
                                id: 'ytd',
                                label: 'Total YTD',
                                value: money(portal.stats.giving_ytd, currency),
                                icon: 'BanknotesIcon',
                                color: 'text-success bg-success/10',
                            },
                            {
                                id: 'tithes',
                                label: 'Tithes',
                                value: money(
                                    portal.stats.giving_ytd_tithes,
                                    currency,
                                ),
                                icon: 'CurrencyDollarIcon',
                                color: 'text-primary bg-primary/10',
                            },
                            {
                                id: 'other',
                                label: 'Offerings & Special',
                                value: money(
                                    portal.stats.giving_ytd_other,
                                    currency,
                                ),
                                icon: 'HeartIcon',
                                color: 'text-accent bg-accent/10',
                            },
                        ].map((s) => (
                            <div
                                key={s.id}
                                className="card flex items-center gap-3 p-4"
                            >
                                <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.color}`}
                                >
                                    <Icon name={s.icon} size={18} />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-foreground tabular-nums">
                                        {s.value}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {s.label}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="card overflow-hidden">
                        <div className="flex items-center justify-between border-b border-border px-4 py-3">
                            <h3 className="text-sm font-semibold text-foreground">
                                Giving History
                            </h3>
                            <PdfButton
                                url={givingStatement.url()}
                                title="Annual giving statement"
                                download
                                className="btn-outline px-3 py-1.5 text-xs"
                            >
                                <Icon name="ArrowDownTrayIcon" size={12} />
                                Download Statement
                            </PdfButton>
                        </div>
                        <div className="scrollbar-thin overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-border">
                                        {[
                                            'Date',
                                            'Type',
                                            'Fund',
                                            'Method',
                                            'Amount',
                                            'Receipt',
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="table-header text-left"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {portal.giving.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="py-10 text-center text-sm text-muted-foreground"
                                            >
                                                No giving recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        portal.giving.map((g) => (
                                            <tr
                                                key={g.id}
                                                className="table-row transition-colors hover:bg-muted/30"
                                            >
                                                <td className="table-cell text-muted-foreground">
                                                    {formatLongDate(g.date)}
                                                </td>
                                                <td className="table-cell font-medium">
                                                    {g.type}
                                                </td>
                                                <td className="table-cell text-muted-foreground">
                                                    {g.fund || '—'}
                                                </td>
                                                <td className="table-cell text-muted-foreground">
                                                    {g.method || '—'}
                                                </td>
                                                <td className="table-cell font-semibold text-success tabular-nums">
                                                    {money(
                                                        g.amount,
                                                        (
                                                            g as {
                                                                currency?: string;
                                                            }
                                                        ).currency ?? currency,
                                                    )}
                                                </td>
                                                <td className="table-cell font-mono text-xs text-muted-foreground">
                                                    {g.receipt || '—'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'prayer' && <PrayerTab {...props} />}

            {activeTab === 'documents' && <DocumentsTab {...props} />}
        </div>
    );
}

/* ------------------------------------------------------------------ */

function ProfileTab({
    member,
    editingProfile,
    setEditingProfile,
}: PortalTabsProps) {
    const form = useForm({
        phone: member.phone ?? '',
        alt_phone: member.alt_phone ?? '',
        address: member.address ?? '',
        city: member.city ?? '',
        state: member.state ?? '',
        country: member.country ?? '',
        occupation: member.occupation ?? '',
        employer: member.employer ?? '',
        emergency_name: member.emergency_name ?? '',
        emergency_phone: member.emergency_phone ?? '',
        emergency_relation: member.emergency_relation ?? '',
    });

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        form.patch(updateProfile.url(), {
            preserveScroll: true,
            onSuccess: () => setEditingProfile(false),
        });
    };

    const input = (k: keyof typeof form.data, label: string, span = '') => (
        <div className={span}>
            <label className="label-text">{label}</label>
            <input
                className="input-field"
                value={form.data[k]}
                onChange={(e) => form.setData(k, e.target.value)}
            />
            {form.errors[k] && <p className="error-text">{form.errors[k]}</p>}
        </div>
    );

    const address = [member.address, member.city, member.state, member.country]
        .filter(Boolean)
        .join(', ');
    const baptized = member.baptized
        ? `Yes${member.baptism_date ? ` (${formatShortDate(member.baptism_date)})` : ''}`
        : 'No';

    const fields = [
        field('Full Name', member.full_name),
        field('Member ID', member.member_id ?? member.reg_ref, true),
        field('Email', member.email),
        field('Phone', member.phone, true),
        field(
            'Date of Birth',
            member.date_of_birth ? formatShortDate(member.date_of_birth) : null,
        ),
        field('Gender', member.gender),
        field('Marital Status', member.marital_status),
        field('Nationality', member.nationality),
        field('Address', address),
        field('Occupation', member.occupation),
        field('Employer', member.employer),
        field('Membership Type', member.membership_type),
        field(
            'Date Joined',
            member.date_joined ? formatShortDate(member.date_joined) : null,
        ),
        field('Baptized', baptized),
        field('Department', member.department),
        field('Ministry', member.ministry),
    ];

    return (
        <div className="slide-up space-y-5">
            <div className="card p-6">
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="section-header">Personal Information</h3>
                    <button
                        type="button"
                        onClick={() => {
                            form.reset();
                            form.clearErrors();
                            setEditingProfile(!editingProfile);
                        }}
                        className="btn-outline text-sm"
                    >
                        <Icon
                            name={editingProfile ? 'XMarkIcon' : 'PencilIcon'}
                            size={14}
                        />
                        {editingProfile ? 'Cancel' : 'Edit Profile'}
                    </button>
                </div>

                {editingProfile ? (
                    <form onSubmit={save} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {input('phone', 'Phone')}
                            {input('alt_phone', 'Alternative Phone')}
                            {input(
                                'address',
                                'Street Address',
                                'md:col-span-2',
                            )}
                            {input('city', 'City')}
                            {input('state', 'State / Province')}
                            {input('country', 'Country')}
                            {input('occupation', 'Occupation')}
                            {input('employer', 'Employer')}
                        </div>
                        <div className="border-t border-border pt-3">
                            <h4 className="mb-3 text-sm font-semibold text-foreground">
                                Emergency Contact
                            </h4>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {input('emergency_name', 'Name')}
                                {input('emergency_phone', 'Phone')}
                                {input('emergency_relation', 'Relationship')}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            To change your name, date of birth or other church
                            records, please contact the church office.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="btn-primary"
                            >
                                <Icon
                                    name={
                                        form.processing
                                            ? 'ArrowPathIcon'
                                            : 'CheckIcon'
                                    }
                                    size={14}
                                    className={
                                        form.processing ? 'animate-spin' : ''
                                    }
                                />
                                Save Changes
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditingProfile(false)}
                                className="btn-outline"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            {fields.map((f) => (
                                <div key={f.label} className="space-y-0.5">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        {f.label}
                                    </p>
                                    <p
                                        className={`text-sm font-medium text-foreground ${f.mono ? 'font-mono' : ''}`}
                                    >
                                        {f.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 border-t border-border pt-5">
                            <h3 className="mb-3 text-sm font-semibold text-foreground">
                                Emergency Contact
                            </h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {[
                                    field('Name', member.emergency_name),
                                    field(
                                        'Relationship',
                                        member.emergency_relation,
                                    ),
                                    field('Phone', member.emergency_phone),
                                ].map((f) => (
                                    <div key={f.label} className="space-y-0.5">
                                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            {f.label}
                                        </p>
                                        <p className="text-sm font-medium text-foreground">
                                            {f.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="card p-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h3 className="section-header">Password & Security</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Manage your account password and security settings
                        </p>
                    </div>
                    <Link
                        href="/change-password"
                        className="btn-outline shrink-0 text-sm"
                    >
                        <Icon name="KeyIcon" size={14} />
                        Change Password
                    </Link>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function PrayerTab({
    portal,
    options,
    showPrayerForm,
    setShowPrayerForm,
}: PortalTabsProps) {
    const form = useForm({ category: '', request: '', is_private: true });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(prayerRoute.url(), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setShowPrayerForm(false);
            },
        });
    };

    return (
        <div className="slide-up space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="section-header">My Prayer Requests</h3>
                <button
                    type="button"
                    onClick={() => setShowPrayerForm(!showPrayerForm)}
                    className="btn-primary text-sm"
                >
                    <Icon name="PlusIcon" size={14} />
                    New Request
                </button>
            </div>

            {showPrayerForm && (
                <div className="card slide-up border-primary/30 p-5">
                    <h4 className="mb-4 text-sm font-semibold text-foreground">
                        Submit a Prayer Request
                    </h4>
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="label-text">Category</label>
                            <select
                                className="input-field"
                                value={form.data.category}
                                onChange={(e) =>
                                    form.setData('category', e.target.value)
                                }
                            >
                                <option value="">Select category...</option>
                                {options.prayer_categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                            {form.errors.category && (
                                <p className="error-text">
                                    {form.errors.category}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="label-text">
                                Prayer Request{' '}
                                <span className="text-danger">*</span>
                            </label>
                            <textarea
                                rows={4}
                                className="input-field resize-none"
                                placeholder="Share your prayer request..."
                                value={form.data.request}
                                onChange={(e) =>
                                    form.setData('request', e.target.value)
                                }
                            />
                            {form.errors.request && (
                                <p className="error-text">
                                    {form.errors.request}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_private"
                                className="rounded border-border"
                                checked={form.data.is_private}
                                onChange={(e) =>
                                    form.setData('is_private', e.target.checked)
                                }
                            />
                            <label
                                htmlFor="is_private"
                                className="cursor-pointer text-sm text-muted-foreground"
                            >
                                Keep this request private (only visible to
                                pastoral team)
                            </label>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="btn-primary text-sm"
                            >
                                <Icon
                                    name={
                                        form.processing
                                            ? 'ArrowPathIcon'
                                            : 'HandRaisedIcon'
                                    }
                                    size={14}
                                    className={
                                        form.processing ? 'animate-spin' : ''
                                    }
                                />
                                Submit Request
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPrayerForm(false)}
                                className="btn-outline text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {portal.prayer_requests.length === 0 && !showPrayerForm ? (
                <div className="card p-10 text-center">
                    <Icon
                        name="HandRaisedIcon"
                        size={32}
                        className="mx-auto mb-2 text-muted-foreground/40"
                    />
                    <p className="text-sm text-muted-foreground">
                        You haven't submitted any prayer requests yet.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {portal.prayer_requests.map((pr) => (
                        <div key={pr.id} className="card p-4">
                            <div className="mb-2 flex items-start justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                                        {pr.category}
                                    </span>
                                    <StatusBadge status={pr.status} size="sm" />
                                    {pr.is_private && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Icon
                                                name="LockClosedIcon"
                                                size={11}
                                            />
                                            Private
                                        </span>
                                    )}
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {formatLongDate(pr.created_at)}
                                </span>
                            </div>
                            <p className="mb-2 text-sm leading-relaxed whitespace-pre-line text-foreground">
                                {pr.request}
                            </p>
                            {pr.assigned_to && (
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Icon name="UserIcon" size={11} />
                                    Assigned to: {pr.assigned_to}
                                </p>
                            )}
                            {pr.response && (
                                <div className="mt-3 rounded-lg border border-success/20 bg-success/5 p-3">
                                    <p className="mb-1 text-xs font-semibold text-success">
                                        Pastoral Response
                                    </p>
                                    <p className="text-xs leading-relaxed whitespace-pre-line text-foreground">
                                        {pr.response}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */

function DocumentsTab({
    portal,
    options,
    docRequestModal,
    setDocRequestModal,
    docType,
}: PortalTabsProps) {
    const form = useForm({ document_type: docType ?? '', notes: '' });
    const year = new Date().getFullYear();

    const submit = () =>
        form.post(documentRoute.url(), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setDocRequestModal(false);
            },
        });

    const available = [
        ...portal.issued_documents.map((d) => ({
            ...d,
            icon:
                d.type === 'Certificate'
                    ? 'DocumentCheckIcon'
                    : 'DocumentTextIcon',
            date: formatLongDate(d.date),
            pdf: true,
        })),
        {
            id: 'giving',
            name: `Giving Statement ${year}`,
            type: 'Financial (CSV)',
            date: `Jan 1 – today, ${year}`,
            icon: 'DocumentTextIcon',
            url: givingStatement.url(),
            pdf: false,
        },
    ];
    const requests = portal.document_requests.filter(
        (d) => d.status !== 'Ready' && d.status !== 'Collected',
    );

    return (
        <div className="slide-up space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="section-header">My Documents</h3>
                <button
                    type="button"
                    onClick={() => setDocRequestModal(true)}
                    className="btn-primary text-sm"
                >
                    <Icon name="DocumentPlusIcon" size={14} />
                    Request Document
                </button>
            </div>

            <p className="text-xs text-muted-foreground">
                Certificates and letters are issued as PDF once the church
                office approves your request. You'll get a notification when a
                document is ready.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {available.map((doc) => (
                    <div
                        key={doc.id}
                        className="card flex items-start gap-4 p-4"
                    >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                            <Icon name={doc.icon} size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">
                                {doc.name}
                            </p>
                            <p className="mt-0.5 mb-1 text-xs text-muted-foreground">
                                {doc.type} · {doc.date}
                            </p>
                            <StatusBadge status="Available" size="sm" />
                        </div>
                        <PdfButton
                            url={doc.url}
                            title={String(doc.type ?? 'Document')}
                            download
                            className="btn-outline shrink-0 px-3 py-1.5 text-xs"
                        >
                            <Icon name="ArrowDownTrayIcon" size={12} />
                            Download
                        </PdfButton>
                    </div>
                ))}

                {requests.map((d) => (
                    <div key={d.id} className="card flex items-start gap-4 p-4">
                        <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                                d.status === 'Pending'
                                    ? 'bg-warning/10 text-warning'
                                    : d.status === 'Rejected'
                                      ? 'bg-danger/10 text-danger'
                                      : 'bg-success/10 text-success'
                            }`}
                        >
                            <Icon name="DocumentPlusIcon" size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">
                                {d.document_type}
                            </p>
                            <p className="mt-0.5 mb-1 text-xs text-muted-foreground">
                                Requested · {formatLongDate(d.created_at)}
                            </p>
                            <StatusBadge status={d.status} size="sm" />
                            {d.staff_note && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {d.staff_note}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {docRequestModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setDocRequestModal(false)}
                    />
                    <div className="scale-in relative w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
                        <div className="flex items-center justify-between border-b border-border p-5">
                            <h2 className="text-lg font-bold text-foreground">
                                Request a Document
                            </h2>
                            <button
                                type="button"
                                onClick={() => setDocRequestModal(false)}
                                className="btn-ghost p-2"
                                aria-label="Close"
                            >
                                <Icon name="XMarkIcon" size={18} />
                            </button>
                        </div>
                        <div className="space-y-4 p-5">
                            <div>
                                <label className="label-text">
                                    Document Type{' '}
                                    <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="input-field"
                                    value={form.data.document_type}
                                    onChange={(e) =>
                                        form.setData(
                                            'document_type',
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        Select document type...
                                    </option>
                                    {options.document_types.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                                {form.errors.document_type && (
                                    <p className="error-text">
                                        {form.errors.document_type}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label-text">
                                    Additional Notes
                                </label>
                                <textarea
                                    rows={3}
                                    className="input-field resize-none"
                                    placeholder="Any specific requirements or purpose for this document..."
                                    value={form.data.notes}
                                    onChange={(e) =>
                                        form.setData('notes', e.target.value)
                                    }
                                />
                            </div>
                            <div className="rounded-xl border border-info/20 bg-info/5 p-3">
                                <p className="flex items-start gap-2 text-xs text-info">
                                    <Icon
                                        name="InformationCircleIcon"
                                        size={14}
                                        className="mt-0.5 shrink-0"
                                    />
                                    Document requests are typically processed
                                    within 3–5 business days. You will be
                                    notified when your document is ready.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-border p-5">
                            <button
                                type="button"
                                onClick={() => setDocRequestModal(false)}
                                className="btn-outline"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submit}
                                disabled={
                                    form.processing || !form.data.document_type
                                }
                                className="btn-primary"
                            >
                                <Icon name="PaperAirplaneIcon" size={14} />
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
