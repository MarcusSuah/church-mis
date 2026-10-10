import type { Auth, SharedData } from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            pendingMembersCount?: number | null;
            activePrayerCount?: number | null;
            church?: { name: string; short_name: string };
            notificationSummary?: SharedData['notificationSummary'];
            [key: string]: unknown;
        };
    }
}
