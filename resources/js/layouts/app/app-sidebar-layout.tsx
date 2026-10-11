import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { PdfViewerHost } from '@/components/ssbcms/PdfViewer';
import Sidebar from '@/components/ssbcms/Sidebar';
import Topbar from '@/components/ssbcms/Topbar';
import { useScreenLock } from '@/hooks/use-screen-lock';
import type { AppLayoutProps, SharedData } from '@/types';

/**
 * App shell matching the SSBCMS reference: fixed navy sidebar (collapsible,
 * remembered in the sidebar_state cookie), fixed top bar, content on the right.
 */
/** True below Tailwind's lg breakpoint, where the sidebar becomes a drawer. */
function useBelowLg() {
    const query = '(max-width: 1023px)';
    // Start with the server-rendered value (desktop) and read the real width after mount, so hydration matches.
    const [match, setMatch] = useState(false);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const on = () => setMatch(mql.matches);
        on();
        mql.addEventListener('change', on);
        return () => mql.removeEventListener('change', on);
    }, []);
    return match;
}

export default function AppSidebarLayout({ children }: AppLayoutProps) {
    const { props } = usePage<SharedData>();
    const isMobile = useBelowLg();
    const [collapsed, setCollapsed] = useState(!props.sidebarOpen);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Lock the screen after the idle time set in Church Settings.
    useScreenLock(props.screenLock?.minutes ?? 0);

    // Close the mobile drawer after navigating.
    useEffect(() => router.on('navigate', () => setMobileOpen(false)), []);

    // Collapse/expand on click; remembered in the sidebar_state cookie ("true" = expanded).
    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        document.cookie = `sidebar_state=${next ? 'false' : 'true'}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    };

    const effectiveCollapsed = isMobile ? false : collapsed;

    return (
        <div className="min-h-screen bg-background">
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 fade-in lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <div className={`lg:block ${mobileOpen ? 'block' : 'hidden'}`}>
                <Sidebar
                    collapsed={effectiveCollapsed}
                    onToggle={toggle}
                    onClose={isMobile ? () => setMobileOpen(false) : undefined}
                />
            </div>

            {/* On phones and tablets the sidebar is a drawer, so the top bar spans the full width. */}
            <Topbar
                offset={
                    isMobile
                        ? '0px'
                        : effectiveCollapsed
                          ? 'var(--sidebar-collapsed)'
                          : 'var(--sidebar-width)'
                }
                onMobileMenuToggle={() => setMobileOpen((o) => !o)}
            />

            <main
                className="content-transition min-h-screen pt-[var(--topbar-height)]"
                style={{
                    marginLeft: isMobile
                        ? 0
                        : effectiveCollapsed
                          ? 'var(--sidebar-collapsed)'
                          : 'var(--sidebar-width)',
                }}
            >
                <div className="mx-auto max-w-screen-2xl">{children}</div>
            </main>
            <PdfViewerHost />
        </div>
    );
}
