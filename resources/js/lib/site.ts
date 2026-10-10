import { usePage } from '@inertiajs/react';

export type Site = Record<string, string | number | boolean | null>;

/** Church details for the public pages (from Church Settings / Website). */
export function useSite() {
    const { site } = usePage<{ site: Site }>().props;
    const get = (key: string, fallback = ''): string => {
        const v = site?.[key];
        return v === null || v === undefined || v === '' ? fallback : String(v);
    };
    return { site, get };
}

export function formatDate(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
    return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}
