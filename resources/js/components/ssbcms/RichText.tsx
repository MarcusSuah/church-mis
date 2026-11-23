import DOMPurify from 'dompurify';
import { useMemo } from 'react';

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

/** Plain-text version of stored HTML, e.g. for line-clamped card excerpts. */
export function stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    if (!looksLikeHtml(html)) return html;
    const doc = new DOMParser().parseFromString(
        html.replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, ' $&'),
        'text/html',
    );
    return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Renders stored rich text (HTML) safely.
 * Old plain-text descriptions (no tags) still render with their line breaks.
 */
export default function RichText({
    html,
    className = '',
}: {
    html: string | null | undefined;
    className?: string;
}) {
    const clean = useMemo(
        () =>
            html && looksLikeHtml(html)
                ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
                : null,
        [html],
    );

    if (!html) return null;

    if (clean === null) {
        return <p className={`whitespace-pre-line ${className}`}>{html}</p>;
    }

    return (
        <div
            className={`rich-text ${className}`}
            dangerouslySetInnerHTML={{ __html: clean }}
        />
    );
}