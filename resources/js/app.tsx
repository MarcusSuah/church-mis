import { createInertiaApp } from '@inertiajs/react';
import GlobalLoader from '@/components/global-loader';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'SSBC';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name === 'public-member-registration':
            case name === 'auth/change-password':
            case name === 'auth/lock-screen':
            case name === 'error':
            case name.startsWith('site/'):
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
                <GlobalLoader />
            </TooltipProvider>
        );
    },
    progress: {
        // The thin top bar; GlobalLoader adds a clearer indicator for slower pages.
        color: '#c9a227',
        delay: 150,
    },
});

// This will set light / dark mode on load...
initializeTheme();
