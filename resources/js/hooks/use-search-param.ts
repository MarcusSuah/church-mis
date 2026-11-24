import { useEffect } from 'react';

/**
 * Fills a page's own (browser-side) search box from ?search= in the URL, so
 * links from the header search land on a filtered list. Runs after
 * hydration, so the server-rendered markup and the first render match.
 */
export function useSearchParam(setSearch: (value: string) => void): void {
    useEffect(() => {
        const value = new URLSearchParams(window.location.search).get('search');
        if (value) {
            setSearch(value.slice(0, 100));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
