import { FileText, X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export type PublicDocument = {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    type: string;
    is_pdf: boolean;
    updated_at: string | null;
    view_url: string;
};

/**
 * Read-only document viewer. PDFs open with the browser toolbar hidden and
 * no download link is offered; right-click is disabled on the viewer.
 */
export function DocumentViewer({
    doc,
    onClose,
}: {
    doc: PublicDocument;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
        };
    }, [onClose]);

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={doc.title}
            className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/80 sm:items-center sm:p-6"
            onClick={onClose}
        >
            <div
                className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-card shadow-2xl sm:h-[90vh] sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
            >
                <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
                    <FileText className="h-5 w-5 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-display font-bold">
                            {doc.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            View only · {doc.type}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-muted"
                        aria-label="Close document"
                        autoFocus
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="relative min-h-0 flex-1 bg-muted select-none">
                    {doc.is_pdf ? (
                        <iframe
                            title={doc.title}
                            src={`${doc.view_url}#toolbar=0&navpanes=0`}
                            className="h-full w-full border-0"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center overflow-auto p-4">
                            <img
                                src={doc.view_url}
                                alt={doc.title}
                                draggable={false}
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
