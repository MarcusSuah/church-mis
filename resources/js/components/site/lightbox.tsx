import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type LightboxPhoto = {
    id: number | string;
    url: string;
    caption?: string | null;
};

/**
 * Full-screen photo viewer. Arrow keys, swipes, the side buttons and the
 * thumbnail strip move between photos; Escape or the close button exits.
 */
export function Lightbox({
    photos,
    index,
    title,
    onIndex,
    onClose,
}: {
    photos: LightboxPhoto[];
    index: number;
    title?: string;
    onIndex: (index: number) => void;
    onClose: () => void;
}) {
    const count = photos.length;
    const photo = photos[index];
    const touchX = useRef<number | null>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);

    const go = useCallback(
        (step: number) => onIndex((index + step + count) % count),
        [index, count, onIndex],
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
        };
    }, [go, onClose]);

    useEffect(() => closeRef.current?.focus(), []);

    useEffect(() => {
        stripRef.current
            ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
            ?.scrollIntoView({
                block: 'nearest',
                inline: 'center',
                behavior: 'smooth',
            });
    }, [index]);

    if (!photo) {
        return null;
    }

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title ? `${title} photos` : 'Photo viewer'}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white"
            onClick={onClose}
        >
            <div
                className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="min-w-0">
                    {title && (
                        <p className="truncate font-display text-sm font-bold sm:text-base">
                            {title}
                        </p>
                    )}
                    <p className="text-xs text-white/60">
                        {index + 1} / {count}
                    </p>
                </div>
                <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-2 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    aria-label="Close"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            <div
                className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
                onTouchStart={(e) => {
                    touchX.current = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                    if (touchX.current === null) {
                        return;
                    }
                    const dx = e.changedTouches[0].clientX - touchX.current;
                    if (Math.abs(dx) > 40) {
                        go(dx < 0 ? 1 : -1);
                    }
                    touchX.current = null;
                }}
            >
                <img
                    key={photo.id}
                    src={photo.url}
                    alt={photo.caption ?? title ?? ''}
                    className="max-h-full max-w-full object-contain select-none"
                    draggable={false}
                    onClick={(e) => e.stopPropagation()}
                />
                {count > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                go(-1);
                            }}
                            className="absolute left-2 rounded-full bg-black/50 p-2 hover:bg-white/20 sm:left-4 sm:p-3"
                            aria-label="Previous photo"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                go(1);
                            }}
                            className="absolute right-2 rounded-full bg-black/50 p-2 hover:bg-white/20 sm:right-4 sm:p-3"
                            aria-label="Next photo"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </>
                )}
            </div>

            <div
                className="px-4 pt-3 pb-4 sm:px-6"
                onClick={(e) => e.stopPropagation()}
            >
                {photo.caption && (
                    <p className="mb-3 text-center text-sm text-white/80">
                        {photo.caption}
                    </p>
                )}
                {count > 1 && (
                    <div
                        ref={stripRef}
                        className="mx-auto flex max-w-3xl gap-2 overflow-x-auto pb-1"
                    >
                        {photos.map((p, i) => (
                            <button
                                key={p.id}
                                type="button"
                                data-index={i}
                                onClick={() => onIndex(i)}
                                className={`h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition sm:h-16 sm:w-24 ${i === index ? 'opacity-100 ring-white' : 'opacity-50 ring-transparent hover:opacity-90'}`}
                                aria-label={`Show photo ${i + 1}`}
                                aria-current={i === index}
                            >
                                <img
                                    src={p.url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
