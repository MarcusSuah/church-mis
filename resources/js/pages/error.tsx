import { Head, Link } from '@inertiajs/react';
import Icon from '@/components/ssbcms/AppIcon';

const COPY: Record<number, { title: string; text: string; icon: string }> = {
    403: {
        title: 'Access Denied',
        text: "You don't have permission to view this page.",
        icon: 'LockClosedIcon',
    },
    404: {
        title: 'Page Not Found',
        text: "The page you're looking for doesn't exist. Let's get you back!",
        icon: 'MapIcon',
    },
    500: {
        title: 'Something Went Wrong',
        text: 'An unexpected error happened on our side. Please try again in a moment.',
        icon: 'ExclamationTriangleIcon',
    },
    503: {
        title: 'Under Maintenance',
        text: "We're doing some maintenance. Please check back shortly.",
        icon: 'WrenchScrewdriverIcon',
    },
};

export default function ErrorPage({
    status,
    message,
}: {
    status: number;
    message?: string;
}) {
    const copy = COPY[status] ?? COPY[500];
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
                <p className="mb-8 text-muted-foreground">
                    {status === 403 && message ? message : copy.text}
                </p>
                <div className="flex flex-col justify-center gap-4 sm:flex-row">
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
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 font-medium text-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
                    >
                        <Icon name="HomeIcon" size={16} />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
