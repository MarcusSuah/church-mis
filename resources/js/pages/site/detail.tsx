import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    Expand,
    Image as ImageIcon,
    MapPin,
} from 'lucide-react';
import { useState } from 'react';
import { Lightbox } from '@/components/site/lightbox';
import type { LightboxPhoto } from '@/components/site/lightbox';
import { PersonAvatar } from '@/components/site/person-card';
import { PublicLayout } from '@/components/site/PublicLayout';
import { safeUrl } from '@/lib/safe-url';
import { useSite } from '@/lib/site';
import RichText, { stripHtml } from '@/components/ssbcms/RichText';

type Item = {
    id: string | number;
    title: string;
    subtitle?: string | null;
    badge?: string | null;
    body?: string | null;
    image?: string | null;
    avatar?: string | null;
    portrait?: boolean;
    meta?: string[];
    links?: { label: string; url: string }[];
};
type Props = {
    eyebrow: string;
    item: Item;
    kind?: 'media' | 'groups' | 'people';
    /** Gallery photos linked to this sermon or event (up to 10 per album). */
    photos?: LightboxPhoto[];
    back: { url: string; label: string };
};

/**
 * One event, sermon, notice, ministry, department or leader, opened from its
 * listing by slug. Pictures sit on the left and the text on the right; on
 * phones they stack, picture first.
 */
export default function Detail({
    eyebrow,
    item,
    kind = 'media',
    photos = [],
    back,
}: Props) {
    const { get } = useSite();
    const [open, setOpen] = useState<number | null>(null);
    const description = item.body
        ? stripHtml(item.body).slice(0, 160)
        : (item.subtitle ?? eyebrow);

    // The main picture first, then the gallery photos (without repeating it).
    const pictures: LightboxPhoto[] = [
        ...(item.image
            ? [{ id: 'cover', url: item.image, caption: null }]
            : []),
        ...photos.filter((p) => p.url !== item.image),
    ];
    const [main, ...rest] = pictures;

    return (
        <PublicLayout>
            <Head
                title={`${item.title} — ${get('name', 'Saint Simon Baptist Church')}`}
            >
                <meta name="description" content={description} />
            </Head>

            <article className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
                <Link
                    href={back.url}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline sm:mb-8"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {back.label}
                </Link>

                <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
                    {/* Left: pictures */}
                    <div className="lg:sticky lg:top-24">
                        {main ? (
                            <button
                                type="button"
                                onClick={() => setOpen(0)}
                                className={`group relative block w-full overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-border ${item.portrait
                                        ? 'mx-auto aspect-4/5 max-h-[75svh] max-w-sm sm:max-w-md lg:max-h-[calc(100svh-8rem)] lg:max-w-none'
                                        : 'aspect-4/3'
                                    }`}
                                aria-label="View pictures full screen"
                            >
                                <img
                                    src={main.url}
                                    alt={item.title}
                                    className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${item.portrait ? 'object-top' : 'object-center'
                                        }`}
                                />
                                <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
                                    <Expand className="h-3.5 w-3.5" />
                                    {pictures.length > 1 ? `${pictures.length} photos` : 'View'}
                                </span>
                            </button>
                        ) : kind === 'media' ? (
                            <div className="flex aspect-4/3 w-full items-center justify-center rounded-2xl border-0 surface-sanctuary shadow-lg">
                                <ImageIcon className="h-12 w-12 opacity-40" />
                            </div>
                        ) : (
                            <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                                <PersonAvatar
                                    name={item.title}
                                    image={item.avatar}
                                    size="lg"
                                />
                                {item.subtitle && (
                                    <p className="text-sm font-medium text-accent">
                                        {item.subtitle}
                                    </p>
                                )}
                            </div>
                        )}

                        {rest.length > 0 && (
                            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                                {rest.map((p, i) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setOpen(i + 1)}
                                        className="aspect-square overflow-hidden rounded-lg bg-muted ring-1 ring-border transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                                        aria-label={`View photo ${i + 2}`}
                                    >
                                        <img
                                            src={p.url}
                                            alt={p.caption ?? ''}
                                            loading="lazy"
                                            className="h-full w-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: content */}
                    <div className="min-w-0">
                        <p className="eyebrow">{item.badge ?? eyebrow}</p>
                        <h1 className="mt-2 font-display text-3xl leading-tight font-bold wrap-break-word sm:text-4xl">
                            {item.title}
                        </h1>
                        {item.subtitle && (main || kind === 'media') && (
                            <p className="mt-2 text-lg font-medium text-accent">
                                {item.subtitle}
                            </p>
                        )}

                        {item.meta && item.meta.length > 0 && (
                            <div className="mt-6 flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                                {item.meta.map((m, i) => (
                                    <p
                                        key={m}
                                        className="flex items-start gap-2"
                                    >
                                        {i === 0 ? (
                                            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                                        ) : (
                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                                        )}
                                        {m}
                                    </p>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 border-t border-border pt-6">
                            {item.body ? (
                                <RichText
                                    html={item.body}
                                    className="text-base text-foreground"
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    More details will be shared soon.
                                </p>
                            )}
                        </div>

                        {item.links && item.links.length > 0 && (
                            <div className="mt-8 flex flex-wrap gap-3">
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

            {open !== null && (
                <Lightbox
                    photos={pictures}
                    index={open}
                    title={item.title}
                    onIndex={setOpen}
                    onClose={() => setOpen(null)}
                />
            )}
        </PublicLayout>
    );
}
