import { Link, router, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import { initialsOf } from '@/components/ssbcms/Sidebar';
import { usePermissions } from '@/hooks/use-permissions';
import { logout } from '@/routes';
import type { SharedData } from '@/types';

export type NotificationItem = {
    id: string;
    title: string;
    message: string;
    type: string;
    link_url: string | null;
    sent_at: string | null;
    is_read: boolean;
};

export function timeAgo(iso: string | null) {
    if (!iso) return '';
    const mins = Math.max(
        0,
        Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
    );
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return days < 30
        ? `${days}d ago`
        : new Date(iso).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          });
}

/** Closes a dropdown when clicking outside it. */
function useOutside(
    ref: React.RefObject<HTMLElement | null>,
    onOutside: () => void,
) {
    useEffect(() => {
        const h = (e: MouseEvent) =>
            ref.current &&
            !ref.current.contains(e.target as Node) &&
            onOutside();
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [ref, onOutside]);
}

export default function Topbar({
    offset,
    onMobileMenuToggle,
}: {
    offset: string;
    onMobileMenuToggle: () => void;
}) {
    const { props } = usePage<SharedData>();
    const { can, isMemberOnly, roles } = usePermissions();
    const user = props.auth.user;
    const summary = (props.notificationSummary as {
        unread: number;
        items: NotificationItem[];
    } | null) ?? { unread: 0, items: [] };

    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [q, setQ] = useState('');
    const bellRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);
    useOutside(bellRef, () => setShowNotifications(false));
    useOutside(userRef, () => setShowUserMenu(false));

    const search = (e: FormEvent) => {
        e.preventDefault();
        if (q.trim()) router.get('/member-management', { search: q.trim() });
    };

    const openNotification = (n: NotificationItem) => {
        setShowNotifications(false);
        router.post(
            `/notifications/${n.id}/read`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => n.link_url && router.visit(n.link_url),
            },
        );
    };

    const markAllRead = () =>
        router.post(
            '/notifications/read-all',
            {},
            { preserveScroll: true, preserveState: true },
        );

    const roleLabel = isMemberOnly ? 'Church Member' : (roles[0] ?? 'Staff');

    return (
        <header
            className="content-transition fixed top-0 right-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-card px-3 sm:px-4 lg:px-6"
            style={{ height: 'var(--topbar-height)', left: offset }}
        >
            {/* Left */}
            <div className="flex items-center gap-3">
                <button
                    className="rounded-lg p-2 transition-colors hover:bg-muted lg:hidden"
                    onClick={onMobileMenuToggle}
                    aria-label="Toggle mobile menu"
                >
                    <Icon
                        name="Bars3Icon"
                        size={20}
                        className="text-muted-foreground"
                    />
                </button>
                {can('members.view') && !isMemberOnly && (
                    <form
                        onSubmit={search}
                        className="hidden w-72 items-center gap-2 rounded-lg bg-muted px-3 py-2 md:flex"
                    >
                        <Icon
                            name="MagnifyingGlassIcon"
                            size={16}
                            className="shrink-0 text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search members..."
                            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                        />
                        <kbd className="hidden rounded border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground lg:block">
                            ↵
                        </kbd>
                    </form>
                )}
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
                {!isMemberOnly && can('members.create') && (
                    <a
                        href="/public-member-registration"
                        className="btn-ghost hidden md:flex"
                    >
                        <Icon name="UserPlusIcon" size={16} />
                        <span className="text-xs">New Registration</span>
                    </a>
                )}

                {/* Notifications */}
                <div className="relative" ref={bellRef}>
                    <button
                        className="relative rounded-lg p-2 transition-colors hover:bg-muted"
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            setShowUserMenu(false);
                        }}
                        aria-label={`${summary.unread} unread notifications`}
                    >
                        <Icon
                            name="BellIcon"
                            size={20}
                            className="text-muted-foreground"
                        />
                        {summary.unread > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                                {summary.unread > 9 ? '9+' : summary.unread}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="scale-in absolute top-full right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card shadow-elevated">
                            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Notifications
                                </h3>
                                {summary.unread > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="text-xs font-medium text-accent hover:underline"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-80 scrollbar-thin overflow-y-auto">
                                {summary.items.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                                        You're all caught up.
                                    </p>
                                ) : (
                                    summary.items.map((n) => (
                                        <button
                                            key={n.id}
                                            onClick={() => openNotification(n)}
                                            className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50 ${n.is_read ? '' : 'bg-info-bg/30'}`}
                                        >
                                            <div
                                                className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-accent'}`}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-foreground">
                                                    {n.title}
                                                </p>
                                                <p className="line-clamp-2 text-xs leading-relaxed text-foreground">
                                                    {n.message}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {timeAgo(n.sent_at)}
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                            <div className="border-t border-border px-4 py-2">
                                <Link
                                    href="/notifications"
                                    onClick={() => setShowNotifications(false)}
                                    className="block w-full text-center text-xs font-medium text-primary hover:underline"
                                >
                                    View all notifications
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* User menu */}
                <div className="relative" ref={userRef}>
                    <button
                        className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted"
                        onClick={() => {
                            setShowUserMenu(!showUserMenu);
                            setShowNotifications(false);
                        }}
                    >
                        {user?.avatar ? (
                            <img
                                src={user.avatar}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="gradient-gold flex h-8 w-8 items-center justify-center rounded-full">
                                <span className="text-xs font-bold text-white">
                                    {initialsOf(user?.name)}
                                </span>
                            </div>
                        )}
                        <div className="hidden text-left md:block">
                            <p className="text-xs font-semibold text-foreground">
                                {user?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {roleLabel}
                            </p>
                        </div>
                        <Icon
                            name="ChevronDownIcon"
                            size={14}
                            className="hidden text-muted-foreground md:block"
                        />
                    </button>

                    {showUserMenu && (
                        <div className="scale-in absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-card shadow-elevated">
                            <div className="border-b border-border px-4 py-3">
                                <p className="text-xs font-semibold text-foreground">
                                    {user?.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                            <div className="py-1">
                                {[
                                    {
                                        id: 'menu-portal',
                                        label: 'Member Portal',
                                        icon: 'UserIcon',
                                        href: '/member-portal',
                                    },
                                    {
                                        id: 'menu-settings',
                                        label: 'Settings',
                                        icon: 'Cog6ToothIcon',
                                        href: '/settings/profile',
                                    },
                                    {
                                        id: 'menu-password',
                                        label: 'Change Password',
                                        icon: 'KeyIcon',
                                        href: '/change-password',
                                    },
                                ].map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={() => setShowUserMenu(false)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                                    >
                                        <Icon
                                            name={item.icon}
                                            size={14}
                                            className="text-muted-foreground"
                                        />
                                        {item.label}
                                    </Link>
                                ))}
                                <div className="mt-1 border-t border-border pt-1">
                                    <Link
                                        href={logout()}
                                        as="button"
                                        onClick={() => router.flushAll()}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger transition-colors hover:bg-danger/5"
                                    >
                                        <Icon
                                            name="ArrowRightOnRectangleIcon"
                                            size={14}
                                        />
                                        Sign Out
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
