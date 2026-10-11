import { Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSite } from '@/lib/site';

const NAV = [
    { to: '/about', label: 'About' },
    { to: '/church/leadership', label: 'Leadership' },
    { to: '/church/ministries', label: 'Ministries' },
    { to: '/church/departments', label: 'Departments' },
    { to: '/church/events', label: 'Events' },
    { to: '/church/sermons', label: 'Sermons' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/church/news', label: 'News' },
    { to: '/contact', label: 'Contact' },
] as const;

type AuthProps = { auth: { user: { roles?: string[] } | null } };

function Brand({ compact = false }: { compact?: boolean }) {
    const { get } = useSite();
    const logo = get('logo_url');
    return (
        <Link href="/" className="flex items-center gap-3">
            {logo ? (
                <img
                    src={logo}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-sm object-contain"
                />
            ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-accent font-display text-sm font-bold text-accent-foreground">
                    {get('short_name', 'SSBC')}
                </span>
            )}
            {!compact && (
                <span className="hidden leading-tight sm:block">
                    <span className="block font-display text-sm font-bold">
                        {get('name', 'Saint Simon Baptist Church')}
                    </span>
                    <span className="block text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
                        {get('tagline', 'Established in faith')}
                    </span>
                </span>
            )}
        </Link>
    );
}

export function SiteHeader() {
    const [open, setOpen] = useState(false);
    const { url, props } = usePage<AuthProps>();
    const user = props.auth?.user;
    const roles = user?.roles ?? [];
    const isStaff = roles.some((r) => r !== 'Member');
    const path = url.split('?')[0];
    const isActive = (to: string) => path === to || path.startsWith(`${to}/`);

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
                <Brand />

                <nav className="hidden items-center gap-0.5 xl:flex">
                    {NAV.map((item) => (
                        <Link
                            key={item.to}
                            href={item.to}
                            className={`rounded-sm px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:text-foreground ${isActive(item.to) ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    {user ? (
                        <Button asChild size="sm">
                            <Link
                                href={isStaff ? '/dashboard' : '/member-portal'}
                            >
                                {isStaff ? 'Admin dashboard' : 'My Portal'}
                            </Link>
                        </Button>
                    ) : (
                        <>
                            <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="hidden sm:inline-flex"
                            >
                                <Link href="/login">Sign in</Link>
                            </Button>
                            <Button asChild size="sm">
                                <Link href="/public-member-registration">
                                    Register
                                </Link>
                            </Button>
                        </>
                    )}
                    <button
                        type="button"
                        aria-label="Toggle navigation"
                        onClick={() => setOpen((v) => !v)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border xl:hidden"
                    >
                        {open ? (
                            <X className="h-4 w-4" />
                        ) : (
                            <Menu className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {open && (
                <nav className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-background xl:hidden">
                    <div className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:grid-cols-2 sm:px-6">
                        {NAV.map((item) => (
                            <Link
                                key={item.to}
                                href={item.to}
                                onClick={() => setOpen(false)}
                                className={`rounded-sm px-2 py-2 text-sm font-medium hover:bg-muted hover:text-foreground ${isActive(item.to) ? 'text-foreground' : 'text-muted-foreground'}`}
                            >
                                {item.label}
                            </Link>
                        ))}
                        {!user && (
                            <Link
                                href="/login"
                                onClick={() => setOpen(false)}
                                className="rounded-sm px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                Sign in
                            </Link>
                        )}
                    </div>
                </nav>
            )}
        </header>
    );
}

export function SiteFooter() {
    const { get } = useSite();
    // Privacy Policy, Terms… (published pages marked "show in footer" under System → Pages).
    const footerPages =
        usePage<{ footerPages?: { title: string; url: string }[] }>().props
            .footerPages ?? [];
    const services = [
        ['Sunday School', get('service_sunday_school')],
        ['Sunday Worship', get('service_sunday_worship')],
        ['Bible Study', get('service_bible_study')],
        ['Prayer Meeting', get('service_prayer_meeting')],
    ].filter(([, v]) => v);

    return (
        <footer className="mt-20 surface-sanctuary">
            <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
                <div className="md:col-span-2">
                    <p className="font-display text-xl font-bold">
                        {get('name', 'Saint Simon Baptist Church')}
                    </p>
                    <p className="mt-3 max-w-md text-sm opacity-80">
                        {get('description')}
                    </p>
                </div>
                <div>
                    <p className="eyebrow">Service Times</p>
                    <ul className="mt-4 space-y-2 text-sm opacity-85">
                        {services.map(([label, value]) => (
                            <li key={label}>
                                <span className="font-semibold">{label}:</span>{' '}
                                {value}
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <p className="eyebrow">Contact</p>
                    <ul className="mt-4 space-y-2 text-sm opacity-85">
                        {get('address') && <li>{get('address')}</li>}
                        {(get('city') || get('country')) && (
                            <li>
                                {[get('city'), get('country')]
                                    .filter(Boolean)
                                    .join(', ')}
                            </li>
                        )}
                        {get('phone') && <li>{get('phone')}</li>}
                        {get('email') && <li>{get('email')}</li>}
                    </ul>
                </div>
            </div>
            <div className="border-t border-primary-foreground/15">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-xs opacity-70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <span>
                        &copy; {new Date().getFullYear()} {get('name')}. All
                        rights reserved.
                    </span>
                    <nav
                        aria-label="Legal"
                        className="flex flex-wrap gap-x-4 gap-y-1"
                    >
                        {footerPages.map((p) => (
                            <Link
                                key={p.url}
                                href={p.url}
                                className="hover:underline"
                            >
                                {p.title}
                            </Link>
                        ))}
                        <Link href="/gallery" className="hover:underline">
                            Gallery
                        </Link>
                        <Link href="/contact" className="hover:underline">
                            Contact
                        </Link>
                    </nav>
                </div>
            </div>
        </footer>
    );
}

export function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
        </div>
    );
}

export function PageHeader({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description?: string;
}) {
    return (
        <section className="surface-sanctuary">
            <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20">
                <p className="eyebrow">{eyebrow}</p>
                <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold md:text-5xl">
                    {title}
                </h1>
                {description && (
                    <p className="mt-4 max-w-2xl text-sm opacity-80 md:text-base">
                        {description}
                    </p>
                )}
            </div>
        </section>
    );
}
