import { Link, usePage } from '@inertiajs/react';
import {
    Banknote,
    BarChart3,
    Bell,
    BookOpen,
    Briefcase,
    Building2,
    Calendar,
    CalendarDays,
    ChevronRight,
    ClipboardList,
    Clock,
    UserCog,
    DollarSign,
    FileText,
    Gift,
    HandHelping,
    Heart,
    HeartHandshake,
    Home,
    LayoutGrid,
    Megaphone,
    Mic,
    PieChart,
    Settings,
    ShieldCheck,
    Sparkles,
    Star,
    TrendingDown,
    Users,
    type LucideIcon,
    Lock,
    UserRound,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { index as adminUsersIndex } from '@/routes/admin/users';
import { index as adminRolesIndex } from '@/routes/admin/roles';
import { index as adminPermissionsIndex } from '@/routes/admin/permissions';
import { dashboard } from '@/routes';
import { portal } from '@/routes/member';
import { index as familiesIndex } from '@/routes/families';
import { index as memberDirectoryIndex } from '@/routes/member-directory';
import { index as membersIndex } from '@/routes/members';
import { index as pendingRegistrationsIndex } from '@/routes/pending-registrations';
import { usePermissions } from '@/hooks/use-permissions';
import type { NavItem, SharedData } from '@/types';
import { index as departmentsIndex } from '@/routes/departments';
import { index as ministriesIndex } from '@/routes/ministries';
import { index as boardsIndex } from '@/routes/boards';
import { index as committeesIndex } from '@/routes/committees';
import { index as leadershipIndex } from '@/routes/leadership';
import { index as attendanceIndex } from '@/routes/attendance';
import { index as sermonsIndex } from '@/routes/sermons';
import { index as prayerRequestsIndex } from '@/routes/prayer-requests';

type ChurchNavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    /** Key into the live badge counts shared by HandleInertiaRequests. */
    badgeKey?: 'pendingMembers' | 'activePrayers';
    /** Checked in the render loop below via usePermissions().can(). */
    permission?: string;
};

type ChurchNavGroup = {
    label: string;
    defaultOpen?: boolean;
    items: ChurchNavItem[];
    badgeKey?: 'pendingMembers' | 'activePrayers';
};

const staffNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        // Staff are usually church members too — their own record lives here.
        title: 'Member Portal',
        href: portal(),
        icon: UserRound,
    },
];

/** Members (users whose only role is Member) get the portal, not staff tools. */
const memberNavItems: NavItem[] = [
    {
        title: 'Member Portal',
        href: portal(),
        icon: UserRound,
    },
    {
        title: 'Settings',
        href: '/settings/profile',
        icon: Settings,
    },
];

const navGroups: ChurchNavGroup[] = [
    {
        label: 'Members',
        defaultOpen: true,
        items: [
            {
                title: 'All Members',
                href: membersIndex.url(),
                icon: Users,
                permission: 'members.view',
            },
            {
                title: 'Pending Registrations',
                href: pendingRegistrationsIndex.url(),
                icon: Clock,
                badgeKey: 'pendingMembers',
                permission: 'members.view',
            },
            {
                title: 'Families',
                href: familiesIndex.url(),
                icon: Home,
                permission: 'members.view',
            },
            {
                title: 'Member Directory',
                href: memberDirectoryIndex.url(),
                icon: BookOpen,
                permission: 'members.view',
            },
        ],
    },

    {
        label: 'Church Structure',
        items: [
            {
                title: 'Departments',
                href: departmentsIndex.url(),
                icon: Building2,
                permission: 'departments.view',
            },
            {
                title: 'Ministries',
                href: ministriesIndex.url(),
                icon: Heart,
                permission: 'ministries.view',
            },
            {
                title: 'Boards & Trustees',
                href: boardsIndex.url(),
                icon: Briefcase,
                permission: 'boards.view',
            },
            {
                title: 'Committees',
                href: committeesIndex.url(),
                icon: ClipboardList,
                permission: 'committees.view',
            },
            {
                title: 'Leadership',
                href: leadershipIndex.url(),
                icon: Star,
                permission: 'leadership.view',
            },
        ],
    },

    {
        label: 'Worship & Care',
        items: [
            {
                title: 'Attendance',
                href: attendanceIndex.url(),
                icon: CalendarDays,
                permission: 'attendance.view',
            },
            {
                title: 'Sermons',
                href: sermonsIndex.url(),
                icon: Mic,
                permission: 'sermons.view',
            },
            {
                title: 'Prayer Requests',
                href: prayerRequestsIndex.url(),
                icon: HandHelping,
                permission: 'prayer-requests.view',
                badgeKey: 'activePrayers',
            },
            {
                title: 'Pastoral Care',
                href: '#',
                icon: HeartHandshake,
                permission: 'pastoral-care.view',
            },
        ],
    },

    {
        label: 'Sacraments',
        items: [
            {
                title: 'Baptism',
                href: '#',
                icon: Sparkles,
            },
            {
                title: 'Communion',
                href: '#',
                icon: BookOpen,
            },
            {
                title: 'Weddings',
                href: '#',
                icon: Heart,
            },
            {
                title: 'Funerals',
                href: '#',
                icon: FileText,
            },
        ],
    },

    {
        label: 'Finance',
        defaultOpen: true,
        items: [
            {
                title: 'Finance Overview',
                href: '#',
                icon: Banknote,
            },
            {
                title: 'Tithes',
                href: '#',
                icon: DollarSign,
            },
            {
                title: 'Offerings',
                href: '#',
                icon: Heart,
            },
            {
                title: 'Donations',
                href: '#',
                icon: Gift,
            },
            {
                title: 'Expenses',
                href: '#',
                icon: TrendingDown,
            },
            {
                title: 'Budgets',
                href: '#',
                icon: BarChart3,
            },
        ],
    },

    {
        label: 'Events & Content',
        items: [
            {
                title: 'Events',
                href: '#',
                icon: Calendar,
            },
            {
                title: 'Announcements',
                href: '#',
                icon: Megaphone,
            },
            {
                title: 'Documents',
                href: '#',
                icon: FileText,
            },
        ],
    },

    {
        label: 'Reports',
        items: [
            {
                title: 'Reports',
                href: '#',
                icon: PieChart,
            },
        ],
    },

    {
        label: 'System',
        defaultOpen: true,
        items: [
            {
                title: 'Users',
                href: adminUsersIndex.url(),
                icon: UserCog,
                permission: 'users.view',
            },
            {
                title: 'Roles',
                href: adminRolesIndex.url(),
                icon: ShieldCheck,
                permission: 'roles.view',
            },
            {
                title: 'Permissions',
                href: adminPermissionsIndex.url(),
                icon: Lock,
                permission: 'permissions.view',
            },
            {
                title: 'Notifications',
                href: '#',
                icon: Bell,
            },
            {
                title: 'Audit Logs',
                href: '#',
                icon: ClipboardList,
            },
            {
                title: 'Settings',
                href: '/settings/profile',
                icon: Settings,
            },
        ],
    },
];

function isActiveHref(currentUrl: string, href: string): boolean {
    const path = currentUrl.split('?')[0];
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
}

export function AppSidebar() {
    const { url, props } = usePage<SharedData>();
    const { can, isMemberOnly } = usePermissions();

    const badges: Record<NonNullable<ChurchNavItem['badgeKey']>, number> = {
        pendingMembers: props.pendingMembersCount ?? 0,
        activePrayers: props.activePrayerCount ?? 0,
    };

    // Member-only users see just the portal. Staff see items they have
    // permission for; groups left empty are hidden.
    const visibleGroups = isMemberOnly
        ? []
        : navGroups
              .map((group) => ({
                  ...group,
                  items: group.items.filter((item) => can(item.permission)),
              }))
              .filter((group) => group.items.length > 0);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={isMemberOnly ? portal() : dashboard()}
                                prefetch
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain
                    items={isMemberOnly ? memberNavItems : staffNavItems}
                />

                {visibleGroups.map((group) => (
                    <Collapsible
                        key={group.label}
                        defaultOpen={group.defaultOpen}
                        className="group/collapsible"
                    >
                        <SidebarGroup>
                            <SidebarGroupLabel asChild>
                                <CollapsibleTrigger className="flex w-full items-center">
                                    {group.label}
                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {group.items.map((item) => (
                                            <SidebarMenuItem key={item.title}>
                                                {item.href === '#' ? (
                                                    // Module not built yet — a disabled entry instead of a dead link.
                                                    <SidebarMenuButton
                                                        disabled
                                                        tooltip={`${item.title} (coming soon)`}
                                                        className="opacity-50"
                                                    >
                                                        <item.icon />
                                                        <span>
                                                            {item.title}
                                                        </span>
                                                        <span className="ml-auto text-[10px] uppercase">
                                                            Soon
                                                        </span>
                                                    </SidebarMenuButton>
                                                ) : (
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={isActiveHref(
                                                            url,
                                                            item.href,
                                                        )}
                                                        tooltip={item.title}
                                                    >
                                                        <Link
                                                            href={item.href}
                                                            prefetch
                                                        >
                                                            <item.icon />
                                                            <span>
                                                                {item.title}
                                                            </span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                )}
                                                {item.badgeKey &&
                                                badges[item.badgeKey] > 0 ? (
                                                    <SidebarMenuBadge>
                                                        {badges[item.badgeKey]}
                                                    </SidebarMenuBadge>
                                                ) : null}
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                ))}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
