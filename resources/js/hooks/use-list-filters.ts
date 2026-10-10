import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Search box + drop-down filters for a server-paginated list (Phase 3).
 *
 * The list is filtered, sorted and paginated by the server; this hook keeps
 * the controls in sync and reloads only the list props when they change.
 * The search box waits 300 ms after typing stops. 'All' and '' mean
 * "no filter" and are left out of the URL. Changing a filter goes back to page 1.
 */
export function useListFilters<F extends Record<string, string>>(
    initial: F,
    only: string[] = ['records', 'pagination', 'filters', 'stats'],
) {
    const [values, setValues] = useState<F>(initial);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    const visit = (next: F) => {
        const query: Record<string, string> = {};
        for (const [k, v] of Object.entries(next)) {
            if (v !== '' && v !== 'All') query[k] = v;
        }
        router.get(window.location.pathname, query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only,
        });
    };

    const set = (key: keyof F, value: string) => {
        const next = { ...values, [key]: value } as F;
        setValues(next);
        if (timer.current) clearTimeout(timer.current);
        if (key === 'search') {
            timer.current = setTimeout(() => visit(next), 300);
        } else {
            visit(next);
        }
    };

    return { values, set };
}
