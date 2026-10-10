import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { PageHeader, PublicLayout } from '@/components/site/PublicLayout';
import { safeUrl } from '@/lib/safe-url';
import { useSite } from '@/lib/site';

type Item = {
    id: string | number;
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
    item: Item;
    back: { url: string; label: string };
};

/** One event, sermon, notice, ministry, department or leader, opened from its listing by slug. */
export default function Detail({ eyebrow, item, back }: Props) {
    const { get } = useSite();
    const description = item.body
        ? item.body.slice(0, 160)
        : (item.subtitle ?? eyebrow);

    return (
        <PublicLayout>
            <Head
                title={`${item.title} — ${get('name', 'Saint Simon Baptist Church')}`}
            >
                <meta name="description" content={description} />
            </Head>
            <PageHeader
                eyebrow={item.badge ?? eyebrow}
                title={item.title}
                description={item.subtitle ?? ''}
            />

            <article className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
                <Link
                    href={back.url}
                    className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {back.label}
                </Link>

                <div
                    className={
                        item.image && item.portrait
                            ? 'grid gap-8 md:grid-cols-[280px_1fr]'
                            : ''
                    }
                >
                    {item.image && (
                        <div
                            className={`relative mb-8 overflow-hidden rounded-xl bg-muted ${item.portrait ? 'aspect-4/5' : 'aspect-video'}`}
                        >
                            <img
                                src={item.image}
                                alt={item.title}
                                className={`absolute inset-0 h-full w-full ${item.portrait ? 'object-contain' : 'object-cover'}`}
                            />
                        </div>
                    )}

                    <div>
                        {item.meta && item.meta.length > 0 && (
                            <div className="mb-6 space-y-1.5 text-sm text-muted-foreground">
                                {item.meta.map((m) => (
                                    <p
                                        key={m}
                                        className="flex items-center gap-2"
                                    >
                                        <CalendarDays className="h-4 w-4 text-accent" />
                                        {m}
                                    </p>
                                ))}
                            </div>
                        )}

                        {item.body ? (
                            <p className="text-base leading-relaxed whitespace-pre-line text-foreground">
                                {item.body}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                More details will be shared soon.
                            </p>
                        )}

                        {item.links && item.links.length > 0 && (
                            <div className="mt-8 flex flex-wrap gap-4">
                                {item.links.map((l) => {
                                    const href = safeUrl(l.url);
                                    return href ? (
                                        <a
                                            key={l.label}
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-accent"
                                        >
                                            {l.label} →
                                        </a>
                                    ) : null;
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </article>
        </PublicLayout>
    );
}
