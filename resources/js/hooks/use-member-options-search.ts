import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

/**
 * Member pickers on the church-structure pages ask the server for matches
 * (at most 50) instead of loading every member (Phase 3, F07).
 * Re-requests the lazy `memberOptions` prop 300 ms after typing stops.
 */
export function useMemberOptionsSearch(q: string) {
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const t = setTimeout(
            () =>
                router.reload({
                    only: ['memberOptions'],
                    data: { member_q: q.trim() },
                }),
            300,
        );
        return () => clearTimeout(t);
    }, [q]);
}
