import { Head, InfiniteScroll, router } from '@inertiajs/react';
import { CalendarDays, Images, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Lightbox } from '@/components/site/lightbox';
import type { LightboxPhoto } from '@/components/site/lightbox';
import { PageHeader, PublicLayout } from '@/components/site/PublicLayout';
import { formatDate, useSite } from '@/lib/site';

type Album = {
    id: number;
    title: string;
    description: string | null;
    event_date: string | null;
    department: string | null;
    tags: string[];
    photos: LightboxPhoto[];
};
type Filters = {
    search: string;
    department: string;
    tag: string;
    from: string | null;
    to: string | null;
};
type Props = {
    albums: { data: Album[] };
    filters: Filters;
    departments: { id: string; slug: string | null; name: string }[];
    tags: string[];
};

const field =
    'h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none';

/**
 * Public photo gallery. Each album (for example one sermon) holds up to 10
 * photos; clicking an album opens a viewer to scroll through all of them.
 * More albums load as the visitor scrolls down.
 */
export default function Gallery({ albums, filters, departments, tags }: Props) {
    const { get } = useSite();
    const [search, setSearch] = useState(filters.search);
    const [viewing, setViewing] = useState<{
        album: Album;
        index: number;
    } | null>(null);
    const first = useRef(true);

    const apply = (changes: Partial<Filters>) => {
        const next = { ...filters, search, ...changes };
        const query = Object.fromEntries(
            Object.entries(next).filter(([, v]) => v),
        );
        router.get('/gallery', query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            reset: ['albums'],
        });
    };

    // Search as the visitor types, after a short pause.
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const t = setTimeout(() => apply({ search }), 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const filtered = Boolean(
        filters.search ||
        filters.department ||
        filters.tag ||
        filters.from ||
        filters.to,
    );

    return (
        <PublicLayout>
            <Head
                title={`Gallery — ${get('name', 'Saint Simon Baptist Church')}`}
            >
                <meta
                    name="description"
                    content="Photos from services, sermons, events and church life."
                />
            </Head>
            <PageHeader
                eyebrow="Moments of worship"
                title="Photo gallery"
                description="Photos from our services, sermons, events and fellowship. Click an album to view every photo."
            />

            <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
                <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1fr_1fr]">
                        <label className="relative block">
                            <span className="sr-only">Search albums</span>
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search albums or tags…"
                                className={`${field} pl-9`}
                            />
                        </label>
                        <label className="block">
                            <span className="sr-only">Department</span>
                            <select
                                value={filters.department}
                                onChange={(e) =>
                                    apply({ department: e.target.value })
                                }
                                className={field}
                            >
                                <option value="">All departments</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.slug ?? d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="sr-only">From date</span>
                            <input
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) =>
                                    apply({ from: e.target.value || null })
                                }
                                className={field}
                                aria-label="From date"
                            />
                        </label>
                        <label className="block">
                            <span className="sr-only">To date</span>
                            <input
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) =>
                                    apply({ to: e.target.value || null })
                                }
                                className={field}
                                aria-label="To date"
                            />
                        </label>
                    </div>

                    {(tags.length > 0 || filtered) && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            {tags.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() =>
                                        apply({
                                            tag: filters.tag === t ? '' : t,
                                        })
                                    }
                                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filters.tag === t ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-card hover:border-accent hover:text-accent'}`}
                                    aria-pressed={filters.tag === t}
                                >
                                    #{t}
                                </button>
                            ))}
                            {filtered && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        router.get(
                                            '/gallery',
                                            {},
                                            {
                                                preserveScroll: true,
                                                replace: true,
                                                reset: ['albums'],
                                            },
                                        );
                                    }}
                                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                                >
                                    <X className="h-3.5 w-3.5" /> Clear filters
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {albums.data.length === 0 ? (
                    <div className="mt-12 flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                        <Images className="h-12 w-12 opacity-40" />
                        <p className="text-sm">
                            {filtered
                                ? 'No albums match these filters.'
                                : 'Photos will be shared here soon.'}
                        </p>
                    </div>
                ) : (
                    <InfiniteScroll
                        data="albums"
                        className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
                    >
                        {albums.data.map((album) => (
                            <AlbumCard
                                key={album.id}
                                album={album}
                                onOpen={(index) => setViewing({ album, index })}
                            />
                        ))}
                    </InfiniteScroll>
                )}
            </section>

            {viewing && (
                <Lightbox
                    photos={viewing.album.photos}
                    index={viewing.index}
                    title={viewing.album.title}
                    onIndex={(index) => setViewing({ ...viewing, index })}
                    onClose={() => setViewing(null)}
                />
            )}
        </PublicLayout>
    );
}

function AlbumCard({
    album,
    onOpen,
}: {
    album: Album;
    onOpen: (index: number) => void;
}) {
    const [cover, ...more] = album.photos;
    const strip = more.slice(0, 3);
    const hidden = album.photos.length - 1 - strip.length;

    return (
        <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg">
            <button
                type="button"
                onClick={() => onOpen(0)}
                className="group relative aspect-4/3 overflow-hidden bg-muted"
                aria-label={`Open ${album.title} (${album.photos.length} photos)`}
            >
                {cover && (
                    <img
                        src={cover.url}
                        alt={cover.caption ?? album.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                )}
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                    <Images className="h-3.5 w-3.5" /> {album.photos.length}
                </span>
            </button>

            {strip.length > 0 && (
                <div className="grid grid-cols-3 gap-1 bg-card p-1">
                    {strip.map((p, i) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => onOpen(i + 1)}
                            className="relative aspect-square overflow-hidden rounded-md bg-muted"
                            aria-label={`View photo ${i + 2}`}
                        >
                            <img
                                src={p.url}
                                alt={p.caption ?? ''}
                                loading="lazy"
                                className="h-full w-full object-cover transition hover:opacity-85"
                            />
                            {i === strip.length - 1 && hidden > 0 && (
                                <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-display text-lg font-bold text-white">
                                    +{hidden}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex flex-1 flex-col p-5">
                <h3 className="line-clamp-2 font-display text-lg leading-snug font-bold">
                    {album.title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {album.event_date && (
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-accent" />
                            {formatDate(album.event_date)}
                        </span>
                    )}
                    {album.department && (
                        <span className="font-medium text-accent">
                            {album.department}
                        </span>
                    )}
                </div>
                {album.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {album.description}
                    </p>
                )}
                {album.tags.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                        {album.tags.map((t) => (
                            <span
                                key={t}
                                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                                #{t}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}
