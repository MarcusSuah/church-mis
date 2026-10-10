import { Link } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';

/** Client-side paging for lists already loaded on the page. Resets to page 1 when the list changes size. */
export function usePagination<T>(items: T[], pageSize = 15) {
    const [page, setPage] = useState(0);
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    useEffect(() => {
        if (page > pages - 1) setPage(0);
    }, [items.length, pages, page]);
    const pageItems = useMemo(
        () => items.slice(page * pageSize, (page + 1) * pageSize),
        [items, page, pageSize],
    );

    return { page, setPage, pages, pageItems, total: items.length, pageSize };
}

function pageNumbers(page: number, pages: number) {
    const start = Math.max(0, Math.min(page - 2, pages - 5));
    return Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
}

const btn =
    'flex h-8 min-w-8 items-center justify-center rounded-lg border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40';

/** Footer: "Showing 1–15 of 120" + page buttons (same look as the reference Audit Logs). */
export function Paginator({
    page,
    pages,
    total,
    pageSize,
    setPage,
    className = '',
}: ReturnType<typeof usePagination<unknown>> & { className?: string }) {
    if (total <= pageSize) return null;
    return (
        <div
            className={`flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 ${className}`}
        >
            <p className="text-xs text-muted-foreground">
                Showing {page * pageSize + 1}–
                {Math.min((page + 1) * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className={btn}
                    aria-label="Previous page"
                >
                    <Icon name="ChevronLeftIcon" size={14} />
                </button>
                {pageNumbers(page, pages).map((p) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={
                            p === page
                                ? `${btn} border-primary bg-primary text-white hover:bg-primary`
                                : btn
                        }
                    >
                        {p + 1}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => setPage(Math.min(pages - 1, page + 1))}
                    disabled={page >= pages - 1}
                    className={btn}
                    aria-label="Next page"
                >
                    <Icon name="ChevronRightIcon" size={14} />
                </button>
            </div>
        </div>
    );
}

type LaravelPage<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

/** Pagination metadata without the rows (what list pages receive as `pagination`). */
type PageMeta = Omit<LaravelPage<unknown>, 'data'> & { per_page?: number };

/** Footer for server-side (Laravel paginator) results. */
export function ServerPaginator({ meta }: { meta: PageMeta }) {
    if (meta.last_page <= 1) return null;
    const links = meta.links.slice(1, -1);
    const prev = meta.links[0]?.url;
    const next = meta.links[meta.links.length - 1]?.url;
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
                Showing {meta.from}–{meta.to} of {meta.total}
            </p>
            <div className="flex items-center gap-1">
                {prev ? (
                    <Link
                        href={prev}
                        preserveScroll
                        preserveState
                        className={btn}
                        aria-label="Previous page"
                    >
                        <Icon name="ChevronLeftIcon" size={14} />
                    </Link>
                ) : (
                    <span className={`${btn} opacity-40`}>
                        <Icon name="ChevronLeftIcon" size={14} />
                    </span>
                )}
                {links.map((l, i) =>
                    l.url ? (
                        <Link
                            key={i}
                            href={l.url}
                            preserveScroll
                            preserveState
                            className={
                                l.active
                                    ? `${btn} border-primary bg-primary text-white`
                                    : btn
                            }
                        >
                            {l.label}
                        </Link>
                    ) : (
                        <span
                            key={i}
                            className="px-1 text-xs text-muted-foreground"
                        >
                            {l.label}
                        </span>
                    ),
                )}
                {next ? (
                    <Link
                        href={next}
                        preserveScroll
                        preserveState
                        className={btn}
                        aria-label="Next page"
                    >
                        <Icon name="ChevronRightIcon" size={14} />
                    </Link>
                ) : (
                    <span className={`${btn} opacity-40`}>
                        <Icon name="ChevronRightIcon" size={14} />
                    </span>
                )}
            </div>
        </div>
    );
}

/** Server page links in their own card under a list; renders nothing when everything fits on one page. */
export function ServerPaginatorCard({ meta }: { meta: PageMeta }) {
    if (meta.last_page <= 1) return null;
    return (
        <div className="card mt-4 overflow-hidden">
            <ServerPaginator meta={meta} />
        </div>
    );
}

export type { LaravelPage, PageMeta };
