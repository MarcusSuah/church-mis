import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import { usePermissions } from '@/hooks/use-permissions';
import type { SharedData } from '@/types';

type BadgeKey =
    | 'pendingMembers'
    | 'activePrayers'
    | 'notifications'
    | 'pendingDocuments'
    | 'birthdaysToday'
    | 'newMessages';

type NavItem = {
    id: string;
    label: string;
    icon: string;
    href: string;
    /** Hidden unless the user has this permission (Super Admin has all). */
    permission?: string;
    badge?: BadgeKey;
    /** Module not built yet — shown dimmed, not clickable. */
    soon?: boolean;
};

type NavGroup = { group: string; items: NavItem[] };

/* Same groups, order and icons as the SSBCMS reference app. */
const STAFF_NAV: NavGroup[] = [
    {
        group: '',
        items: [
            {
                id: 'nav-dashboard',
                label: 'Dashboard',
                icon: 'HomeIcon',
                href: '/dashboard',
            },
        ],
    },
    {
        group: 'Homepage',
        items: [
            {
                id: 'nav-website',
                label: 'Website',
                icon: 'GlobeAltIcon',
                href: '/website-content',
                permission: 'website.manage',
            },
            {
                id: 'nav-messages',
                label: 'Messages',
                icon: 'EnvelopeIcon',
                href: '/messages',
                permission: 'messages.view',
                badge: 'newMessages',
            },
        ],
    },
    {
        group: 'Members',
        items: [
            {
                id: 'nav-members',
                label: 'All Members',
                icon: 'UsersIcon',
                href: '/member-management',
                permission: 'members.view',
            },
            {
                id: 'nav-pending',
                label: 'Pending Registrations',
                icon: 'ClockIcon',
                href: '/pending-registrations',
                permission: 'members.view',
                badge: 'pendingMembers',
            },
            {
                id: 'nav-families',
                label: 'Families',
                icon: 'HomeModernIcon',
                href: '/families',
                permission: 'members.view',
            },
            {
                id: 'nav-directory',
                label: 'Member Directory',
                icon: 'BookOpenIcon',
                href: '/member-directory',
                permission: 'members.view',
            },
            {
                id: 'nav-birthdays',
                label: 'Birthdays',
                icon: 'CakeIcon',
                href: '/birthdays',
                permission: 'birthdays.view',
                badge: 'birthdaysToday',
            },
            {
                id: 'nav-my-portal',
                label: 'My Portal',
                icon: 'UserIcon',
                href: '/member-portal',
            },
        ],
    },
    {
        group: 'Church Structure',
        items: [
            {
                id: 'nav-departments',
                label: 'Departments',
                icon: 'BuildingOffice2Icon',
                href: '/departments',
                permission: 'departments.view',
            },
            {
                id: 'nav-ministries',
                label: 'Ministries',
                icon: 'HeartIcon',
                href: '/ministries',
                permission: 'ministries.view',
            },
            {
                id: 'nav-boards',
                label: 'Boards & Trustees',
                icon: 'BriefcaseIcon',
                href: '/boards',
                permission: 'boards.view',
            },
            {
                id: 'nav-committees',
                label: 'Committees',
                icon: 'ClipboardDocumentListIcon',
                href: '/committees',
                permission: 'committees.view',
            },
            {
                id: 'nav-leadership',
                label: 'Leadership',
                icon: 'StarIcon',
                href: '/leadership',
                permission: 'leadership.view',
            },
        ],
    },
    {
        group: 'Worship & Care',
        items: [
            {
                id: 'nav-attendance',
                label: 'Attendance',
                icon: 'CalendarDaysIcon',
                href: '/attendance',
                permission: 'attendance.view',
            },
            {
                id: 'nav-sermons',
                label: 'Sermons',
                icon: 'MicrophoneIcon',
                href: '/sermons',
                permission: 'sermons.view',
            },
            {
                id: 'nav-prayer',
                label: 'Prayer Requests',
                icon: 'HandRaisedIcon',
                href: '/prayer-requests',
                permission: 'prayer-requests.view',
                badge: 'activePrayers',
            },
            {
                id: 'nav-pastoral',
                label: 'Pastoral Care',
                icon: 'UserGroupIcon',
                href: '/pastoral-care',
                permission: 'pastoral-care.view',
            },
        ],
    },
    {
        group: 'Sacraments',
        items: [
            {
                id: 'nav-baptism',
                label: 'Baptism',
                icon: 'SparklesIcon',
                href: '/baptisms',
                permission: 'baptisms.view',
            },
            {
                id: 'nav-communion',
                label: 'Communion',
                icon: 'BookOpenIcon',
                href: '/communions',
                permission: 'communions.view',
            },
            {
                id: 'nav-weddings',
                label: 'Weddings',
                icon: 'HeartIcon',
                href: '/weddings',
                permission: 'weddings.view',
            },
            {
                id: 'nav-funerals',
                label: 'Funerals',
                icon: 'DocumentTextIcon',
                href: '/funerals',
                permission: 'funerals.view',
            },
            {
                id: 'nav-certificates',
                label: 'Certificates',
                icon: 'DocumentCheckIcon',
                href: '/certificates',
                permission: 'certificates.view',
                badge: 'pendingDocuments',
            },
        ],
    },
    {
        group: 'Finance',
        items: [
            {
                id: 'nav-finance',
                label: 'Finance Overview',
                icon: 'BanknotesIcon',
                href: '/finance-management',
                permission: 'finance.view',
            },
            {
                id: 'nav-tithes',
                label: 'Tithes',
                icon: 'CurrencyDollarIcon',
                href: '/tithes',
                permission: 'tithes.view',
            },
            {
                id: 'nav-offerings',
                label: 'Offerings',
                icon: 'HeartIcon',
                href: '/offerings',
                permission: 'offerings.view',
            },
            {
                id: 'nav-donations',
                label: 'Donations',
                icon: 'GiftIcon',
                href: '/donations',
                permission: 'donations.view',
            },
            {
                id: 'nav-expenses',
                label: 'Expenses',
                icon: 'ArrowTrendingDownIcon',
                href: '/expenses',
                permission: 'expenses.view',
            },
            {
                id: 'nav-budgets',
                label: 'Budgets',
                icon: 'ChartBarIcon',
                href: '/budgets',
                permission: 'budgets.view',
            },
        ],
    },
    {
        group: 'Events & Content',
        items: [
            {
                id: 'nav-events',
                label: 'Events',
                icon: 'CalendarIcon',
                href: '/events',
                permission: 'events.view',
            },
            {
                id: 'nav-announcements',
                label: 'Announcements',
                icon: 'MegaphoneIcon',
                href: '/announcements',
                permission: 'announcements.view',
            },
            {
                id: 'nav-documents',
                label: 'Documents',
                icon: 'DocumentTextIcon',
                href: '/documents',
                permission: 'documents.view',
            },
        ],
    },
    {
        group: 'Reports',
        items: [
            {
                id: 'nav-reports',
                label: 'Reports',
                icon: 'ChartPieIcon',
                href: '/reports',
                permission: 'reports.view',
            },
        ],
    },
    {
        group: 'System',
        items: [
            {
                id: 'nav-notifications',
                label: 'Notifications',
                icon: 'BellIcon',
                href: '/notifications',
                badge: 'notifications',
            },
            {
                id: 'nav-users',
                label: 'Users',
                icon: 'UserCircleIcon',
                href: '/admin/users',
                permission: 'users.view',
            },
            {
                id: 'nav-roles',
                label: 'Roles',
                icon: 'ShieldCheckIcon',
                href: '/admin/roles',
                permission: 'roles.view',
            },
            {
                id: 'nav-permissions',
                label: 'Permissions',
                icon: 'LockClosedIcon',
                href: '/admin/permissions',
                permission: 'permissions.view',
            },
            {
                id: 'nav-audit',
                label: 'Audit Logs',
                icon: 'ClipboardDocumentListIcon',
                href: '/audit-logs',
                permission: 'audit-logs.view',
            },
            {
                id: 'nav-activity',
                label: 'Activity Log',
                icon: 'FingerPrintIcon',
                href: '/activity-logs',
                permission: 'activity.view',
            },
            {
                id: 'nav-church-settings',
                label: 'Church Settings',
                icon: 'BuildingLibraryIcon',
                href: '/church-settings',
                permission: 'church-settings.manage',
            },
            {
                id: 'nav-settings',
                label: 'Settings',
                icon: 'Cog6ToothIcon',
                href: '/settings/profile',
            },
        ],
    },
];

/* Member-only users get their own short menu. */
const MEMBER_NAV: NavGroup[] = [
    {
        group: '',
        items: [
            {
                id: 'nav-portal',
                label: 'Member Portal',
                icon: 'UserIcon',
                href: '/member-portal',
            },
            {
                id: 'nav-notifications',
                label: 'Notifications',
                icon: 'BellIcon',
                href: '/notifications',
                badge: 'notifications',
            },
        ],
    },
    {
        group: 'Account',
        items: [
            {
                id: 'nav-password',
                label: 'Change Password',
                icon: 'KeyIcon',
                href: '/change-password',
            },
            {
                id: 'nav-settings',
                label: 'Settings',
                icon: 'Cog6ToothIcon',
                href: '/settings/profile',
            },
        ],
    },
];

export const initialsOf = (name?: string) =>
    (name ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || 'U';

export function SidebarLogo({ size = 36 }: { size?: number }) {
    return (
        <div
            className="gradient-gold flex shrink-0 items-center justify-center rounded-lg shadow-sm"
            style={{ width: size, height: size }}
        >
            <Icon
                name="BookOpenIcon"
                variant="solid"
                size={Math.round(size * 0.55)}
                className="text-white"
            />
        </div>
    );
}

export default function Sidebar({
    collapsed,
    onToggle,
    onClose,
}: {
    collapsed: boolean;
    onToggle: () => void;
    onClose?: () => void;
}) {
    const { url, props } = usePage<SharedData>();
    const { can, isMemberOnly } = usePermissions();
    const user = props.auth.user;
    const church =
        (props.church as { name?: string; short_name?: string } | undefined) ??
        {};

    const path = url.split('?')[0];
    const isActive = (href: string) =>
        path === href || path.startsWith(`${href}/`);
    const nav = isMemberOnly ? MEMBER_NAV : STAFF_NAV;
    const activeGroup =
        nav.find((g) => g.group && g.items.some((i) => isActive(i.href)))
            ?.group ?? null;

    // Accordion: only the group holding the current page is open. Navigating
    // elsewhere closes it and opens the new page's group; clicking a header
    // opens that group (closing the others) or closes it.
    const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);
    useEffect(() => setOpenGroup(activeGroup), [activeGroup]);
    const toggleGroup = (g: string) =>
        setOpenGroup((cur) => (cur === g ? null : g));

    const badges: Record<BadgeKey, number> = {
        pendingMembers: (props.pendingMembersCount as number | null) ?? 0,
        activePrayers: (props.activePrayerCount as number | null) ?? 0,
        notifications:
            (props.notificationSummary as { unread: number } | null)?.unread ??
            0,
        pendingDocuments: (props.pendingDocumentCount as number | null) ?? 0,
        birthdaysToday: (props.birthdaysTodayCount as number | null) ?? 0,
        newMessages: (props.newMessagesCount as number | null) ?? 0,
    };

    const groups = nav
        .map((g) => ({ ...g, items: g.items.filter((i) => can(i.permission)) }))
        .filter((g) => g.items.length > 0);

    return (
        <aside
            className="sidebar-transition fixed top-0 left-0 z-40 flex h-screen flex-col overflow-hidden bg-primary"
            style={{
                width: collapsed
                    ? 'var(--sidebar-collapsed)'
                    : 'var(--sidebar-width)',
            }}
        >
            {/* Logo + collapse toggle. When collapsed the header stacks vertically
                so the expand button stays visible inside the narrow rail. */}
            <div
                className={`flex min-h-[var(--topbar-height)] border-b border-white/10 ${collapsed ? 'flex-col items-center justify-center gap-1.5 px-2 py-2' : 'items-center gap-3 px-4 py-4'}`}
            >
                <Link
                    href={isMemberOnly ? '/member-portal' : '/dashboard'}
                    className="shrink-0"
                >
                    <SidebarLogo />
                </Link>
                {!collapsed && (
                    <div className="min-w-0 flex-1 fade-in">
                        <p className="truncate text-sm leading-tight font-bold text-white">
                            {church.short_name ?? 'SSBCMS'}
                        </p>
                        <p className="truncate text-xs text-white/50">
                            {church.name ?? 'Saint Simon Baptist Church'}
                        </p>
                    </div>
                )}
                <button
                    type="button"
                    onClick={onToggle}
                    className={`shrink-0 rounded-lg p-1 text-white/60 transition-colors duration-150 hover:bg-white/10 hover:text-white ${onClose ? 'hidden' : 'hidden lg:block'}`}
                    aria-label={
                        collapsed ? 'Expand sidebar' : 'Collapse sidebar'
                    }
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <Icon
                        name={
                            collapsed
                                ? 'ChevronDoubleRightIcon'
                                : 'ChevronDoubleLeftIcon'
                        }
                        size={16}
                    />
                </button>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                        aria-label="Close menu"
                    >
                        <Icon name="XMarkIcon" size={18} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 scrollbar-thin overflow-y-auto px-2 py-3">
                {groups.map(({ group, items }) => (
                    <div key={`group-${group || 'main'}`} className="mb-1">
                        {group && !collapsed && (
                            <button
                                type="button"
                                onClick={() => toggleGroup(group)}
                                className="mb-1 flex w-full items-center justify-between px-2 py-1.5"
                                aria-expanded={openGroup === group}
                            >
                                <span
                                    className={`text-xs font-semibold tracking-widest uppercase ${activeGroup === group ? 'text-accent' : 'text-white/40'}`}
                                >
                                    {group}
                                </span>
                                <Icon
                                    name={
                                        openGroup === group
                                            ? 'ChevronDownIcon'
                                            : 'ChevronRightIcon'
                                    }
                                    size={12}
                                    className="text-white/40"
                                />
                            </button>
                        )}
                        {group && collapsed && (
                            <div className="my-2 border-t border-white/10" />
                        )}
                        {(openGroup === group || collapsed || group === '') &&
                            items.map((item) => {
                                const badge = item.badge
                                    ? badges[item.badge]
                                    : 0;
                                const inner = (
                                    <>
                                        <Icon
                                            name={item.icon}
                                            size={18}
                                            className="shrink-0"
                                        />
                                        {!collapsed && (
                                            <span className="flex-1 truncate">
                                                {item.label}
                                            </span>
                                        )}
                                        {!collapsed && item.soon && (
                                            <span className="text-[10px] tracking-wide uppercase">
                                                Soon
                                            </span>
                                        )}
                                        {!collapsed && badge > 0 && (
                                            <span className="min-w-[20px] shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-center text-xs font-bold text-white">
                                                {badge}
                                            </span>
                                        )}
                                        {collapsed && badge > 0 && (
                                            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent" />
                                        )}
                                    </>
                                );
                                const cls = `nav-item relative ${collapsed ? 'justify-center px-2' : ''}`;

                                return item.soon ? (
                                    <span
                                        key={item.id}
                                        title={`${item.label} (coming soon)`}
                                        className={`${cls} cursor-not-allowed text-white/35`}
                                    >
                                        {inner}
                                    </span>
                                ) : (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        prefetch
                                        title={
                                            collapsed ? item.label : undefined
                                        }
                                        className={`${cls} ${isActive(item.href) ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        {inner}
                                    </Link>
                                );
                            })}
                    </div>
                ))}
            </nav>

            {/* Bottom user section */}
            <div className="border-t border-white/10 p-3">
                <Link
                    href="/member-portal"
                    className={`flex items-center gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-white/10 ${collapsed ? 'justify-center' : ''}`}
                >
                    {user?.avatar ? (
                        <img
                            src={user.avatar}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                    ) : (
                        <div className="gradient-gold flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                            <span className="text-xs font-bold text-white">
                                {initialsOf(user?.name)}
                            </span>
                        </div>
                    )}
                    {!collapsed && (
                        <div className="min-w-0 flex-1 fade-in">
                            <p className="truncate text-sm font-medium text-white">
                                {user?.name}
                            </p>
                            <p className="truncate text-xs text-white/50">
                                {user?.email}
                            </p>
                        </div>
                    )}
                </Link>
            </div>
        </aside>
    );
}
