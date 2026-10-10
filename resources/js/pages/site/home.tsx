import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarDays,
    Clock,
    MapPin,
    Mic,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { PublicLayout } from '@/components/site/PublicLayout';
import { Button } from '@/components/ui/button';
import { safeUrl } from '@/lib/safe-url';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, useSite } from '@/lib/site';

type Slide = {
    id: number;
    eyebrow: string | null;
    title: string;
    subtitle: string | null;
    image_url: string | null;
    primary_label: string | null;
    primary_url: string | null;
    secondary_label: string | null;
    secondary_url: string | null;
};
type Item = {
    id: string;
    href?: string;
    title: string;
    subtitle?: string | null;
    badge?: string | null;
    body?: string | null;
    date?: string | null;
    meta?: string[];
};
type Props = {
    slides: Slide[];
    events: Item[];
    sermons: Item[];
    announcements: Item[];
    ministries: {
        id: string;
        href: string;
        name: string;
        description: string | null;
    }[];
    departments: { id: string; href: string; name: string }[];
};

function SectionHeading({
    eyebrow,
    title,
    action,
}: {
    eyebrow: string;
    title: string;
    action?: { to: string; label: string };
}) {
    return (
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
                <p className="eyebrow">{eyebrow}</p>
                <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">
                    {title}
                </h2>
            </div>
            {action && (
                <Link
                    href={action.to}
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                    {action.label} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            )}
        </div>
    );
}

/**
 * Hero button link. Pages on this site use Inertia; other websites open in a
 * new tab. Unsafe URLs (javascript:, data:) are not rendered as links.
 */
function SlideLink({
    href,
    children,
    ...rest
}: { href: string; children: ReactNode } & Record<string, unknown>) {
    const url = safeUrl(href);
    if (!url) return <span {...rest}>{children}</span>;
    if (new URL(url).origin !== window.location.origin) {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" {...rest}>
                {children}
            </a>
        );
    }
    return (
        <Link href={url} {...rest}>
            {children}
        </Link>
    );
}

/** Active hero slides; several rotate every 7 seconds. */
function Hero({ slides }: { slides: Slide[] }) {
    const { get } = useSite();
    const [i, setI] = useState(0);
    useEffect(() => {
        if (slides.length < 2) return;
        const t = setInterval(() => setI((n) => (n + 1) % slides.length), 7000);
        return () => clearInterval(t);
    }, [slides.length]);

    const s: Slide = slides[i] ?? {
        id: 0,
        eyebrow: get('short_name', 'SSBC'),
        title: get('name', 'Saint Simon Baptist Church'),
        subtitle: get('description'),
        image_url: null,
        primary_label: 'Become a member',
        primary_url: '/public-member-registration',
        secondary_label: 'Plan your visit',
        secondary_url: '/about',
    };

    return (
        <section className="relative isolate overflow-hidden bg-primary">
            {s.image_url && (
                <img
                    key={s.id}
                    src={s.image_url}
                    alt=""
                    width={1920}
                    height={1088}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
            <div className="absolute inset-0 bg-primary/85" />
            <div className="relative mx-auto w-full max-w-7xl px-4 py-24 text-primary-foreground sm:px-6 md:py-36">
                {s.eyebrow && <p className="eyebrow">{s.eyebrow}</p>}
                <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight font-bold md:text-6xl">
                    {s.title}
                </h1>
                {s.subtitle && (
                    <p className="mt-6 max-w-xl text-base opacity-85 md:text-lg">
                        {s.subtitle}
                    </p>
                )}
                <div className="mt-9 flex flex-wrap gap-3">
                    {s.primary_label && s.primary_url && (
                        <Button asChild size="lg" variant="secondary">
                            <SlideLink href={s.primary_url}>
                                {s.primary_label}
                            </SlideLink>
                        </Button>
                    )}
                    {s.secondary_label && s.secondary_url && (
                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                        >
                            <SlideLink href={s.secondary_url}>
                                {s.secondary_label}
                            </SlideLink>
                        </Button>
                    )}
                </div>
                {slides.length > 1 && (
                    <div className="mt-10 flex gap-2">
                        {slides.map((x, n) => (
                            <button
                                key={x.id}
                                type="button"
                                aria-label={`Slide ${n + 1}`}
                                onClick={() => setI(n)}
                                className={`h-1.5 rounded-full transition-all ${n === i ? 'w-8 bg-accent' : 'w-3 bg-primary-foreground/40'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

export default function Home({
    slides,
    events,
    sermons,
    announcements,
    ministries,
    departments,
}: Props) {
    const { get } = useSite();
    const services = [
        { label: 'Sunday School', value: get('service_sunday_school') },
        { label: 'Sunday Worship', value: get('service_sunday_worship') },
        { label: 'Bible Study', value: get('service_bible_study') },
        { label: 'Prayer Meeting', value: get('service_prayer_meeting') },
    ].filter((s) => s.value);

    return (
        <PublicLayout>
            <Head
                title={`${get('name', 'Saint Simon Baptist Church')} — Worship, Discipleship, Service`}
            >
                <meta name="description" content={get('description')} />
                <meta property="og:title" content={get('name')} />
                <meta property="og:description" content={get('description')} />
            </Head>

            <Hero slides={slides} />

            {services.length > 0 && (
                <section className="border-b border-border bg-card">
                    <div
                        className={`mx-auto grid w-full max-w-7xl gap-px px-4 py-10 sm:grid-cols-2 sm:px-6 md:grid-cols-${Math.min(4, services.length)}`}
                    >
                        {services.map((s) => (
                            <div key={s.label} className="px-2 py-3">
                                <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                    <Clock className="h-3.5 w-3.5 text-accent" />{' '}
                                    {s.label}
                                </p>
                                <p className="mt-2 font-display text-lg">
                                    {s.value}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
                <div className="grid gap-12 md:grid-cols-2">
                    <div>
                        <p className="eyebrow">Welcome</p>
                        <h2 className="mt-2 font-display text-2xl font-bold md:text-4xl">
                            You are welcome at this table
                        </h2>
                        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                            <p>
                                Whether you are visiting for the first time,
                                returning after many years, or looking for a
                                church family to call home, there is a place for
                                you at {get('name', 'our church')}.
                            </p>
                            <p>{get('mission')}</p>
                        </div>
                        <Button asChild variant="link" className="mt-4 px-0">
                            <Link href="/about">
                                More about our church{' '}
                                <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>

                    {get('pastor_message') && (
                        <Card className="border-accent/30 bg-secondary">
                            <CardContent className="p-8">
                                <p className="eyebrow">
                                    A word from our pastor
                                </p>
                                <blockquote className="mt-4 font-display text-lg leading-relaxed md:text-xl">
                                    &ldquo;{get('pastor_message')}&rdquo;
                                </blockquote>
                                <p className="mt-6 text-sm font-semibold">
                                    {get('senior_pastor', 'Senior Pastor')}
                                </p>
                                <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                                    Senior Pastor
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </section>

            <section className="bg-card py-20">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
                    <SectionHeading
                        eyebrow="Church calendar"
                        title="Upcoming events"
                        action={{ to: '/church/events', label: 'All events' }}
                    />
                    {events.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-3">
                            {events.map((e) => (
                                <Card key={e.id} className="h-full">
                                    <CardContent className="flex h-full flex-col p-6">
                                        {e.badge && (
                                            <p className="eyebrow">{e.badge}</p>
                                        )}
                                        <h3 className="mt-2 font-display text-lg font-bold">
                                            {e.href ? (
                                                <Link
                                                    href={e.href}
                                                    className="hover:text-accent hover:underline"
                                                >
                                                    {e.title}
                                                </Link>
                                            ) : (
                                                e.title
                                            )}
                                        </h3>
                                        <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
                                            {e.body}
                                        </p>
                                        <div className="mt-5 space-y-1.5 text-xs text-muted-foreground">
                                            {e.meta?.[0] && (
                                                <p className="flex items-center gap-2">
                                                    <CalendarDays className="h-3.5 w-3.5 text-accent" />
                                                    {e.meta[0]}
                                                </p>
                                            )}
                                            {e.meta?.[1] && (
                                                <p className="flex items-center gap-2">
                                                    <MapPin className="h-3.5 w-3.5 text-accent" />
                                                    {e.meta[1]}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No upcoming events are scheduled yet.
                        </p>
                    )}
                </div>
            </section>

            {(ministries.length > 0 || departments.length > 0) && (
                <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
                    {ministries.length > 0 && (
                        <>
                            <SectionHeading
                                eyebrow="Serve and belong"
                                title="Ministries of the church"
                                action={{
                                    to: '/church/ministries',
                                    label: 'Explore ministries',
                                }}
                            />
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {ministries.map((m) => (
                                    <div
                                        key={m.id}
                                        className="border-l-2 border-accent/50 py-2 pl-4"
                                    >
                                        <p className="flex items-center gap-2 font-display text-sm font-bold">
                                            <Users className="h-4 w-4 text-accent" />
                                            <Link
                                                href={m.href}
                                                className="hover:text-accent hover:underline"
                                            >
                                                {m.name}
                                            </Link>
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                            {m.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {departments.length > 0 && (
                        <div className={ministries.length ? 'mt-14' : ''}>
                            <SectionHeading
                                eyebrow="Organised for service"
                                title="Church departments"
                                action={{
                                    to: '/church/departments',
                                    label: 'All departments',
                                }}
                            />
                            <div className="flex flex-wrap gap-2">
                                {departments.map((d) => (
                                    <Link
                                        key={d.id}
                                        href={d.href}
                                        className="rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
                                    >
                                        {d.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {sermons.length > 0 && (
                <section className="bg-card py-20">
                    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
                        <SectionHeading
                            eyebrow="From the pulpit"
                            title="Latest sermons"
                            action={{
                                to: '/church/sermons',
                                label: 'Sermon archive',
                            }}
                        />
                        <div className="grid gap-6 md:grid-cols-3">
                            {sermons.map((s) => (
                                <Card key={s.id}>
                                    <CardContent className="p-6">
                                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Mic className="h-3.5 w-3.5 text-accent" />{' '}
                                            {s.subtitle}
                                        </p>
                                        <h3 className="mt-2 font-display text-lg font-bold">
                                            {s.href ? (
                                                <Link
                                                    href={s.href}
                                                    className="hover:text-accent hover:underline"
                                                >
                                                    {s.title}
                                                </Link>
                                            ) : (
                                                s.title
                                            )}
                                        </h3>
                                        {s.badge && (
                                            <p className="mt-1 text-sm text-accent">
                                                {s.badge}
                                            </p>
                                        )}
                                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                                            {s.body}
                                        </p>
                                        <p className="mt-4 text-xs text-muted-foreground">
                                            {formatDate(s.date)}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {announcements.length > 0 && (
                <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
                    <SectionHeading
                        eyebrow="Church notices"
                        title="Latest announcements"
                        action={{
                            to: '/church/news',
                            label: 'All announcements',
                        }}
                    />
                    <div className="grid gap-6 md:grid-cols-2">
                        {announcements.map((a) => (
                            <div
                                key={a.id}
                                className="border-t border-border pt-6"
                            >
                                <p className="text-xs text-muted-foreground">
                                    {formatDate(a.date)}
                                </p>
                                <h3 className="mt-2 font-display text-lg font-bold">
                                    {a.href ? (
                                        <Link
                                            href={a.href}
                                            className="hover:text-accent hover:underline"
                                        >
                                            {a.title}
                                        </Link>
                                    ) : (
                                        a.title
                                    )}
                                </h3>
                                <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">
                                    {a.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="surface-sanctuary">
                <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="eyebrow">Membership</p>
                        <h2 className="mt-2 max-w-xl font-display text-2xl font-bold md:text-3xl">
                            Ready to make {get('short_name', 'SSBC')} your
                            church home?
                        </h2>
                        <p className="mt-3 max-w-xl text-sm opacity-80">
                            Complete the online registration form. Our
                            membership team will review your details and follow
                            up with you personally.
                        </p>
                    </div>
                    <Button asChild size="lg" variant="secondary">
                        <Link href="/public-member-registration">
                            Start registration
                        </Link>
                    </Button>
                </div>
            </section>
        </PublicLayout>
    );
}
