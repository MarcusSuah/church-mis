import DOMPurify from 'dompurify';
import { useMemo, useSyncExternalStore } from 'react';

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

const NAMED_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    hellip: '…',
    mdash: '—',
    ndash: '–',
    lsquo: '‘',
    rsquo: '’',
    ldquo: '“',
    rdquo: '”',
    copy: '©',
    reg: '®',
    trade: '™',
    bull: '•',
};

function decodeEntities(text: string): string {
    return text.replace(
        /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
        (match, entity: string) => {
            if (entity[0] === '#') {
                const code =
                    entity[1] === 'x' || entity[1] === 'X'
                        ? parseInt(entity.slice(2), 16)
                        : parseInt(entity.slice(1), 10);

                return Number.isFinite(code) && code > 0 && code <= 0x10ffff
                    ? String.fromCodePoint(code)
                    : match;
            }

            return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
        },
    );
}

/**
 * Plain-text version of stored HTML, e.g. for line-clamped card excerpts.
 * Pure string work (no DOM), so it gives the same result during server-side
 * rendering and in the browser. The result is rendered as text, never HTML.
 */
export function stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    if (!looksLikeHtml(html)) return html;

    const text = html
        .replace(/<(script|style)[\s\S]*?<\/\1\s*>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, '');

    return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

const subscribe = () => () => {};

/** False during server rendering and hydration, true once in the browser. */
function useIsClient(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );
}

/**
 * Renders stored rich text (HTML) safely.
 * Old plain-text descriptions (no tags) still render with their line breaks.
 *
 * DOMPurify needs a real DOM: without one it returns the input unchanged. So
 * the server (and the hydration pass) render a plain-text version, and the
 * sanitized HTML replaces it in the browser.
 */
export default function RichText({
    html,
    className = '',
}: {
    html: string | null | undefined;
    className?: string;
}) {
    const isClient = useIsClient();
    const isHtml = !!html && looksLikeHtml(html);

    const clean = useMemo(
        () =>
            isClient && html && isHtml
                ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
                : null,
        [html, isHtml, isClient],
    );

    if (!html) return null;

    if (!isHtml) {
        return <p className={`whitespace-pre-line ${className}`}>{html}</p>;
    }

    if (clean === null) {
        return <p className={`rich-text ${className}`}>{stripHtml(html)}</p>;
    }

    return (
        <div
            className={`rich-text ${className}`}
            dangerouslySetInnerHTML={{ __html: clean }}
        />
    );
}
