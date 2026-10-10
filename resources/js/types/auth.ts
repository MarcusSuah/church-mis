export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    roles: string[];
    permissions: string[];
    /** True when the user's only role is Member (they use the member portal). */
    is_member_only: boolean;
    /** Still on the default/temporary password. */
    must_change_password?: boolean;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type SharedData = {
    name: string;
    auth: Auth;
    sidebarOpen: boolean;
    pendingMembersCount?: number | null;
    activePrayerCount?: number | null;
    birthdaysTodayCount?: number | null;
    church?: { name: string; short_name: string };
    notificationSummary?: {
        unread: number;
        items: {
            id: string;
            title: string;
            message: string;
            type: string;
            link_url: string | null;
            sent_at: string | null;
            is_read: boolean;
        }[];
    } | null;
    [key: string]: unknown;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
