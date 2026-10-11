import { Head, Link, usePage } from '@inertiajs/react';
import Icon from '@/components/ssbcms/AppIcon';

type ErrorCopy = { title: string; text: string; icon: string; hint?: string };

/**
 * One friendly page for every HTTP error (bootstrap/app.php sends full page
 * loads here). resources/views/errors/*.blade.php show the same wording when
 * the app itself can't start (server error, maintenance).
 */
const COPY: Record<number, ErrorCopy> = {
    401: {
        title: 'Please Sign In',
        text: 'You need to be signed in to see this page.',
        icon: 'KeyIcon',
        hint: 'Sign in with your church account and try again.',
    },
    402: {
        title: 'Payment Required',
        text: 'This feature is not available on the current plan.',
        icon: 'CreditCardIcon',
        hint: 'Please contact the church office for help.',
    },
    403: {
        title: 'Access Denied',
        text: "You don't have permission to view this page.",
        icon: 'ShieldExclamationIcon',
        hint: 'If you think you should have access, ask an administrator to check your role.',
    },
    404: {
        title: 'Page Not Found',
        text: "The page you're looking for doesn't exist or has been moved.",
        icon: 'MapIcon',
        hint: 'Check the address, or start again from the home page.',
    },
    405: {
        title: 'Action Not Allowed',
        text: "That action can't be done on this page.",
        icon: 'NoSymbolIcon',
        hint: 'Go back and use the buttons on the page instead.',
    },
    419: {
        title: 'Session Expired',
        text: 'This page was open for too long and its security token expired.',
        icon: 'ClockIcon',
        hint: 'Reload the page and try again. Nothing was saved.',
    },
    429: {
        title: 'Too Many Requests',
        text: "You've made too many requests in a short time.",
        icon: 'PauseCircleIcon',
        hint: 'Please wait a minute, then try again.',
    },
    500: {
        title: 'Something Went Wrong',
        text: 'An unexpected error happened on our side.',
        icon: 'ExclamationTriangleIcon',
        hint: 'Please try again in a moment. If it keeps happening, contact the church office.',
    },
    503: {
        title: 'Under Maintenance',
        text: "We're making some improvements right now.",
        icon: 'WrenchIcon',
        hint: 'Please check back in a few minutes.',
    },
};

export default function ErrorPage({
    status,
    message,
}: {
    status: number;
    message?: string;
}) {
    const { auth } = usePage<{ auth?: { user?: unknown } }>().props;
    const signedIn = Boolean(auth?.user);
    const copy = COPY[status] ?? (status >= 500 ? COPY[500] : COPY[404]);
    // Only 403 messages come from our own code ("You cannot change…"); others stay generic.
    const text = status === 403 && message ? message : copy.text;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Head title={copy.title} />
            <div className="max-w-md text-center">
                <div className="relative mb-6 flex justify-center">
                    <h1 className="text-9xl font-bold text-primary opacity-20 select-none">
                        {status}
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-elevated">
                            <Icon
                                name={copy.icon}
                                size={30}
                                className="text-accent"
                            />
                        </div>
                    </div>
                </div>
                <h2 className="mb-2 text-2xl font-semibold text-foreground">
                    {copy.title}
                </h2>
                <p className="text-muted-foreground">{text}</p>
                {copy.hint && (
                    <p className="mt-2 text-sm text-muted-foreground">
                        {copy.hint}
                    </p>
                )}
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    {status === 419 ? (
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
                        >
                            <Icon name="ArrowPathIcon" size={16} />
                            Reload Page
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                window.history.length > 1
                                    ? window.history.back()
                                    : (window.location.href = '/')
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
                        >
                            <Icon name="ArrowLeftIcon" size={16} />
                            Go Back
                        </button>
                    )}
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 font-medium text-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
                    >
                        <Icon name="HomeIcon" size={16} />
                        Home
                    </Link>
                    {signedIn ? (
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 font-medium text-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
                        >
                            <Icon name="Squares2X2Icon" size={16} />
                            Dashboard
                        </Link>
                    ) : (
                        status === 401 && (
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 font-medium text-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
                            >
                                <Icon name="ArrowRightOnRectangleIcon" size={16} />
                                Sign In
                            </Link>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
