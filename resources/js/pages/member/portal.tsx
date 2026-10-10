import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import MemberProfileCard from '@/components/member-portal/member-profile-card';
import PortalTabs from '@/components/member-portal/portal-tabs';
import {
    RegistrationForm,
    StatusBanner,
} from '@/components/member-portal/registration-form';
import type {
    PortalData,
    PortalMember,
    PortalOptions,
    PortalTab,
} from '@/components/member-portal/types';
import Icon from '@/components/ssbcms/AppIcon';
import type { Member } from '@/types';

type Props = {
    user: { name: string; email: string };
    member: PortalMember | null;
    portal: PortalData | null;
    tab: string;
    church: { name: string; currency: string };
    options: PortalOptions;
};

const TAB_IDS: PortalTab[] = [
    'overview',
    'profile',
    'attendance',
    'giving',
    'prayer',
    'documents',
];

export default function MemberPortal({
    user,
    member,
    portal,
    tab,
    church,
    options,
}: Props) {
    const [activeTab, setActiveTabState] = useState<PortalTab>(
        TAB_IDS.includes(tab as PortalTab) ? (tab as PortalTab) : 'overview',
    );
    const [editingProfile, setEditingProfile] = useState(false);
    const [showPrayerForm, setShowPrayerForm] = useState(false);
    const [docRequestModal, setDocRequestModal] = useState(false);
    const [docType, setDocType] = useState<string | undefined>(undefined);

    const setActiveTab = (t: PortalTab) => {
        setActiveTabState(t);
        // Keep the tab in the URL so refresh / notification links land on it.
        const url = new URL(window.location.href);
        url.searchParams.set('tab', t);
        window.history.replaceState(window.history.state, '', url);
    };

    const awaitingReview =
        member &&
        [
            'Pending',
            'Under Review',
            'Rejected',
            'Suspended',
            'Inactive',
        ].includes(member.status);

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Member Portal" />

            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Member Portal</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage your profile, view attendance, giving history,
                        and submit requests
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/notifications" className="btn-outline text-sm">
                        <Icon name="BellIcon" size={16} />
                        Notifications
                    </Link>
                    <Link
                        href="/settings/profile"
                        className="btn-ghost text-sm"
                    >
                        <Icon name="Cog6ToothIcon" size={16} />
                        Settings
                    </Link>
                </div>
            </div>

            {!member || !portal ? (
                <RegistrationForm user={{ ...user, status: null }} />
            ) : (
                <div className="space-y-6">
                    {awaitingReview && (
                        <StatusBanner
                            status={member.status as Member['status']}
                        />
                    )}

                    <MemberProfileCard
                        member={member}
                        portal={portal}
                        currency={church.currency}
                        onDownloadCertificate={() => {
                            // Approved membership certificate → download; otherwise request one.
                            const cert = portal.issued_documents.find(
                                (d) => d.name === 'Membership Certificate',
                            );
                            if (cert) {
                                window.location.href = cert.url;
                                return;
                            }
                            setActiveTab('documents');
                            setDocType('Membership Certificate');
                            setDocRequestModal(true);
                        }}
                        onRequestDocument={() => {
                            setActiveTab('documents');
                            setDocType(undefined);
                            setDocRequestModal(true);
                        }}
                        onPrayerRequest={() => {
                            setActiveTab('prayer');
                            setShowPrayerForm(true);
                        }}
                        onEditProfile={() => {
                            setActiveTab('profile');
                            setEditingProfile(true);
                        }}
                    />

                    <PortalTabs
                        member={member}
                        portal={portal}
                        options={options}
                        currency={church.currency}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        editingProfile={editingProfile}
                        setEditingProfile={setEditingProfile}
                        showPrayerForm={showPrayerForm}
                        setShowPrayerForm={setShowPrayerForm}
                        docRequestModal={docRequestModal}
                        setDocRequestModal={setDocRequestModal}
                        docType={docType}
                    />
                </div>
            )}
        </div>
    );
}
