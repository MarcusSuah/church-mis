import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarDays,
    Clock,
    Image as ImageIcon,
    MapPin,
    Users,
} from 'lucide-react';
import { PersonAvatar, PersonCard } from '@/components/site/person-card';
import { PageHeader, PublicLayout } from '@/components/site/PublicLayout';
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
    /** Leader's photo for ministries and departments. */
    avatar?: string | null;
    portrait?: boolean;
    date?: string | null;
    meta?: string[];
    links?: { label: string; url: string }[];
};
type BoardMember = {
    id: string;
    title: string;
    subtitle: string;
    image: string | null;
};
type Board = {
    id: string;
    title: string;
    subtitle: string | null;
    body: string | null;
    meta: string[];
    members: BoardMember[];
};
type Props = {
    eyebrow: string;
    title: string;
    description: string;
    items: Item[];
    empty: string;
    /** media: events, sermons, news · groups: ministries, departments · people: leaders */
    kind?: 'media' | 'groups' | 'people';
    boards?: Board[];
};

/** Day and short month for the date tile on event and news cards. */
function DateTile({ date }: { date: string }) {
    // A plain "YYYY-MM-DD" is read as a local date so it never shifts a day.
    const d = /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00`)
        : new Date(date);
    if (Number.isNaN(d.getTime())) {
        return null;
    }
    return (
        <div className="absolute top-3 left-3 flex w-14 flex-col items-center rounded-lg bg-card/95 py-1.5 text-center shadow-md backdrop-blur">
            <span className="font-display text-xl leading-none font-bold">
                {d.getDate()}
            </span>
            <span className="mt-0.5 text-[10px] font-semibold tracking-wider text-accent uppercase">
                {d.toLocaleDateString(undefined, { month: 'short' })}
            </span>
        </div>
    );
}

/** Event, sermon or news card: picture on top, equal heights in a row. */
function MediaCard({ item }: { item: Item }) {
    const [when, where] = item.meta ?? [];
    return (
        <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg">
            <div className="relative aspect-video overflow-hidden bg-muted">
                {item.image ? (
                    <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center border-0 surface-sanctuary">
                        <ImageIcon className="h-10 w-10 opacity-40" />
                    </div>
                )}
                {item.date && <DateTile date={item.date} />}
                {item.badge && (
                    <span className="absolute top-3 right-3 max-w-[60%] truncate rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow">
                        {item.badge}
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h3 className="line-clamp-2 font-display text-lg leading-snug font-bold">
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="group-hover:text-accent after:absolute after:inset-0"
                        >
                            {item.title}
                        </Link>
                    ) : (
                        item.title
                    )}
                </h3>
                {item.subtitle && (
                    <p className="mt-1 text-sm font-medium text-accent">
                        {item.subtitle}
                    </p>
                )}
                {item.body && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                    </p>
                )}
                <div className="mt-auto space-y-1.5 pt-5 text-xs text-muted-foreground">
                    {when && (
                        <p className="flex items-start gap-2">
                            <CalendarDays className="mt-px h-3.5 w-3.5 shrink-0 text-accent" />
                            {when}
                        </p>
                    )}
                    {where && (
                        <p className="flex items-start gap-2">
                            <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-accent" />
                            {where}
                        </p>
                    )}
                </div>
                <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
                    {item.href && (
                        <Link
                            href={item.href}
                            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                        >
                            Read more <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    )}
                    {item.links?.map((l) => {
                        const href = safeUrl(l.url);
                        return href ? (
                            <a
                                key={l.label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-foreground underline-offset-4 hover:underline"
                            >
                                {l.label} →
                            </a>
                        ) : null;
                    })}
                </div>
            </div>
        </article>
    );
}

function GroupMeta({ meta }: { meta?: string[] }) {
    if (!meta || meta.length === 0) {
        return null;
    }
    return (
        <div className="space-y-1 text-xs text-muted-foreground">
            {meta.map((m, i) => (
                <p key={m} className="flex items-start gap-2">
                    {i === 0 ? (
                        <Clock className="mt-px h-3.5 w-3.5 shrink-0 text-accent" />
                    ) : (
                        <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-accent" />
                    )}
                    {m}
                </p>
            ))}
        </div>
    );
}

function BoardCard({ board }: { board: Board }) {
    return (
        <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Users className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                    <h3 className="font-display text-lg leading-snug font-bold">
                        {board.title}
                    </h3>
                    {board.subtitle && (
                        <p className="text-sm font-medium text-accent">
                            {board.subtitle}
                        </p>
                    )}
                </div>
            </div>
            {board.body && (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                    {board.body}
                </p>
            )}
            <ul className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
                {board.members.map((m) => (
                    <li key={m.id} className="flex min-w-0 items-center gap-3">
                        <PersonAvatar
                            name={m.title}
                            image={m.image}
                            size="sm"
                        />
                        <div className="min-w-0">
                            <p className="truncate font-display text-sm font-bold">
                                {m.title}
                            </p>
                            <p className="truncate text-xs font-medium text-accent">
                                {m.subtitle}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
            {board.meta.length > 0 && (
                <div className="mt-auto pt-5">
                    <GroupMeta meta={board.meta} />
                </div>
            )}
        </article>
    );
}

export default function Listing({
    eyebrow,
    title,
    description,
    items,
    empty,
    kind = 'media',
    boards = [],
}: Props) {
    const { get } = useSite();

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

            <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{empty}</p>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                        {items.map((i) =>
                            kind === 'media' ? (
                                <MediaCard key={i.id} item={i} />
                            ) : (
                                <PersonCard
                                    key={i.id}
                                    name={i.title}
                                    role={i.subtitle}
                                    body={i.body}
                                    image={
                                        kind === 'people' ? i.image : i.avatar
                                    }
                                    href={i.href}
                                    footer={
                                        kind === 'groups' ? (
                                            <GroupMeta meta={i.meta} />
                                        ) : undefined
                                    }
                                />
                            ),
                        )}
                    </div>
                )}
            </section>

            {boards.length > 0 && (
                <section className="border-t border-border bg-muted/40">
                    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
                        <p className="eyebrow">Governance</p>
                        <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                            Board members
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            The boards that oversee the affairs of the church,
                            and the members who serve on them.
                        </p>
                        <div className="mt-8 grid gap-5 sm:gap-6 lg:grid-cols-2">
                            {boards.map((b) => (
                                <BoardCard key={b.id} board={b} />
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </PublicLayout>
    );
}
