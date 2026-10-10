import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    ChevronDown,
    KeyRound,
    LogOut,
    Search,
    Settings,
    User,
    UserPlus,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useInitials } from '@/hooks/use-initials';
import { usePermissions } from '@/hooks/use-permissions';
import { logout } from '@/routes';
import { portal } from '@/routes/member';
import { create as publicRegistration } from '@/routes/public-registration';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

type NotificationItem = {
    id: string;
    message: string;
    time: string;
    unread: boolean;
};

type SidebarPageProps = {
    auth: {
        user: {
            name: string;
            email: string;
            avatar?: string | null;
        };
    };
};

// Same mock data as the original Topbar — swap for a real notifications feed
// when one exists.
const notifications: NotificationItem[] = [
    {
        id: 'notif-1',
        message: 'New member registration from Grace Amara Osei',
        time: '5 min ago',
        unread: true,
    },
    {
        id: 'notif-2',
        message: 'Prayer request submitted by Emmanuel Kweku Mensah',
        time: '18 min ago',
        unread: true,
    },
    {
        id: 'notif-3',
        message: 'Member Abena Asante approved by Church Administrator',
        time: '1 hr ago',
        unread: true,
    },
    {
        id: 'notif-4',
        message: "Today is Pastor James Boateng's birthday \u{1F382}",
        time: '2 hr ago',
        unread: false,
    },
    {
        id: 'notif-5',
        message: 'Sunday Worship Service starts in 2 days',
        time: '3 hr ago',
        unread: false,
    },
];

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage<SidebarPageProps>().props;
    const getInitials = useInitials();
    const { can, isMemberOnly } = usePermissions();
    const unreadCount = notifications.filter((n) => n.unread).length;

    return (
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-2">
                {!isMemberOnly && (
                    <div className="hidden items-center gap-2 rounded-lg bg-muted px-3 py-2 md:flex md:w-72">
                        <Search className="size-4 shrink-0 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search members, events, sermons..."
                            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />
                        <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-xs text-muted-foreground lg:block">
                            ⌘K
                        </kbd>
                    </div>
                )}

                {can('members.create') && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hidden md:flex"
                        asChild
                    >
                        <Link href={publicRegistration()}>
                            <UserPlus className="size-4" />
                            New Registration
                        </Link>
                    </Button>
                )}

                {/* Staff notifications (sample data for now); members use the portal's Notifications. */}
                {!isMemberOnly && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="relative"
                                aria-label={`${unreadCount} unread notifications`}
                            >
                                <Bell className="size-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel className="flex items-center justify-between font-normal">
                                <span className="font-semibold">
                                    Notifications
                                </span>
                                <button className="text-xs font-medium text-primary hover:underline">
                                    Mark all read
                                </button>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`flex gap-3 border-b border-border px-2 py-2 last:border-0 ${
                                            n.unread ? 'bg-primary/5' : ''
                                        }`}
                                    >
                                        <div
                                            className={`mt-1.5 size-2 shrink-0 rounded-full ${
                                                n.unread
                                                    ? 'bg-primary'
                                                    : 'bg-transparent'
                                            }`}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs leading-relaxed text-foreground">
                                                {n.message}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {n.time}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <DropdownMenuSeparator />
                            <button className="w-full py-1 text-center text-xs font-medium text-primary hover:underline">
                                View all notifications
                            </button>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 px-1.5"
                        >
                            <Avatar className="size-8">
                                <AvatarImage
                                    src={auth.user.avatar}
                                    alt={auth.user.name}
                                />
                                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                                    {getInitials(auth.user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden text-left md:block">
                                <p className="text-xs font-semibold text-foreground">
                                    {auth.user.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {auth.user.email}
                                </p>
                            </div>
                            <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                            <p className="text-xs font-semibold text-foreground">
                                {auth.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {auth.user.email}
                            </p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={portal()}>
                                <User className="size-4" />
                                Member Portal
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={editProfile()}>
                                <Settings className="size-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={editSecurity()}>
                                <KeyRound className="size-4" />
                                Change Password
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            asChild
                            className="text-destructive focus:text-destructive"
                        >
                            <Link
                                method="post"
                                href={logout()}
                                as="button"
                                className="w-full"
                            >
                                <LogOut className="size-4" />
                                Sign Out
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
