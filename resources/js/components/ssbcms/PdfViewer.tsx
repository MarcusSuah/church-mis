import type { ReactNode } from 'react';

type PdfButtonProps = {
    url: string;
    title?: string;
    ariaLabel?: string;
    className?: string;
    download?: boolean;
    children: ReactNode;
};

/**
 * Opens a PDF served by the Laravel backend in a new browser tab.
 */
export function openPdf(url: string, title = 'PDF document') {
    if (typeof window === 'undefined') return;

    const pdfUrl = new URL(url, window.location.origin);

    // Keep PDF navigation within the current application origin.
    if (pdfUrl.origin !== window.location.origin) {
        console.error('PDF URL must belong to the current application.');
        return;
    }

    window.open(pdfUrl.href, '_blank', 'noopener,noreferrer');
    void title;
}

/**
 * Button-style link for Laravel-generated PDFs.
 * Use download for documents that should be downloaded instead.
 */
export function PdfButton({
    url,
    title,
    ariaLabel,
    className = '',
    download = false,
    children,
}: PdfButtonProps) {
    return (
        <a
            href={url}
            title={title}
            aria-label={ariaLabel ?? title}
            className={className}
            target={download ? undefined : '_blank'}
            rel={download ? undefined : 'noopener noreferrer'}
            download={download || undefined}
        >
            {children}
        </a>
    );
}

/**
 * Compatibility component used by the application layout.
 * PDFs are opened directly by the browser, so no viewer host is needed.
 */
export function PdfViewerHost() {
    return null;
}
