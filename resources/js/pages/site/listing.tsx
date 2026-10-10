import { Head, Link } from '@inertiajs/react';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, PublicLayout } from '@/components/site/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { safeUrl } from '@/lib/safe-url';
import { useSite } from '@/lib/site';

type Item = {
    id: string | number;
    /** Detail page for this item, addressed by its slug. */
    href?: string;
    title: string;
    subtitle?: string | null;
    badge?: string | null;
    body?: string | null;
    image?: string | null;
    portrait?: boolean;
    meta?: string[];
    links?: { label: string; url: string }[];
};
type Props = {
    eyebrow: string;
    title: string;
    description: string;
    items: Item[];
    empty: string;
};

function Body({ text }: { text?: string | null }) {
    const [open, setOpen] = useState(false);
    if (!text) return null;
    const long = text.length > 220;
    return (
        <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">
            {open || !long ? text : `${text.slice(0, 220).trimEnd()}…`}
            {long && (
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="ml-1 font-medium text-accent hover:underline"
                >
                    {open ? 'Show less' : 'Read more'}
                </button>
            )}
        </p>
    );
}

export default function Listing({
    eyebrow,
    title,
    description,
    items,
    empty,
}: Props) {
    const { get } = useSite();
    const people = items.some((i) => i.portrait);

    return (
        <PublicLayout>
            <Head
                title={`${title} — ${get('name', 'Saint Simon Baptist Church')}`}
            >
                <meta name="description" content={description} />
            </Head>
            <PageHeader
                eyebrow={eyebrow}
                title={title}
                description={description}
            />

            <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{empty}</p>
                ) : (
                    <div
                        className={`grid gap-6 sm:grid-cols-2 ${people ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}
                    >
                        {items.map((i) => (
                            <Card key={i.id} className="h-full overflow-hidden">
                                {i.image && (
                                    <div
                                        className={`relative overflow-hidden bg-muted ${i.portrait ? 'aspect-[4/5]' : 'aspect-[16/9]'}`}
                                    >
                                        <img
                                            src={i.image}
                                            alt=""
                                            aria-hidden
                                            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl"
                                        />
                                        <img
                                            src={i.image}
                                            alt={i.title}
                                            className={`absolute inset-0 h-full w-full ${i.portrait ? 'object-contain' : 'object-cover'}`}
                                        />
                                    </div>
                                )}
                                <CardContent className="flex h-full flex-col p-6">
                                    {i.badge && (
                                        <p className="eyebrow">{i.badge}</p>
                                    )}
                                    <h3 className="mt-2 font-display text-lg font-bold">
                                        {i.href ? (
                                            <Link
                                                href={i.href}
                                                className="hover:text-accent hover:underline"
                                            >
                                                {i.title}
                                            </Link>
                                        ) : (
                                            i.title
                                        )}
                                    </h3>
                                    {i.subtitle && (
                                        <p className="text-sm text-accent">
                                            {i.subtitle}
                                        </p>
                                    )}
                                    <Body text={i.body} />
                                    {i.meta && i.meta.length > 0 && (
                                        <div className="mt-5 space-y-1.5 text-xs text-muted-foreground">
                                            {i.meta.map((m) => (
                                                <p
                                                    key={m}
                                                    className="flex items-center gap-2"
                                                >
                                                    <CalendarDays className="h-3.5 w-3.5 text-accent" />
                                                    {m}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                    {i.links && i.links.length > 0 && (
                                        <div className="mt-4 flex gap-3">
                                            {i.links.map((l) => {
                                                const href = safeUrl(l.url);
                                                return href ? (
                                                    <a
                                                        key={l.label}
                                                        href={href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                                                    >
                                                        {l.label} →
                                                    </a>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </PublicLayout>
    );
}
