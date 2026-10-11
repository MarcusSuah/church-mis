import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/** How long a navigation may take before the loading screen appears (ms). */
const SHOW_AFTER = 250;

/**
 * Shows that a page is on its way. When a visit or form submission takes
 * longer than a moment, a moving bar appears at the top and a small
 * "Loading…" card in the middle of the screen, so nobody thinks the page has
 * stopped working. Background refreshes (search-as-you-type, prefetching,
 * partial reloads) don't trigger it.
 */
export default function GlobalLoader() {
    const [visible, setVisible] = useState(false);
    const [label, setLabel] = useState('Loading…');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const active = useRef(0);

    useEffect(() => {
        const clear = () => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = null;
        };

        const offStart = router.on('start', (event) => {
            const visit = event.detail.visit;
            if (
                visit.prefetch ||
                !visit.showProgress ||
                visit.only.length > 0
            ) {
                return;
            }
            active.current += 1;
            setLabel(visit.method === 'get' ? 'Loading…' : 'Saving…');
            clear();
            timer.current = setTimeout(() => setVisible(true), SHOW_AFTER);
        });

        const offFinish = router.on('finish', () => {
            active.current = Math.max(0, active.current - 1);
            if (active.current === 0) {
                clear();
                setVisible(false);
            }
        });

        return () => {
            clear();
            offStart();
            offFinish();
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            className="pointer-events-none fixed inset-0 z-[100]"
            role="status"
            aria-live="polite"
        >
            <div className="page-loader-bar" />
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] fade-in" />
            <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 shadow-elevated fade-in">
                <span className="page-loader-spinner" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground">
                    {label}
                </span>
            </div>
        </div>
    );
}
