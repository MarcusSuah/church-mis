import { router } from '@inertiajs/react';
import {
    ArrowRight,
    Banknote,
    BookOpen,
    Calendar,
    FileText,
    Gift,
    Globe,
    HandCoins,
    HandHeart,
    Heart,
    Image,
    Landmark,
    LayoutGrid,
    Loader2,
    Mail,
    Megaphone,
    Network,
    PiggyBank,
    Receipt,
    Search,
    Shield,
    UserCog,
    Users,
    Droplets,
    Flower2,
    Gem,
    Wine,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { STAFF_NAV } from '@/components/ssbcms/Sidebar';
import { usePermissions } from '@/hooks/use-permissions';
import { safeUrl } from '@/lib/safe-url';
import { cn } from '@/lib/utils';
import { search as searchRoute } from '@/routes';

type SearchItem = {
    id: string;
    title: string;
    subtitle: string | null;
    url: string;
    image?: string | null;
};

type SearchGroup = {
    key: string;
    label: string;
    items: SearchItem[];
    more_url: string | null;
};

type Row = SearchItem & { group: string; icon: LucideIcon; isMore?: boolean };

const MIN_LENGTH = 2;
const DEBOUNCE_MS = 250;

const GROUP_ICONS: Record<string, LucideIcon> = {
    members: Users,
    families: Users,
    users: UserCog,
    departments: Network,
    ministries: HandHeart,
    boards: Landmark,
    committees: Landmark,
    leadership: Shield,
    events: Calendar,
    announcements: Megaphone,
    documents: FileText,
    sermons: BookOpen,
    prayer_requests: Heart,
    tithes: HandCoins,
    offerings: Gift,
    donations: Banknote,
    expenses: Receipt,
    budgets: PiggyBank,
    baptisms: Droplets,
    communions: Wine,
    weddings: Gem,
    funerals: Flower2,
    pastoral_care: HandHeart,
    messages: Mail,
    gallery_albums: Image,
    site_pages: Globe,
};

type Result =
    | { ok: true; groups: SearchGroup[] }
    | { ok: false; status: number };

/** Asks /search (staff only). A redirect or error page counts as a failure. */
async function fetchResults(q: string, signal: AbortSignal): Promise<Result> {
    const res = await fetch(searchRoute.url({ query: { q } }), {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        signal,
    });
    const isJson = (res.headers.get('content-type') ?? '').includes(
        'application/json',
    );
    if (!res.ok || res.redirected || !isJson) {
        return { ok: false, status: res.status };
    }
    const body = (await res.json()) as { groups?: SearchGroup[] };

    return { ok: true, groups: body.groups ?? [] };
}

/** Bolds the typed text inside a result title (rendered as text, never HTML). */
function Highlight({ text, term }: { text: string; term: string }) {
    const needle = term.trim().toLowerCase();
    if (!needle) return <>{text}</>;
    const parts: { text: string; match: boolean }[] = [];
    const lower = text.toLowerCase();
    let from = 0;
    let at = lower.indexOf(needle);
    while (at !== -1) {
        if (at > from) parts.push({ text: text.slice(from, at), match: false });
        parts.push({ text: text.slice(at, at + needle.length), match: true });
        from = at + needle.length;
        at = lower.indexOf(needle, from);
    }
    if (from < text.length)
        parts.push({ text: text.slice(from), match: false });

    return (
        <>
            {parts.map((p, i) =>
                p.match ? (
                    <mark
                        key={i}
                        className="rounded-sm bg-primary/15 px-0.5 font-semibold text-foreground"
                    >
                        {p.text}
                    </mark>
                ) : (
                    <Fragment key={i}>{p.text}</Fragment>
                ),
            )}
        </>
    );
}

/**
 * Live search in the staff header. Searches every module the user may open
 * (members, finance, sacraments, content, …) as they type, plus the menu's
 * own pages. Ctrl/⌘ K or "/" focuses it; arrows and Enter pick a result.
 */
export function GlobalSearch() {
    const { can } = usePermissions();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [groups, setGroups] = useState<SearchGroup[]>([]);
    const [searched, setSearched] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    const term = query.trim();
    const ready = term.length >= MIN_LENGTH;

    // Ctrl/⌘ K anywhere, or "/" outside a text field, focuses the search.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const typing =
                !!target &&
                (target.isContentEditable ||
                    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
            if (
                ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') ||
                (e.key === '/' && !typing)
            ) {
                e.preventDefault();
                setMobileOpen(true);
                setOpen(true);
                requestAnimationFrame(() => inputRef.current?.focus());
            }
        };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Close when clicking outside.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) {
                setOpen(false);
                setMobileOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);

        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    // Debounced live search; a newer keystroke cancels the older request.
    useEffect(() => {
        if (!ready) {
            setGroups([]);
            setSearched('');
            setLoading(false);
            setFailed(false);

            return;
        }
        const controller = new AbortController();
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const result = await fetchResults(term, controller.signal);
                if (result.ok) {
                    setGroups(result.groups);
                    setFailed(false);
                } else {
                    setGroups([]);
                    setFailed(true);
                }
                setSearched(term);
                setActive(0);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    setGroups([]);
                    setFailed(true);
                    setSearched(term);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [term, ready]);

    // Sidebar pages the user can open whose name matches.
    const needle = term.toLowerCase();
    const pageRows: Row[] = ready
        ? STAFF_NAV.flatMap((g) =>
              g.items
                  .filter((item) => !item.soon && can(item.permission))
                  .map((item) => ({
                      title: item.label,
                      href: item.href,
                      icon: LayoutGrid,
                      group: g.group || 'Overview',
                  })),
          )
              .filter(
                  (p) =>
                      p.title.toLowerCase().includes(needle) ||
                      p.group.toLowerCase().includes(needle),
              )
              .slice(0, 5)
              .map((p) => ({
                  id: `page:${p.href}`,
                  title: p.title,
                  subtitle: p.group,
                  url: p.href,
                  icon: p.icon,
                  group: 'Pages',
              }))
        : [];

    const sections: { label: string; rows: Row[] }[] = [
        ...(pageRows.length ? [{ label: 'Pages', rows: pageRows }] : []),
        ...groups.map((g) => {
            const icon = GROUP_ICONS[g.key] ?? Search;

            return {
                label: g.label,
                rows: [
                    ...g.items.map((item) => ({
                        ...item,
                        group: g.label,
                        icon,
                    })),
                    ...(g.more_url
                        ? [
                              {
                                  id: `more:${g.key}`,
                                  title: `See all ${g.label.toLowerCase()} matching “${searched}”`,
                                  subtitle: null,
                                  url: g.more_url,
                                  icon: ArrowRight,
                                  group: g.label,
                                  isMore: true,
                              },
                          ]
                        : []),
                ],
            };
        }),
    ];
    const rows = sections.flatMap((s) => s.rows);
    const activeIndex = Math.min(active, Math.max(rows.length - 1, 0));

    const go = (row: Row | undefined) => {
        if (!row) return;
        setOpen(false);
        setMobileOpen(false);
        setQuery('');
        inputRef.current?.blur();
        router.visit(row.url);
    };

    const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (rows.length ? (i + 1) % rows.length : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) =>
                rows.length ? (i - 1 + rows.length) % rows.length : 0,
            );
        } else if (e.key === 'Enter') {
            e.preventDefault();
            go(rows[activeIndex]);
        } else if (e.key === 'Escape') {
            if (query) {
                setQuery('');
            } else {
                setOpen(false);
                setMobileOpen(false);
                inputRef.current?.blur();
            }
        }
    };

    const showPanel = open && term.length > 0;
    const waiting = ready && (loading || searched !== term);
    let index = -1;

    return (
        <div ref={wrapperRef} className="relative">
            <button
                type="button"
                onClick={() => {
                    setMobileOpen(true);
                    setOpen(true);
                    requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
                aria-label="Search"
            >
                <Search className="size-5" />
            </button>

            <div
                className={cn(
                    'items-center gap-2 rounded-lg bg-muted px-13 py-2 md:flex md:w-72 lg:w-80',
                    mobileOpen
                        ? 'fixed inset-x-3 top-3 z-50 flex shadow-lg ring-1 ring-border md:static md:shadow-none md:ring-0'
                        : 'hidden',
                )}
            >
                {waiting ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                )}
                <input
                    ref={inputRef}
                    type="search"
                    role="combobox"
                    aria-expanded={showPanel}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-label="Search everything"
                    aria-activedescendant={
                        showPanel && rows[activeIndex]
                            ? `${listId}-${activeIndex}`
                            : undefined
                    }
                    value={query}
                    maxLength={100}
                    autoComplete="off"
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        setActive(0);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder="Search members, records, pages..."
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
                />
                {query ? (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('');
                            inputRef.current?.focus();
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                    >
                        <X className="size-4" />
                    </button>
                ) : (
                    <kbd className="hidden rounded border border-border bg-background py-0.5 text-xs text-muted-foreground">
                        Ctrl K
                    </kbd>
                )}
            </div>

            {showPanel && (
                <div
                    id={listId}
                    role="listbox"
                    className={cn(
                        'z-50 overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-xl',
                        mobileOpen
                            ? 'fixed inset-x-3 top-16 max-h-[70vh] md:absolute md:inset-x-auto md:top-full md:left-0 md:mt-2 md:w-[28rem]'
                            : // Anchored to the left edge: the search sits at the left of the header, beside the
                              // sidebar (z-40, above the header), so a panel growing leftwards would be hidden under it.
                              'absolute top-full left-0 mt-2 max-h-[70vh] w-[28rem] max-w-[calc(100vw-2rem)]',
                    )}
                >
                    {!ready ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                            Type at least {MIN_LENGTH} characters to search.
                        </p>
                    ) : (
                        <>
                            {sections.map((section) => (
                                <div key={section.label} className="py-1">
                                    <p className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        {section.label}
                                    </p>
                                    {section.rows.map((row) => {
                                        index += 1;
                                        const i = index;
                                        const Icon = row.icon;
                                        const image = safeUrl(row.image);

                                        return (
                                            <a
                                                key={row.id}
                                                id={`${listId}-${i}`}
                                                role="option"
                                                aria-selected={
                                                    i === activeIndex
                                                }
                                                href={row.url}
                                                onMouseEnter={() =>
                                                    setActive(i)
                                                }
                                                onClick={(e) => {
                                                    if (
                                                        e.metaKey ||
                                                        e.ctrlKey ||
                                                        e.shiftKey
                                                    )
                                                        return;
                                                    e.preventDefault();
                                                    go(row);
                                                }}
                                                className={cn(
                                                    'flex items-center gap-3 px-4 py-2 text-sm',
                                                    i === activeIndex
                                                        ? 'bg-accent text-accent-foreground'
                                                        : 'hover:bg-accent/60',
                                                    row.isMore &&
                                                        'text-xs font-medium text-primary',
                                                )}
                                            >
                                                {image ? (
                                                    <img
                                                        src={image}
                                                        alt=""
                                                        className="size-7 shrink-0 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span
                                                        className={cn(
                                                            'flex size-7 shrink-0 items-center justify-center rounded-full',
                                                            row.isMore
                                                                ? 'bg-transparent'
                                                                : 'bg-muted',
                                                        )}
                                                    >
                                                        <Icon className="size-3.5 text-muted-foreground" />
                                                    </span>
                                                )}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate">
                                                        {row.isMore ? (
                                                            row.title
                                                        ) : (
                                                            <Highlight
                                                                text={row.title}
                                                                term={term}
                                                            />
                                                        )}
                                                    </span>
                                                    {row.subtitle && (
                                                        <span className="block truncate text-xs text-muted-foreground">
                                                            {row.subtitle}
                                                        </span>
                                                    )}
                                                </span>
                                            </a>
                                        );
                                    })}
                                </div>
                            ))}

                            {rows.length === 0 && (
                                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                                    {waiting
                                        ? 'Searching…'
                                        : failed
                                          ? 'Search is unavailable right now. Refresh the page and try again.'
                                          : `Nothing found for “${term}”.`}
                                </p>
                            )}
                            {rows.length > 0 && waiting && (
                                <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                                    Searching records…
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
