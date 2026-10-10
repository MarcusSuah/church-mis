import { router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';

/* Shared building blocks for the Pastoral Care / Sacraments pages (same look as the reference app). */

export const inputCls =
    'w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground outline-none focus:ring-1 focus:ring-ring';

export function Kpi({
    label,
    value,
    icon,
    color,
    bg,
    flip = false,
}: {
    label: string;
    value: ReactNode;
    icon: string;
    color: string;
    bg: string;
    flip?: boolean;
}) {
    return (
        <div className="card flex items-center gap-3 p-4">
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}
            >
                <Icon name={icon} size={18} className={color} />
            </div>
            {flip ? (
                <div>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                        {value}
                    </p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            ) : (
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">
                        {value}
                    </p>
                </div>
            )}
        </div>
    );
}

export function Field({
    label,
    error,
    span,
    children,
}: {
    label: string;
    error?: string;
    span?: boolean;
    children: ReactNode;
}) {
    return (
        <div className={span ? 'sm:col-span-2' : ''}>
            <label className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {label}
            </label>
            {children}
            {error && <p className="error-text">{error}</p>}
        </div>
    );
}

export function Toggle({
    value,
    onChange,
}: {
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="mt-2 flex items-center gap-3">
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-success' : 'bg-muted'}`}
                aria-pressed={value}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}
                />
            </button>
            <span className="text-sm text-foreground">
                {value ? 'Yes' : 'No'}
            </span>
        </div>
    );
}

export function Modal({
    title,
    onClose,
    children,
    footer,
    wide = true,
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer: ReactNode;
    wide?: boolean;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm fade-in"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className={`scale-in max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-card shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border p-6">
                    <h2 className="text-lg font-bold text-foreground">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 transition-colors hover:bg-muted"
                        aria-label="Close"
                    >
                        <Icon
                            name="XMarkIcon"
                            size={18}
                            className="text-muted-foreground"
                        />
                    </button>
                </div>
                <div className="p-6">{children}</div>
                <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                    {footer}
                </div>
            </div>
        </div>
    );
}

export function SaveButton({
    saving,
    disabled,
    label,
    onClick,
}: {
    saving: boolean;
    disabled?: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={saving || disabled}
            className="btn-primary text-sm disabled:opacity-50"
        >
            {saving ? (
                <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                </span>
            ) : (
                label
            )}
        </button>
    );
}

export function Avatar({
    src,
    size = 36,
    muted = false,
}: {
    src?: string | null;
    size?: number;
    muted?: boolean;
}) {
    const [failed, setFailed] = useState(false);
    return (
        <div
            className={`shrink-0 overflow-hidden rounded-full ${muted ? 'bg-muted' : 'bg-primary/10'}`}
            style={{ width: size, height: size }}
        >
            {src && !failed ? (
                <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center">
                    <Icon
                        name="UserIcon"
                        size={16}
                        className={
                            muted ? 'text-muted-foreground' : 'text-primary'
                        }
                    />
                </div>
            )}
        </div>
    );
}

export function Banner({
    src,
    alt,
    className = 'h-36',
}: {
    src?: string | null;
    alt: string;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) return null;
    return (
        <div className={`overflow-hidden ${className}`}>
            <img
                src={src}
                alt={alt}
                className="h-full w-full object-cover"
                onError={() => setFailed(true)}
            />
        </div>
    );
}

export function EmptyState({
    icon,
    title,
    text,
    card = true,
}: {
    icon: string;
    title: string;
    text: string;
    card?: boolean;
}) {
    return (
        <div
            className={`flex flex-col items-center justify-center py-16 text-center ${card ? 'card' : ''}`}
        >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Icon name={icon} size={28} className="text-primary" />
            </div>
            <p className="mb-1 font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
        </div>
    );
}

export function SearchBox({
    value,
    onChange,
    placeholder,
    className = 'max-w-xs',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    className?: string;
}) {
    return (
        <div
            className={`flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 ${className}`}
        >
            <Icon
                name="MagnifyingGlassIcon"
                size={15}
                className="text-muted-foreground"
            />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
        </div>
    );
}

/** Delete confirmation wired to a DELETE request. */
export function DeleteConfirm({
    url,
    title,
    message,
    onClose,
}: {
    url: string | null;
    title: string;
    message: string;
    onClose: () => void;
}) {
    const [busy, setBusy] = useState(false);
    return (
        <ConfirmModal
            isOpen={url !== null}
            onClose={onClose}
            onConfirm={() => {
                if (!url) return;
                setBusy(true);
                router.delete(url, {
                    preserveScroll: true,
                    onSuccess: onClose,
                    onFinish: () => setBusy(false),
                });
            }}
            title={title}
            message={message}
            confirmLabel="Delete"
            variant="danger"
            loading={busy}
        />
    );
}

/** Plain YYYY-MM-DD → "Jun 8, 2026" without time-zone shifts. */
export const fmtDate = (
    d: string | null | undefined,
    month: 'short' | 'long' = 'short',
) =>
    d
        ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
              year: 'numeric',
              month,
              day: 'numeric',
          })
        : '—';

/** "14:00" → "2:00 PM" */
export const fmtTime = (t: string | null | undefined) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
};

/**
 * Opens the create/edit modal when the URL has ?new=1 or ?edit=<id>
 * (used by links from the Finance Overview), then cleans the URL.
 */
/**
 * Opens the editor from the URL: ?new=1, or ?edit=<id>. Lists are paginated on the
 * server, so the record may not be on this page; the server then sends it as `focus`.
 */
export function useAutoOpen<T extends { id: string }>(
    records: T[],
    open: (r: T | 'new') => void,
    focus?: T | null,
) {
    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const edit = q.get('edit');
        const target = edit
            ? (records.find((r) => r.id === edit) ??
              (focus?.id === edit ? focus : null))
            : null;
        if (q.get('new') === '1' || target) {
            open(target ?? 'new');
            window.history.replaceState(
                window.history.state,
                '',
                window.location.pathname,
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
