const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Returns the URL only when it uses a safe protocol, so user-entered links
 * (sermon media, documents, website buttons) can never run javascript: or
 * data: payloads. Relative URLs resolve against the current site.
 */
export function safeUrl(value: string | null | undefined): string | undefined {
    if (!value) {
        return undefined;
    }

    try {
        const url = new URL(value, window.location.origin);

        return ALLOWED_PROTOCOLS.has(url.protocol) ? url.toString() : undefined;
    } catch {
        return undefined;
    }
}
